/**
 * G1 — pile d'annulation pour « secouer pour annuler ».
 *
 * UNE seule entrée, valable 10 s : la dernière action réversible (retrait d'un
 * favori, archivage d'une conversation). Une secousse pendant ce délai ouvre
 * une feuille « Annuler … ? » — jamais d'annulation directe. Le toast
 * « Annuler » des écrans reste la voie principale ; la pile n'est qu'un
 * raccourci de plus.
 *
 * N'y entrent QUE les actions dont l'annulation est techniquement sûre : la
 * suppression d'un message (tombstone local + WS, pas de restauration côté
 * serveur) en est exclue.
 */

export const UNDO_WINDOW_MS = 10_000;

export interface UndoEntry {
  /** Clé stable (dédoublonnage, retrait ciblé). */
  key: string;
  /** Libellé déjà traduit : « Annuler le retrait de « Jazz Night » ? ». */
  label: string;
  /** Exécute l'annulation. Rejette en cas d'échec (la feuille l'affiche). */
  undo: () => Promise<void> | void;
}

interface StoredEntry extends UndoEntry {
  at: number;
}

let entry: StoredEntry | null = null;
let expiry: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function clearExpiry() {
  if (expiry) clearTimeout(expiry);
  expiry = null;
}

export const undoStack = {
  /** Remplace l'entrée courante (une seule à la fois). */
  push(next: UndoEntry, now: number = Date.now()) {
    clearExpiry();
    entry = { ...next, at: now };
    expiry = setTimeout(() => {
      expiry = null;
      if (entry && entry.key === next.key) {
        entry = null;
        emit();
      }
    }, UNDO_WINDOW_MS);
    emit();
  },
  /** Entrée encore valable, sans la consommer. */
  peek(now: number = Date.now()): UndoEntry | null {
    if (!entry) return null;
    if (now - entry.at > UNDO_WINDOW_MS) return null;
    return entry;
  },
  /** Consomme l'entrée (feuille confirmée ou toast « Annuler » utilisé). */
  take(now: number = Date.now()): UndoEntry | null {
    const e = undoStack.peek(now);
    undoStack.clear();
    return e;
  },
  /** Retire l'entrée si c'est bien `key` (l'action a été annulée ailleurs). */
  drop(key: string) {
    if (entry?.key === key) undoStack.clear();
  },
  clear() {
    clearExpiry();
    if (entry) {
      entry = null;
      emit();
    }
  },
  hasPending(now: number = Date.now()): boolean {
    return undoStack.peek(now) !== null;
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export default undoStack;
