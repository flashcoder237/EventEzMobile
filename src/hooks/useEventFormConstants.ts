import { LocationType } from '../types';

export const STEPS = [
  { id: 1, title: 'Informations', shortTitle: "L'Essentiel", icon: 'information-circle-outline', nextLabel: 'Quand & Où' },
  { id: 2, title: 'Date & Lieu', shortTitle: 'Quand & Où', icon: 'calendar-outline', nextLabel: 'Tarification' },
  { id: 3, title: 'Tarification', shortTitle: 'Tarifs & Billets', icon: 'pricetag-outline', nextLabel: 'Agenda' },
  { id: 4, title: 'Sessions', shortTitle: 'Agenda & Sessions', icon: 'layers-outline', nextLabel: null },
] as const;

export const LOCATION_TYPES: { value: LocationType; label: string; icon: string; description: string }[] = [
  { value: 'in_person', label: 'Présentiel', icon: 'location-outline', description: 'Événement physique' },
  { value: 'online', label: 'En ligne', icon: 'videocam-outline', description: 'Événement virtuel' },
  { value: 'hybrid', label: 'Hybride', icon: 'globe-outline', description: 'Physique + Virtuel' },
];

export const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'checkbox', label: 'Cases à cocher' },
  { value: 'radio', label: 'Boutons radio' },
];

export const SESSION_TYPES = [
  { value: 'keynote', label: 'Keynote' },
  { value: 'talk', label: 'Présentation' },
  { value: 'panel', label: 'Panel' },
  { value: 'workshop', label: 'Atelier' },
  { value: 'networking', label: 'Networking' },
  { value: 'break', label: 'Pause' },
  { value: 'lunch', label: 'Déjeuner' },
];
