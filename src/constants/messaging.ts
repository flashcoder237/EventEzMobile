/**
 * Limites de taille pour les fichiers joints en messagerie.
 *
 * IMPORTANT : ces valeurs DOIVENT rester en sync avec
 * `EventEzBackend/config/settings.py` :
 *   - MESSAGE_FILE_MAX_SIZE   = 10 MB
 *   - MESSAGE_IMAGE_MAX_SIZE  =  5 MB
 *   - MESSAGE_VOICE_MAX_SIZE  =  5 MB
 *   - GROUP_CONVERSATION_MAX_TOTAL_BYTES = 500 MB
 */

export const MESSAGE_LIMITS = {
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  DOCUMENT_MAX_BYTES: 10 * 1024 * 1024,
  VOICE_MAX_BYTES: 5 * 1024 * 1024,
  GROUP_TOTAL_MAX_BYTES: 500 * 1024 * 1024,
} as const;

export type AttachmentKind = 'image' | 'document' | 'voice';

export function getMaxBytes(kind: AttachmentKind): number {
  switch (kind) {
    case 'image':
      return MESSAGE_LIMITS.IMAGE_MAX_BYTES;
    case 'voice':
      return MESSAGE_LIMITS.VOICE_MAX_BYTES;
    default:
      return MESSAGE_LIMITS.DOCUMENT_MAX_BYTES;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Détermine le type d'attachement à partir d'un mime type
 * (en mobile, le picker fournit le mime).
 */
export function detectAttachmentKindFromMime(mimeType: string | undefined): AttachmentKind {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'voice';
  return 'document';
}

/**
 * Valide qu'un fichier (taille en octets) respecte la limite associée à son type.
 * Retourne `null` si OK, sinon un message d'erreur prêt à afficher.
 */
export function validateAttachmentSize(
  sizeBytes: number,
  kind: AttachmentKind,
): string | null {
  const max = getMaxBytes(kind);
  if (sizeBytes > max) {
    const label = kind === 'image' ? 'image' : kind === 'voice' ? 'audio' : 'fichier';
    return `Cet ${label} est trop volumineux (${formatBytes(sizeBytes)}). Maximum : ${formatBytes(max)}.`;
  }
  return null;
}
