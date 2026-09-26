/**
 * useOrganizerRole — qui, dans cette app, a du travail d'organisateur ?
 *
 * `User.role` vaut `'organizer'` UNIQUEMENT pour le propriétaire d'un compte
 * organisateur. Un bénévole, un contrôleur d'accès, un caissier ou un exposant
 * restent `'user'` : le backend modélise leurs droits dans `EventStaff`
 * (6 rôles, 14 permissions atomiques), mais la navigation ne regardait que
 * `user.role`. Résultat : un bénévole chargé de scanner à l'entrée n'avait
 * aucun chemin évident vers le scanner.
 *
 * Ce hook réunit les deux sources :
 *   - `user.role === 'organizer'`  → propriétaire ;
 *   - au moins un `EventStaff` actif → membre d'équipe (bénévole, staff…).
 *
 * L'appel réseau n'est fait QUE pour les non-organisateurs authentifiés :
 * pour un propriétaire, la réponse est déjà connue, et pour un visiteur
 * anonyme il n'y a rien à demander.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { eventTeamAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

export interface OrganizerRole {
  /** Propriétaire d'un compte organisateur. */
  isOrganizer: boolean;
  /** Membre de l'équipe d'au moins un événement (bénévole, staff, caissier…). */
  isStaff: boolean;
  /** A des responsabilités d'organisation, à quelque titre que ce soit. */
  hasOrganizerWork: boolean;
  /** Nombre d'événements où l'utilisateur est staff (0 pour un propriétaire). */
  staffEventCount: number;
  /** La détection staff est encore en cours (évite un onglet qui apparaît tard). */
  isResolving: boolean;
  /** Force une re-détection (après acceptation d'une invitation, par ex.). */
  refresh: () => void;
}

export function useOrganizerRole(): OrganizerRole {
  const { user, isAuthenticated } = useAuth();
  const isOrganizer = user?.role === 'organizer';

  const [staffEventCount, setStaffEventCount] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  // Évite un setState après démontage (le hook vit dans la tab bar, montée
  // puis démontée au logout).
  const activeRef = useRef(true);

  const detect = useCallback(async () => {
    // Un propriétaire a déjà la réponse ; un anonyme n'a rien à demander.
    if (!isAuthenticated || isOrganizer) {
      setStaffEventCount(0);
      setIsResolving(false);
      return;
    }
    setIsResolving(true);
    try {
      const res = await eventTeamAPI.getMyTeamEvents();
      const events = Array.isArray(res.data) ? res.data : res.data?.results || [];
      if (activeRef.current) setStaffEventCount(events.length);
    } catch {
      // Échec réseau : on reste sur « pas staff ». Un onglet manquant est
      // récupérable (Profil garde tous les accès) ; un onglet affiché à tort
      // mènerait vers des écrans en 403.
      if (activeRef.current) setStaffEventCount(0);
    } finally {
      if (activeRef.current) setIsResolving(false);
    }
  }, [isAuthenticated, isOrganizer]);

  useEffect(() => {
    activeRef.current = true;
    detect();
    return () => {
      activeRef.current = false;
    };
  }, [detect]);

  const isStaff = staffEventCount > 0;

  return {
    isOrganizer,
    isStaff,
    hasOrganizerWork: isOrganizer || isStaff,
    staffEventCount,
    isResolving,
    refresh: detect,
  };
}
