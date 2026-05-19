/**
 * Utilitaires pour le système de messagerie
 * Fonctions helpers standardisées
 */

import { Message, User } from '../../types';

// ============================================
// CONSTANTES
// ============================================

/**
 * Taille d'avatar standardisée pour la messagerie
 */
export const MESSAGE_AVATAR_SIZE = 40;

/**
 * Emojis de réaction disponibles
 */
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

/**
 * Durée du typing indicator avant expiration (ms)
 */
export const TYPING_INDICATOR_TIMEOUT = 5000;

/**
 * Intervalle entre les envois de typing indicator (ms)
 */
export const TYPING_SEND_INTERVAL = 2000;

/**
 * Nombre de messages par page
 */
export const MESSAGES_PER_PAGE = 20;

// ============================================
// FORMATAGE DATES
// ============================================

/**
 * Formate l'heure d'un message (HH:MM)
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formate la date relative (Aujourd'hui, Hier, ou date complète)
 */
export function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  }
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formate le temps écoulé pour la liste des conversations
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Formate une durée en secondes (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// VÉRIFICATION MESSAGES
// ============================================

/**
 * Vérifie si un message appartient à l'utilisateur actuel
 */
export function isMyMessage(message: Message, userId: string | number | undefined): boolean {
  if (!userId) return false;

  const senderId = typeof message.sender === 'number'
    ? message.sender
    : typeof message.sender === 'string'
      ? message.sender
      : (message.sender as any)?.id;

  return String(senderId) === String(userId);
}

/**
 * Vérifie si on doit afficher la date avant ce message.
 * Les messages sont ordonnés du plus récent (index 0, bas) au plus ancien (index N, haut)
 * pour un FlatList inversé.
 */
export function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const currentDate = new Date(messages[index].created_at).toDateString();
  const nextDate = new Date(messages[index + 1].created_at).toDateString();
  return currentDate !== nextDate;
}

/**
 * Vérifie si un message est temporaire (optimistic update)
 */
export function isTemporaryMessage(message: Message): boolean {
  return String(message.id).startsWith('temp-');
}

// ============================================
// EXTRACTION DONNÉES
// ============================================

/**
 * Obtient les initiales à partir d'un message
 */
export function getMessageInitials(message: Message): string {
  if (message.sender_name) {
    const parts = message.sender_name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return message.sender_name[0].toUpperCase();
  }

  if (typeof message.sender === 'object' && message.sender !== null) {
    const sender = message.sender as any;
    if (sender.first_name && sender.last_name) {
      return `${sender.first_name[0]}${sender.last_name[0]}`.toUpperCase();
    }
    return (sender.email?.[0] || 'U').toUpperCase();
  }

  return 'U';
}

/**
 * Obtient l'avatar d'un message
 */
export function getMessageAvatar(message: Message): string | null {
  return message.sender_avatar ||
    (typeof message.sender === 'object'
      ? (message.sender as any)?.profile_picture || (message.sender as any)?.image
      : null);
}

/**
 * Obtient le nom d'affichage d'un utilisateur
 */
export function getDisplayName(user: User | null): string {
  if (!user) return 'Utilisateur';
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  if (user.email) return user.email.split('@')[0];
  return 'Utilisateur';
}

/**
 * Obtient les initiales d'un utilisateur
 */
export function getUserInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Recupere le contenu du message de reponse. Comparaison normalisee via
 * String() — `m.id` peut etre number (REST) ou string (WS/temp), `replyTo`
 * est passe en string par le caller. Sans normalisation `123 === '123'`
 * retourne false → le tag de reply n'est jamais resolu, et la bubble
 * affiche le message sans rappel du message d'origine.
 */
export function getReplyToContent(
  replyTo: string | Message | undefined,
  messages: Message[]
): Message | null {
  if (!replyTo) return null;
  if (typeof replyTo === 'string') {
    return messages.find(m => String(m.id) === replyTo) || null;
  }
  return replyTo;
}

// ============================================
// STATUT DES MESSAGES
// ============================================

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Détermine le statut d'envoi d'un message
 */
export function getMessageStatus(message: Message, otherUserId?: string | number | null): MessageStatus {
  // Message en cours d'envoi
  if (isTemporaryMessage(message)) {
    return 'sending';
  }

  // Message avec erreur d'envoi
  if ((message as any).sendFailed) {
    return 'failed';
  }

  // Message lu par l'autre utilisateur
  if (otherUserId && message.read_by?.includes(Number(otherUserId))) {
    return 'read';
  }

  // Message livré (reçu par le serveur)
  if (message.read_by && message.read_by.length > 0) {
    return 'delivered';
  }

  // Message envoyé
  return 'sent';
}

// ============================================
// RÉACTIONS
// ============================================

/**
 * Groupe les réactions par emoji avec comptage
 */
export function groupReactions(reactions: any[] | undefined): Record<string, number> {
  if (!reactions || reactions.length === 0) return {};

  return reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Vérifie si l'utilisateur a déjà réagi avec cet emoji
 */
export function hasUserReacted(
  reactions: any[] | undefined,
  emoji: string,
  userId: string | number | undefined
): boolean {
  if (!reactions || !userId) return false;
  return reactions.some(r => r.emoji === emoji && String(r.user) === String(userId));
}

// ============================================
// TYPING INDICATORS
// ============================================

/**
 * Formate le texte de l'indicateur de frappe
 */
export function formatTypingText(typingUsers: string[]): string {
  if (typingUsers.length === 0) return '';
  if (typingUsers.length === 1) return `${typingUsers[0]} écrit...`;
  if (typingUsers.length === 2) return `${typingUsers[0]} et ${typingUsers[1]} écrivent...`;
  return `${typingUsers[0]} et ${typingUsers.length - 1} autres écrivent...`;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Vérifie si un message peut être envoyé
 */
export function canSendMessage(
  content: string,
  attachedFiles: any[],
  sending: boolean
): boolean {
  return (content.trim().length > 0 || attachedFiles.length > 0) && !sending;
}

/**
 * Vérifie si un message peut être édité
 */
export function canEditMessage(message: Message, userId: string | number | undefined): boolean {
  if (!isMyMessage(message, userId)) return false;

  // Vérifier l'âge du message (max 24h)
  const messageDate = new Date(message.created_at);
  const now = new Date();
  const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

  return hoursDiff < 24;
}

/**
 * Vérifie si un message peut être supprimé
 */
export function canDeleteMessage(message: Message, userId: string | number | undefined): boolean {
  return isMyMessage(message, userId);
}

// ============================================
// ATTACHMENTS
// ============================================

/**
 * Détermine le type MIME d'un fichier
 */
export function getMimeType(fileType: 'image' | 'document' | 'voice'): string {
  switch (fileType) {
    case 'image':
      return 'image/jpeg';
    case 'voice':
      return 'audio/m4a';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Génère un nom de fichier pour un message vocal
 */
export function generateVoiceFileName(): string {
  return `voice_${Date.now()}.m4a`;
}

// ============================================
// OFFLINE QUEUE
// ============================================

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  replyTo?: string;
  attachments: any[];
  timestamp: number;
  retryCount: number;
  /**
   * True quand le message a atteint MAX_RETRY_COUNT échecs et n'est plus
   * automatiquement réessayé. L'UI affiche alors une bulle "Échec - réessayer"
   * permettant à l'utilisateur de relancer manuellement ou de supprimer.
   * Sans ce flag, après 3 retries on perdait silencieusement le message.
   */
  failed?: boolean;
}

/**
 * Crée un message pour la file d'attente offline
 */
export function createQueuedMessage(
  conversationId: string,
  content: string,
  replyTo?: string,
  attachments: any[] = []
): QueuedMessage {
  return {
    id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    content,
    replyTo,
    attachments,
    timestamp: Date.now(),
    retryCount: 0,
  };
}
