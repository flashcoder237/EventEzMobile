// ============================================
// EventEz Mobile API — Announcements
// ============================================
//
// Récupère les annonces publiées (modal au boot). Le backend filtre déjà par
// version / plateforme / audience à partir des headers X-App-* envoyés par
// l'intercepteur axios — on n'a rien à passer en query.

import api from './instance';

export const announcementsAPI = {
  getActive: () => api.get('/announcements/active/'),
};
