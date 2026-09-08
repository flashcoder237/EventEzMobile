/**
 * « Cette inscription est-elle reellement payee ? »
 *
 * CAS REEL : un participant est redirige vers Stripe, ne paie rien, et
 * retrouve son billet marque « payé ». Une cause backend a ete corrigee,
 * mais l'app y contribuait : partout, l'etat « paye » etait deduit du seul
 * `registration.status === 'confirmed'`, jamais d'une preuve de paiement.
 * Des qu'un statut disait `confirmed` a tort, l'app affichait un billet
 * valide (talon TIX, « Voir QR »), et le mettait meme en cache hors ligne.
 *
 * Le backend expose pourtant la preuve : `payment_info.status` sur
 * l'inscription, `is_paid` sur chaque billet.
 *
 * Source unique — utilisee par l'affichage ET par le cache offline, pour
 * qu'ils ne puissent plus diverger.
 */

/** Statuts de paiement signifiant que l'argent est REELLEMENT entre.
 *  Un remboursement en fait partie : l'argent a bien ete encaisse, puis
 *  rendu. Meme definition que le backend (CashDrawer.compute_expected). */
const SETTLED_PAYMENT_STATUSES = ['completed', 'partially_refunded', 'refunded'];

type AnyTicket = { is_paid?: boolean; total_price?: number | string | null };
type AnyRegistration = {
  status?: string | null;
  payment_required?: boolean | null;
  payment_info?: { status?: string | null; method?: string | null } | null;
  tickets?: AnyTicket[] | null;
  total_amount?: number | string | null;
};

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Un montant reste-t-il du sur cette inscription ? */
export const hasAmountDue = (reg?: AnyRegistration | null): boolean => {
  if (!reg) return false;
  const tickets = Array.isArray(reg.tickets) ? reg.tickets : [];
  if (tickets.length > 0) {
    // Un billet a 0 (gratuit, code promo 100 %) n'est pas un impaye.
    return tickets.some((tk) => !tk?.is_paid && toNumber(tk?.total_price) > 0);
  }
  // Pas de detail billets (inscription a formulaire) : on se rabat sur
  // le montant global et sur l'indication du backend.
  if (toNumber(reg.total_amount) > 0) return true;
  return reg.payment_required === true;
};

/** Le paiement est-il prouve cote serveur ? */
export const hasSettledPayment = (reg?: AnyRegistration | null): boolean => {
  if (!reg) return false;
  const status = String(reg.payment_info?.status ?? '').toLowerCase();
  if (SETTLED_PAYMENT_STATUSES.includes(status)) return true;
  const tickets = Array.isArray(reg.tickets) ? reg.tickets : [];
  if (tickets.length === 0) return false;
  // Tous les billets honores (dont les gratuits marques is_paid par le
  // backend) : rien ne reste du.
  if (tickets.every((tk) => tk?.is_paid === true)) return true;
  // AJOUT DE BILLETS a une inscription DEJA payee : le nouveau billet est
  // impaye, mais les precedents restent acquis. `payment_info` ne sauve pas
  // le cas — il ne remonte que le paiement le PLUS RECENT (celui de
  // l'add-on, encore `pending`), masquant le `completed` d'origine.
  // Sans cette branche, le participant PERDAIT le QR de la place qu'il
  // avait reglee, y compris hors ligne, a l'entree de l'evenement.
  //
  // La preuve doit venir d'un billet REELLEMENT PAYANT et honore : un
  // billet gratuit est marque `is_paid` par le backend sans qu'un centime
  // soit entre, il ne prouve donc rien pour les autres lignes.
  return tickets.some((tk) => tk?.is_paid === true && toNumber(tk?.total_price) > 0);
};

/**
 * L'inscription se presente-t-elle comme acquise SANS l'etre ?
 * `true` => ne jamais afficher de billet valide, ni le mettre en cache.
 */
export const isRegistrationUnsettled = (reg?: AnyRegistration | null): boolean => {
  if (!reg) return false;
  return hasAmountDue(reg) && !hasSettledPayment(reg);
};

/** Un billet est-il presentable a l'entree (affichage + cache offline) ? */
export const isRegistrationPresentable = (reg?: AnyRegistration | null): boolean => {
  if (!reg) return false;
  const status = String(reg.status ?? '').toLowerCase();
  if (!['confirmed', 'completed', 'checked_in'].includes(status)) return false;
  return !isRegistrationUnsettled(reg);
};
