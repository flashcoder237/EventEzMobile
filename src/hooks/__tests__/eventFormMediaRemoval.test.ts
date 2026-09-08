/**
 * RETIRER UN MEDIA EN EDITION.
 *
 * CAS REEL SIGNALE : on cree un evenement avec une video, on l'edite, on
 * retire la video — et apres enregistrement elle est toujours la.
 *
 * Cause : `buildFormData` n'envoyait le champ QUE s'il avait une valeur.
 * Retirer le media laissait donc `coverVideo` et `coverVideoUrl` vides,
 * aucune branche ne s'executait, rien n'etait envoye — et le serveur, ne
 * recevant pas le champ, conservait l'ancienne valeur.
 *
 * Le meme defaut existait sur la banniere : `if (form.bannerImage)`.
 */
import { buildFormData } from '../useEventFormSubmit';

// FormData de React Native n'existe pas sous Jest : on le simule en gardant
// la trace des `append`, ce qui est exactement ce qu'on veut verifier.
class FakeFormData {
  entries: Array<[string, any]> = [];
  append(k: string, v: any) { this.entries.push([k, v]); }
  get(k: string) {
    const hit = this.entries.filter(([key]) => key === k);
    return hit.length ? hit[hit.length - 1][1] : undefined;
  }
  has(k: string) { return this.entries.some(([key]) => key === k); }
}

beforeAll(() => {
  (global as any).FormData = FakeFormData;
});

const baseForm: any = {
  title: 'Mon evenement',
  description: 'desc',
  shortDescription: 'court',
  eventType: 'billetterie',
  language: 'fr',
  categoryId: 1,
  selectedTagIds: [],
  customTags: [],
  bannerImage: null,
  coverVideo: null,
  coverVideoUrl: '',
  galleryImages: [],
  startDate: new Date('2027-01-01T10:00:00Z'),
  endDate: new Date('2027-01-02T10:00:00Z'),
  registrationDeadline: null,
  hasRegistrationDeadline: false,
  locationType: 'physical',
  locationName: 'Salle',
  locationCity: 'Douala',
  locationAddress: 'rue X',
  locationCountry: 'CM',
  onlineUrl: '', onlinePlatform: '', onlineInstructions: '',
  onlineMeetingId: '', onlinePasscode: '',
  locationLatitude: '', locationLongitude: '',
  isFree: false, maxParticipants: '',
  autoApproveRegistrations: true,
  attendeeFormScope: 'order',
  feeBearer: 'participant',
  visibility: 'public', accessCode: '',
  ticketTypes: [], formFields: [], sessions: [], tracks: [], speakers: [],
};

const build = (over: any, isEdit: boolean) =>
  buildFormData({ ...baseForm, ...over }, isEdit) as unknown as FakeFormData;

describe('video de couverture', () => {
  it('EFFACE la video quand on la retire en edition', () => {
    const fd = build({ coverVideo: null, coverVideoUrl: '' }, true);
    expect(fd.get('cover_video_url')).toBe('');
    expect(fd.get('cover_video')).toBe('');
  });

  it('envoie le fichier quand on en choisit un', () => {
    const fd = build({ coverVideo: 'file:///tmp/v.mp4' }, true);
    expect(fd.get('cover_video')).toMatchObject({ uri: 'file:///tmp/v.mp4' });
    // Fichier et URL externe s'excluent.
    expect(fd.get('cover_video_url')).toBe('');
  });

  it('envoie l\'URL externe quand on en saisit une', () => {
    const fd = build({ coverVideoUrl: 'https://youtu.be/abc' }, true);
    expect(fd.get('cover_video_url')).toBe('https://youtu.be/abc');
    // …et efface le fichier precedent, les deux etant exclusifs.
    expect(fd.get('cover_video')).toBe('');
  });

  it('ne renvoie pas la video existante comme un fichier', () => {
    // En edition, `coverVideo` est hydrate avec l'URL SERVEUR : la
    // re-uploader echouerait (ce n'est pas un fichier local).
    const fd = build({ coverVideo: 'https://cdn.example.com/v.mp4' }, true);
    expect(fd.get('cover_video')).toBeUndefined();
  });

  it('n\'efface rien a la CREATION', () => {
    const fd = build({}, false);
    expect(fd.has('cover_video')).toBe(false);
    expect(fd.has('cover_video_url')).toBe(false);
  });
});

describe('banniere', () => {
  it('EFFACE la banniere quand on la retire en edition', () => {
    const fd = build({ bannerImage: null }, true);
    expect(fd.get('banner_image')).toBe('');
  });

  it('envoie le fichier choisi', () => {
    const fd = build({ bannerImage: 'file:///tmp/b.jpg' }, true);
    expect(fd.get('banner_image')).toMatchObject({ uri: 'file:///tmp/b.jpg' });
  });

  it('ne renvoie pas la banniere existante comme un fichier', () => {
    const fd = build({ bannerImage: 'https://cdn.example.com/b.jpg' }, true);
    expect(fd.get('banner_image')).toBeUndefined();
  });

  it('accepte une URI content:// (repli Android)', () => {
    // `persistImageToDisk` retombe sur l'URI d'origine en cas d'echec :
    // elle ne doit pas etre prise pour une URL serveur et ignoree.
    const fd = build({ bannerImage: 'content://media/1' }, true);
    expect(fd.get('banner_image')).toMatchObject({ uri: 'content://media/1' });
  });

  it('n\'efface rien a la CREATION', () => {
    const fd = build({ bannerImage: null }, false);
    expect(fd.has('banner_image')).toBe(false);
  });
});
