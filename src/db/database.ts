/**
 * Base de données locale SQLite — synchro messagerie façon Telegram.
 *
 * La base locale est la SOURCE DE VÉRITÉ pour l'affichage : les écrans lisent
 * ici (instantané, offline), et un moteur de sync alimente/rafraîchit en fond.
 *
 * Ce module gère l'ouverture (singleton) et les migrations de schéma. Les accès
 * métier passent par les repositories (messageRepository, etc.).
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'eventez.db';

// Version de schéma courante. Incrémenter à chaque changement de structure et
// ajouter le bloc de migration correspondant dans `migrate()`.
const SCHEMA_VERSION = 2;

let _db: SQLite.SQLiteDatabase | null = null;
let _openPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Ouvre (ou récupère) la base, en appliquant les migrations une seule fois.
 * Idempotent et concurrent-safe : plusieurs appels partagent la même promesse.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_openPromise) return _openPromise;

  _openPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    // WAL : lectures concurrentes non bloquées par les écritures (fluidité UI).
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await migrate(db);
    _db = db;
    return db;
  })();

  return _openPromise;
}

/**
 * Applique les migrations de schéma en fonction de `user_version`.
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(`
      -- Conversations : miroir local de l'inbox.
      CREATE TABLE IF NOT EXISTS conversations (
        id             TEXT PRIMARY KEY,          -- backend id (int) stocké en TEXT
        payload        TEXT NOT NULL,             -- JSON complet de la conversation
        last_message_at TEXT,                     -- pour trier l'inbox localement
        updated_at     TEXT,                      -- curseur de sync inbox
        unread_count   INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON conversations(last_message_at DESC);

      -- Messages : un par ligne, rattaché à une conversation.
      CREATE TABLE IF NOT EXISTS messages (
        id              TEXT PRIMARY KEY,         -- backend id (int) en TEXT ; temp-xxx pour optimistes
        conversation_id TEXT NOT NULL,
        server_id       INTEGER,                  -- id numérique serveur (NULL tant qu'optimiste) — tri/curseur
        payload         TEXT NOT NULL,            -- JSON complet du message (Message)
        created_at      TEXT NOT NULL,
        updated_at      TEXT,                     -- curseur delta
        is_deleted      INTEGER DEFAULT 0,
        send_state      TEXT DEFAULT 'sent'       -- 'sent' | 'pending' | 'failed' (outbox)
      );
      CREATE INDEX IF NOT EXISTS idx_msg_conv_server ON messages(conversation_id, server_id);
      CREATE INDEX IF NOT EXISTS idx_msg_conv_created ON messages(conversation_id, created_at);

      -- État de synchro par conversation : dernier curseur delta appliqué.
      CREATE TABLE IF NOT EXISTS sync_state (
        conversation_id TEXT PRIMARY KEY,
        cursor          TEXT,                     -- updated_at du dernier message synchronisé
        synced_at       TEXT
      );
    `);
    await db.execAsync(`PRAGMA user_version = 1;`);
  }

  if (current < 2) {
    await db.execAsync(`
      -- Outbox d'envoi : un enregistrement par message en attente d'envoi
      -- (offline ou en cours). Contient le texte ET les attachments locaux
      -- (URI file://) pour pouvoir rejouer l'upload à la reconnexion.
      CREATE TABLE IF NOT EXISTS outbox (
        temp_id         TEXT PRIMARY KEY,         -- id optimiste (temp-xxx) = lien avec messages.id
        conversation_id TEXT NOT NULL,
        content         TEXT,
        reply_to        TEXT,
        attachments     TEXT,                     -- JSON [{uri,name,type}] — fichiers locaux
        state           TEXT DEFAULT 'pending',   -- 'pending' | 'sending' | 'failed'
        retry_count     INTEGER DEFAULT 0,
        created_at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_outbox_conv ON outbox(conversation_id);
    `);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}

/**
 * Ferme la base (tests / logout). La prochaine requête la rouvrira.
 */
export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
    _openPromise = null;
  }
}

/**
 * Vide toutes les tables — à appeler au logout pour ne pas fuiter les messages
 * d'un compte à l'autre sur un appareil partagé.
 */
export async function clearAllLocalData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM sync_state;
    DELETE FROM outbox;
  `);
}
