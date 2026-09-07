/**
 * Utilitaires de formatage de dates pour l'application EventEz Mobile
 * Locale: fr-FR
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formate une date en format court: "12 janv."
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formate une date en format complet: "12 janvier 2026"
 */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une heure: "14:30"
 */
export function formatTime(timeString: string): string {
  // Handle both ISO datetime strings and time-only strings like "14:30:00"
  const date = new Date(timeString);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Fallback for time-only strings (e.g., "14:30:00" or "14:30")
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  return timeString;
}

/**
 * Formate une date et heure: "12 janv. a 14:30"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const datePart = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const timePart = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} à ${timePart}`;
}

/**
 * Formate un temps relatif passe: "il y a 5 min", "il y a 2h", "il y a 3j"
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 0) {
    // Future date - return formatted date instead
    return formatDate(dateString);
  }

  if (diff < MINUTE) {
    return "à l'instant";
  }

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `il y a ${minutes} min`;
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `il y a ${hours}h`;
  }

  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY);
    return `il y a ${days}j`;
  }

  if (diff < 30 * DAY) {
    const weeks = Math.floor(diff / (7 * DAY));
    return `il y a ${weeks} sem.`;
  }

  // For older dates, return the formatted date
  return formatDate(dateString);
}

/**
 * Formate une date relative: "Aujourd'hui", "Demain", "Lun. 12 janv."
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / DAY);

  if (diffDays === 0) {
    return "Aujourd'hui";
  }

  if (diffDays === 1) {
    return 'Demain';
  }

  if (diffDays === -1) {
    return 'Hier';
  }

  // For dates within the next 7 days, show day name + date
  if (diffDays > 1 && diffDays <= 7) {
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
    const datePart = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
    // Capitalize first letter
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${capitalizedDay} ${datePart}`;
  }

  // For other dates, show full short format
  const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
  const datePart = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalizedDay} ${datePart}`;
}

/**
 * Verifie si un evenement est dans le futur (a partir d'aujourd'hui minuit)
 */
export function isEventInFuture(startDate: string): boolean {
  if (!startDate) return true; // If no date, show it
  const eventDate = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  return eventDate >= today;
}

/**
 * Verifie si une date tombe ce week-end (samedi ou dimanche prochain)
 */
export function isThisWeekend(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Calculate next Saturday
  const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday));

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return eventDay >= saturday && eventDay <= sunday;
}

/** Deux instants tombent-ils le meme jour civil ? */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

/**
 * Plage complete d'un evenement : quand il commence ET quand il finit.
 *
 * Miroir de `eventez-frontend/src/lib/utils/dateUtils.ts` — garder les
 * deux synchronises.
 *
 * Un evenement affiche avec sa seule date de debut induit en erreur : un
 * salon sur deux jours ou un concert de quatre heures ne dit pas au
 * visiteur jusqu'a quand il peut venir.
 *
 * LE PIEGE : concatener betement les deux dates produit « 12 mars –
 * 12 mars » sur la majorite des evenements, ce qui est PIRE que
 * n'afficher qu'une date. On distingue donc :
 *   - meme jour        → « sam. 12 mars, 18:00 – 23:00 »
 *   - jours differents → « sam. 12 mars, 18:00 → lun. 14 mars, 02:00 »
 */
export function formatEventDateRange(
  startDate: string | Date | null | undefined,
  endDate?: string | Date | null,
  bcp47: string = 'fr-FR',
  opts: { showTime?: boolean } = {},
): string {
  const { showTime = true } = opts;
  if (!startDate) return '';

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';

  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit', minute: '2-digit',
  };

  const startDay = start.toLocaleDateString(bcp47, dateOpts);
  const startTime = start.toLocaleTimeString(bcp47, timeOpts);

  const end = endDate ? new Date(endDate) : null;
  const hasEnd = end && !Number.isNaN(end.getTime());

  if (!hasEnd) {
    return showTime ? `${startDay}, ${startTime}` : startDay;
  }

  const endTime = end!.toLocaleTimeString(bcp47, timeOpts);

  if (isSameCalendarDay(start, end!)) {
    // Le jour n'est pas repete : il ne change pas.
    return showTime ? `${startDay}, ${startTime} – ${endTime}` : startDay;
  }

  const endDay = end!.toLocaleDateString(bcp47, dateOpts);
  return showTime
    ? `${startDay}, ${startTime} → ${endDay}, ${endTime}`
    : `${startDay} → ${endDay}`;
}

/**
 * Nombre de jours civils couverts par un evenement (1 = mono-jour).
 *
 * Sert aux surfaces trop etroites pour une plage complete : sur une carte
 * de liste, un discret « 3 jours » informe sans encombrer, et disparait
 * de lui-meme sur les evenements d'une journee.
 */
export function getEventDaySpan(
  startDate: string | Date | null | undefined,
  endDate?: string | Date | null,
): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  // Jours CIVILS, pas tranches de 24 h : un evenement de 20h a 2h du matin
  // s'etale sur deux jours mais ne dure que six heures.
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((endDay.getTime() - startDay.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}
