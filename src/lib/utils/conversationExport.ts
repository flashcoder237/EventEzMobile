/**
 * Helpers de sauvegarde locale d'une conversation (parité avec le web).
 *
 * Utilise `expo-file-system` pour écrire le manifest JSON dans le sandbox
 * documents, puis `expo-sharing` pour proposer "Enregistrer dans Fichiers"
 * ou partager vers une autre app (iCloud, Drive, etc.).
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messagesAPI } from '../../api';

// Clé persistante : on note la date du dernier export local par conversation
// pour afficher "Sauvegardé il y a X" dans le banner.
const LAST_EXPORT_KEY = (conversationId: number | string) =>
  `eventez:last_export:${conversationId}`;

/** Renvoie la date ISO du dernier export local pour une conversation, ou null. */
export async function getLastExportAt(conversationId: number | string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_EXPORT_KEY(conversationId));
  } catch {
    return null;
  }
}

async function rememberExportTime(conversationId: number | string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_EXPORT_KEY(conversationId), new Date().toISOString());
  } catch {
    /* storage indisponible : ignorer */
  }
}

export interface ExportedConversation {
  exported_at: string;
  conversation: {
    id: number;
    name: string;
    conversation_type: 'direct' | 'group' | 'event';
    event_id: number | null;
    auto_delete_at: string | null;
    created_at: string;
    last_message_at: string | null;
    message_count: number;
    attachment_total_bytes: number;
  };
  participants: Array<{ id: number; email: string; full_name: string }>;
  messages: Array<{
    id: number;
    sender_id: number;
    sender_email: string;
    content: string;
    message_type: string;
    is_deleted: boolean;
    is_edited: boolean;
    edited_at: string | null;
    created_at: string;
    reply_to_id: number | null;
    attachments: Array<{
      id: number;
      attachment_type: string;
      file_url: string | null;
      file_name: string;
      file_size: number;
      mime_type: string;
    }>;
  }>;
}

function buildFilename(conversationId: number): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `eventez-conversation-${conversationId}-${yyyy}-${mm}-${dd}.json`;
}

/**
 * Télécharge le manifest, l'écrit dans le sandbox documents puis ouvre la
 * feuille de partage pour que l'utilisateur le sauvegarde où il veut.
 *
 * Renvoie `{ data, fileUri }` pour permettre à l'appelant d'afficher le
 * compteur de messages sauvegardés.
 */
export async function downloadConversationBackup(
  conversationId: number | string,
): Promise<{ data: ExportedConversation; fileUri: string }> {
  const response = await messagesAPI.exportConversation(conversationId);
  const data = response.data as ExportedConversation;

  const filename = buildFilename(Number(conversationId));
  const dir = FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('Stockage local indisponible sur cet appareil.');
  }
  const fileUri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(
    fileUri,
    JSON.stringify(data, null, 2),
    { encoding: 'utf8' as any },
  );

  // Ouvre la feuille de partage native si dispo (iCloud, Drive, Files...).
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Sauvegarder la conversation',
        UTI: 'public.json',
      });
    } catch {
      // L'utilisateur a annulé — ce n'est pas une erreur. Le fichier reste écrit.
    }
  }

  await rememberExportTime(conversationId);
  return { data, fileUri };
}
