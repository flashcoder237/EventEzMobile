import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { utmAPI } from '../api';

/**
 * Capture l'attribution UTM a l'ouverture d'une fiche evenement.
 *
 * POURQUOI CE HOOK EXISTE
 * -----------------------
 * `utmAPI` etait defini et teste cote mobile mais appele NULLE PART :
 * du code mort que ses tests faisaient passer pour vivant. Consequence
 * reelle : le web enregistrait ses visites UTM, le mobile non — tout le
 * trafic issu de l'application etait donc invisible dans le tableau de
 * bord d'attribution, alors meme que le backend venait d'etre repare
 * pour compter les conversions.
 *
 * CE QU'ON ENVOIE
 * ---------------
 * Un lien profond peut porter des parametres utm_* (campagne SMS,
 * publication sociale...). S'ils sont presents, on les transmet tels
 * quels — meme semantique que le web.
 *
 * Sinon on enregistre une visite d'origine `mobile_app`. C'est un choix
 * assume : sans cela, une inscription faite depuis l'application
 * n'apparaitrait sous AUCUNE source, et l'organisateur en conclurait a
 * tort que son application ne convertit pas.
 *
 * DEDOUBLONNAGE
 * -------------
 * Une visite par evenement et par jour. Sans cette garde, revenir cinq
 * fois sur une fiche gonflerait le compteur et ecraserait le taux de
 * conversion — exactement le travers que le backend evite deja cote web.
 */

const DEDUP_PREFIX = '@eventez_utm_seen:';

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export function useUTMTracking(eventId?: string, params?: UTMParams) {
  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    const track = async () => {
      const today = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ local
      const key = `${DEDUP_PREFIX}${eventId}`;

      try {
        const seenAt = await AsyncStorage.getItem(key);
        if (seenAt === today) return;
      } catch {
        // Stockage indisponible : on prefere une visite en trop qu'aucune.
      }

      if (cancelled) return;

      try {
        await utmAPI.create({
          event: eventId,
          // `mobile_app` par defaut : une visite sans source serait
          // indistinguable d'un acces direct dans les statistiques.
          utm_source: params?.utm_source || 'mobile_app',
          utm_medium: params?.utm_medium || 'app',
          utm_campaign: params?.utm_campaign || '',
          utm_term: params?.utm_term || '',
          utm_content: params?.utm_content || '',
          landing_page: `eventez://events/${eventId}`,
        });
        await AsyncStorage.setItem(key, today);
      } catch {
        // L'attribution est de la donnee analytique : son echec ne doit
        // jamais remonter a l'utilisateur ni bloquer l'affichage.
      }
    };

    track();
    return () => {
      cancelled = true;
    };
  }, [eventId, params?.utm_source, params?.utm_medium, params?.utm_campaign,
      params?.utm_term, params?.utm_content]);
}
