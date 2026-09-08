import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  eventsAPI,
  ticketTypesAPI,
  sessionsAPI,
  tracksAPI,
  speakersAPI,
} from '../api';
import { Tag } from '../types';
import { getApiErrorMessage } from '../lib/utils/errorHandling';
import type { EventFormState, AlertActions, TrackForm, SpeakerForm } from './useEventForm';

interface SyncRefs {
  originalTicketIds: MutableRefObject<string[]>;
  originalSessionIds: MutableRefObject<string[]>;
  originalTrackIds: MutableRefObject<string[]>;
  originalSpeakerIds: MutableRefObject<string[]>;
}

export function useEventFormSubmit(
  form: EventFormState,
  validateStep: (step: number) => boolean,
  showError: AlertActions['showError'],
  editEventId?: string,
  hostEventId?: string,
  syncRefs?: SyncRefs,
) {
  const { t } = useTranslation();
  const handleSubmit = useCallback(async (): Promise<string | null> => {
    // GARDE ANTI-ÉCRASEMENT : en édition, si le chargement de l'événement a
    // échoué, le formulaire contient des valeurs vides et NON les données
    // réelles. Un PUT enverrait ces vides, et `syncFormFields` ferait un
    // `clear_existing: true` avec un tableau vide — effaçant les champs
    // d'inscription personnalisés de l'organisateur. On bloque à la source :
    // le garde est ici, pas dans l'UI, pour qu'aucun chemin ne le contourne.
    if (form.loadFailed) {
      showError(
        t('common.error'),
        t('organizer.eventCreate.loadFailedBlocksSave'),
      );
      return null;
    }
    if (!validateStep(form.currentStep)) return null;

    try {
      const formData = buildFormData(form, !!editEventId);
      // Événement satellite (exposant sous-organisateur) : rattacher au salon
      // hôte. Le backend refuse si l'exposant n'a pas de contrat de vente accepté.
      if (hostEventId && !editEventId) {
        formData.append('host_event', hostEventId);
      }
      const response = editEventId
        ? await eventsAPI.updateEvent(editEventId, formData)
        : await eventsAPI.createEvent(formData);
      const eventId = response.data.id;

      // Tracks et Speakers doivent etre synchronises AVANT les sessions (qui les
      // referencent par UUID). En EDITION : PUT existants / POST nouveaux /
      // DELETE retires (comme billets/sessions) — sinon on recreait des
      // DOUBLONS a chaque save. En CREATION : POST tout. On les fait en
      // parallele, puis on resout les UUIDs et on synchronise les sessions.
      const [trackIdMap, speakerIdMap] = await Promise.all([
        syncTracks(eventId, form.tracks, editEventId ? syncRefs?.originalTrackIds.current : undefined),
        syncSpeakers(eventId, form.speakers, editEventId ? syncRefs?.originalSpeakerIds.current : undefined),
      ]);

      await Promise.all([
        uploadGalleryImages(eventId, form.galleryImages),
        syncTicketTypes(eventId, form, editEventId ? syncRefs?.originalTicketIds.current : undefined),
        syncFormFields(eventId, form, !!editEventId),
        syncSessions(eventId, form.sessions, trackIdMap, speakerIdMap, editEventId ? syncRefs?.originalSessionIds.current : undefined),
      ]);

      // Soumettre pour validation uniquement à la création (pas à l'édition).
      // On soumet APRÈS le Promise.all pour garantir que tickets/sessions/images
      // sont déjà créés quand le modérateur examine l'événement.
      if (!editEventId) {
        await eventsAPI.submitForValidation(eventId);
      }

      return eventId;
    } catch (error: any) {
      if (__DEV__) console.error('Erreur création événement:', error);
      const { message } = getApiErrorMessage(error, t, {
        fallbackKey: 'errors.generic',
      });
      showError(t('common.error'), message);
      return null;
    }
  }, [form, validateStep, showError, editEventId, hostEventId, syncRefs, t]);

  return handleSubmit;
}

function buildFormData(form: EventFormState, isEdit = false): FormData {
  const formData = new FormData();

  formData.append('title', form.title);
  formData.append('description', form.description);
  formData.append('short_description', form.shortDescription);
  formData.append('event_type', form.eventType);
  formData.append('language', form.language);
  formData.append('category', String(form.categoryId));
  formData.append('start_date', form.startDate.toISOString());
  formData.append('end_date', form.endDate.toISOString());
  formData.append('location_type', form.locationType);
  formData.append('location_country', form.locationCountry);

  // Tags
  const allTags: string[] = [];
  form.selectedTagIds.forEach(tagId => {
    const tag = form.availableTags.find((t: Tag) => t.id === tagId);
    if (tag) allTags.push(tag.name);
  });
  form.customTags.forEach(tag => allTags.push(tag));
  allTags.forEach(tag => formData.append('tags', tag));

  if (form.hasRegistrationDeadline && form.registrationDeadline) {
    formData.append('registration_deadline', form.registrationDeadline.toISOString());
  }

  if (form.locationType === 'in_person' || form.locationType === 'hybrid') {
    formData.append('location_name', form.locationName);
    formData.append('location_city', form.locationCity);
    formData.append('location_address', form.locationAddress);
    if (form.locationLatitude && form.locationLongitude) {
      formData.append('location_latitude', parseFloat(form.locationLatitude).toFixed(6));
      formData.append('location_longitude', parseFloat(form.locationLongitude).toFixed(6));
    }
  }

  if (form.locationType === 'online' || form.locationType === 'hybrid') {
    formData.append('online_url', form.onlineUrl);
    formData.append('online_platform', form.onlinePlatform);
    formData.append('online_instructions', form.onlineInstructions);
    if (form.onlineMeetingId) formData.append('online_meeting_id', form.onlineMeetingId);
    if (form.onlinePasscode) formData.append('online_passcode', form.onlinePasscode);
  }

  if (form.maxParticipants) formData.append('max_participants', form.maxParticipants);
  formData.append('auto_approve_registrations', String(form.autoApproveRegistrations));
  formData.append('attendee_form_scope', form.attendeeFormScope || 'order');
  formData.append('fee_bearer', form.feeBearer);
  formData.append('visibility', form.visibility);
  if (form.accessCode) formData.append('access_code', form.accessCode);
  // status='draft' UNIQUEMENT à la création. En édition, ne JAMAIS renvoyer le
  // statut : un event `validated` (publié) serait redéplublié/renvoyé en draft
  // à chaque sauvegarde. Les transitions d'état sont gérées côté backend.
  if (!isEdit) formData.append('status', 'draft');

  if (form.bannerImage) {
    const filename = form.bannerImage.split('/').pop() || 'banner.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('banner_image', {
      uri: form.bannerImage,
      name: filename,
      type,
    } as any);
  }

  // Cover video : fichier local OU URL externe (mutuellement exclusif)
  if (form.coverVideo && form.coverVideo.startsWith('file://')) {
    const filename = form.coverVideo.split('/').pop() || 'cover.mp4';
    const match = /\.(\w+)$/.exec(filename);
    const ext = (match ? match[1] : 'mp4').toLowerCase();
    const type = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';
    formData.append('cover_video', {
      uri: form.coverVideo,
      name: filename,
      type,
    } as any);
    formData.append('cover_video_url', '');
  } else if (form.coverVideoUrl) {
    formData.append('cover_video_url', form.coverVideoUrl);
  }

  return formData;
}

async function uploadGalleryImages(eventId: string, galleryImages: string[]): Promise<void> {
  // On n'uploade QUE les NOUVELLES images locales (file://). En édition, la
  // galerie hydratée contient aussi les URLs serveur (https://) des photos
  // existantes : les ré-uploader créerait des doublons (et échouerait, une URL
  // https n'étant pas un fichier local). On les filtre donc.
  const newLocal = galleryImages.filter(uri => typeof uri === 'string' && uri.startsWith('file:'));
  if (newLocal.length === 0) return;
  const galleryFormData = new FormData();
  newLocal.forEach((uri, idx) => {
    const filename = uri.split('/').pop() || `gallery_${idx}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    galleryFormData.append('images', { uri, name: filename, type } as any);
  });
  await eventsAPI.uploadImages(eventId, galleryFormData);
}

function ticketPayload(eventId: string, ticket: EventFormState['ticketTypes'][number]) {
  return {
    event: eventId,
    name: ticket.name,
    description: ticket.description,
    price: parseFloat(ticket.price) || 0,
    quantity_total: parseInt(ticket.quantity_total) || 100,
    sales_start: ticket.sales_start.toISOString(),
    sales_end: ticket.sales_end.toISOString(),
    is_visible: ticket.is_visible,
    max_per_order: parseInt(ticket.max_per_order) || 10,
    min_per_order: parseInt(ticket.min_per_order) || 1,
    // access_mode envoyé seulement s'il est explicité (event hybride) ; sinon le
    // backend le déduit du type d'event.
    ...(ticket.access_mode ? { access_mode: ticket.access_mode } : {}),
  };
}

/**
 * Synchronise les billets. En CRÉATION : POST tous. En ÉDITION : PUT ceux qui
 * ont un id, POST les nouveaux, DELETE ceux présents à l'origine mais retirés
 * du form. Évite les doublons (ancien bug : re-POST systématique en édition).
 */
async function syncTicketTypes(
  eventId: string,
  form: EventFormState,
  originalIds?: string[],
): Promise<void> {
  if (form.eventType !== 'billetterie') return;

  const isEdit = originalIds !== undefined;
  const ops: Promise<any>[] = [];

  for (const ticket of form.ticketTypes) {
    if (isEdit && ticket.id) {
      ops.push(ticketTypesAPI.updateTicketType(ticket.id, ticketPayload(eventId, ticket)));
    } else {
      ops.push(ticketTypesAPI.createTicketType(ticketPayload(eventId, ticket)));
    }
  }

  // Suppressions : id d'origine absent du form courant.
  if (isEdit) {
    const currentIds = new Set(form.ticketTypes.map(t => t.id).filter(Boolean));
    for (const id of originalIds!) {
      if (!currentIds.has(id)) ops.push(ticketTypesAPI.deleteTicketType(id));
    }
  }

  await Promise.all(ops);
}

/**
 * Synchronise les champs de formulaire. En ÉDITION on utilise
 * update_form_fields avec clear_existing=true (le backend supprime les anciens
 * puis recrée) → simple et sans doublon. En CRÉATION on POST chaque champ.
 */
async function syncFormFields(eventId: string, form: EventFormState, isEdit: boolean): Promise<void> {
  const wantsFields =
    (form.eventType === 'inscription') ||
    (form.eventType === 'billetterie' && form.showFormFieldsForBilletterie);

  const fields = form.formFields.map((field, index) => ({
    label: field.label,
    field_type: field.field_type,
    required: field.required,
    placeholder: field.placeholder,
    help_text: field.help_text,
    options: field.options,
    order: index,
  }));

  if (isEdit) {
    // Remplace l'ensemble (y compris le cas "l'organisateur a tout retiré").
    await eventsAPI.updateFormFields(eventId, { clear_existing: true, fields });
    return;
  }

  if (!wantsFields || fields.length === 0) return;
  await Promise.all(fields.map(f => eventsAPI.createFormField({ event: eventId, ...f })));
}

/**
 * Synchronise les tracks et retourne un mapping index_local → UUID serveur
 * (pour que les sessions resolvent leur `track_index`).
 *
 * CREATION (originalIds undefined) : POST tout.
 * EDITION : PUT ceux avec un id, POST les nouveaux, DELETE ceux retires du form.
 * Sans ce sync id-aware, chaque save en edition RE-CREAIT tous les tracks
 * (doublons) au lieu de mettre a jour les existants.
 */
async function syncTracks(
  eventId: string,
  tracks: TrackForm[],
  originalIds?: string[],
): Promise<Record<number, string>> {
  const isEdit = originalIds !== undefined;
  const map: Record<number, string> = {};

  const responses = await Promise.all(tracks.map((track, idx) => {
    const payload = {
      event: eventId,
      name: track.name,
      description: track.description || '',
      color: track.color || '#4F46E5',
      order: idx,
    };
    if (isEdit && track.id) {
      return tracksAPI.updateTrack(track.id, payload).then(() => ({ idx, id: track.id! }));
    }
    return tracksAPI.createTrack(payload).then(res => ({ idx, id: String((res.data as any).id) }));
  }));
  for (const { idx, id } of responses) map[idx] = id;

  // Suppressions : tracks presents a l'origine mais plus dans le form.
  if (isEdit) {
    const keptIds = new Set(tracks.map(t => t.id).filter(Boolean) as string[]);
    const toDelete = (originalIds || []).filter(id => !keptIds.has(id));
    await Promise.all(toDelete.map(id => tracksAPI.deleteTrack(id).catch((err) => {
      if (__DEV__) console.warn('[Track] delete failed', id, err);
    })));
  }
  return map;
}

/**
 * Idem pour les speakers : PUT/POST/DELETE + retour mapping index_local → UUID
 * serveur (pour speaker_indices et moderator_index). Upload photo seulement pour
 * les fichiers locaux (file://) — une URL serveur existante n'est pas ré-uploadée.
 */
async function syncSpeakers(
  eventId: string,
  speakers: SpeakerForm[],
  originalIds?: string[],
): Promise<Record<number, string>> {
  const isEdit = originalIds !== undefined;
  const map: Record<number, string> = {};

  const responses = await Promise.all(speakers.map((speaker, idx) => {
    const payload = {
      event: eventId,
      first_name: speaker.first_name,
      last_name: speaker.last_name,
      title: speaker.title || '',
      company: speaker.company || '',
      bio: speaker.bio || '',
      email: speaker.email || '',
      phone: speaker.phone || '',
      website: speaker.website || '',
      linkedin: speaker.linkedin || '',
      twitter: speaker.twitter || '',
      order: idx,
    };
    if (isEdit && speaker.id) {
      return speakersAPI.updateSpeaker(speaker.id, payload).then(() => ({ idx, id: speaker.id!, speaker }));
    }
    return speakersAPI.createSpeaker(payload).then(res => ({ idx, id: String((res.data as any).id), speaker }));
  }));
  for (const { idx, id } of responses) map[idx] = id;

  // Suppressions : speakers presents a l'origine mais plus dans le form.
  if (isEdit) {
    const keptIds = new Set(speakers.map(s => s.id).filter(Boolean) as string[]);
    const toDelete = (originalIds || []).filter(id => !keptIds.has(id));
    await Promise.all(toDelete.map(id => speakersAPI.deleteSpeaker(id).catch((err) => {
      if (__DEV__) console.warn('[Speaker] delete failed', id, err);
    })));
  }

  // Upload photos : seulement les NOUVELLES (file://). Une URL serveur existante
  // (edition) n'est pas re-uploadee. Un echec n'arrete pas le submit.
  await Promise.all(responses.map(({ id, speaker }) => {
    const uri = speaker.photo;
    if (!uri || !uri.startsWith('file:')) return Promise.resolve();
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: `speaker_${id}.jpg`,
      type: 'image/jpeg',
    } as any);
    return speakersAPI.uploadPhoto(id, formData).catch((err) => {
      if (__DEV__) console.warn('[Speaker] photo upload failed', id, err);
    });
  }));

  return map;
}

function sessionPayload(
  eventId: string,
  session: EventFormState['sessions'][number],
  trackIdMap: Record<number, string>,
  speakerIdMap: Record<number, string>,
  isEdit = false,
) {
  // Resoudre les refs locales → UUIDs serveur. `!= null` couvre null ET undefined.
  const trackId = session.track_index != null ? (trackIdMap[session.track_index] || null) : null;
  const speakerIds = (session.speaker_indices || [])
    .map(i => speakerIdMap[i])
    .filter((id): id is string => !!id);
  const moderatorId = session.moderator_index != null ? (speakerIdMap[session.moderator_index] || null) : null;

  return {
    event: eventId,
    title: session.title,
    description: session.description,
    session_type: session.session_type,
    start_time: session.start_time ? session.start_time.toISOString() : null,
    end_time: session.end_time ? session.end_time.toISOString() : null,
    location: session.location,
    room: session.room || '',
    max_capacity: session.max_capacity ? parseInt(session.max_capacity) : null,
    is_virtual: session.is_virtual || false,
    virtual_link: session.virtual_link || '',
    requires_registration: session.requires_registration ?? true,
    is_featured: session.is_featured || false,
    slides_url: session.slides_url || '',
    recording_url: session.recording_url || '',
    resources: session.resources || [],
    tags: session.tags || [],
    level: session.level || 'all',
    language: session.language || 'fr',
    // Liens agenda. En CRÉATION : n'envoyer que le non-null (pas de champ inutile).
    // En ÉDITION : envoyer explicitement track:null / speakers:[] / moderator:null
    // pour EFFACER un lien retiré (maintenant que les liens sont correctement
    // reconstruits à l'hydratation — sinon retirer un intervenant ne le retirait
    // jamais côté serveur).
    ...(isEdit
      ? { track: trackId, speakers: speakerIds, moderator: moderatorId }
      : {
          ...(trackId ? { track: trackId } : {}),
          ...(speakerIds.length > 0 ? { speakers: speakerIds } : {}),
          ...(moderatorId ? { moderator: moderatorId } : {}),
        }),
  };
}

/**
 * Synchronise les sessions. CRÉATION : POST toutes. ÉDITION : PUT celles avec
 * un id, POST les nouvelles, DELETE celles retirées. Même logique que les
 * billets pour éviter les doublons en édition.
 */
async function syncSessions(
  eventId: string,
  sessions: EventFormState['sessions'],
  trackIdMap: Record<number, string>,
  speakerIdMap: Record<number, string>,
  originalIds?: string[],
): Promise<void> {
  const isEdit = originalIds !== undefined;
  const ops: Promise<any>[] = [];

  for (const session of sessions) {
    const editingThis = isEdit && !!session.id;
    const payload = sessionPayload(eventId, session, trackIdMap, speakerIdMap, editingThis);
    if (editingThis) {
      ops.push(sessionsAPI.updateSession(session.id!, payload));
    } else {
      ops.push(sessionsAPI.createSession(payload));
    }
  }

  if (isEdit) {
    const currentIds = new Set(sessions.map(s => s.id).filter(Boolean));
    for (const id of originalIds!) {
      if (!currentIds.has(id)) ops.push(sessionsAPI.deleteSession(id));
    }
  }

  await Promise.all(ops);
}
