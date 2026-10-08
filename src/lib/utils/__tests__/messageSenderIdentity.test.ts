/**
 * Identité de l'expéditeur sur une bulle de message.
 *
 * BUG CORRIGÉ (2026-10-07), signalé par un testeur : « au lieu de voir sa
 * photo je vois juste un rond avec "u" à l'intérieur ».
 *
 * Le symptôme était déroutant : l'en-tête de la conversation affichait la
 * BONNE photo, alors qu'une bulle plus bas affichait « U ». Deux chaînes de
 * résolution totalement distinctes :
 *   - l'en-tête lit les PARTICIPANTS de la conversation (API REST, photo en
 *     URL absolue) ;
 *   - la bulle lit le MESSAGE lui-même.
 *
 * Or le message diffusé en temps réel ne portait ni `sender_avatar`, ni
 * `sender_name`, ni l'e-mail (retiré à juste titre pour la confidentialité) —
 * seulement `sender.full_name`, que le code ne lisait pas. On tombait donc sur
 * la lettre « U » codée en dur.
 *
 * Et comme ce message est stocké tel quel en base locale, le « U » survivait
 * au redémarrage de l'application.
 */
import { getMessageAvatar, getMessageInitials } from '../messagingHelpers';

/** Message tel que diffusé par le WebSocket (après correction côté serveur). */
const WS_MESSAGE: any = {
  id: 1,
  sender_name: 'Basilio Tefoye',
  sender_avatar: 'https://eventez.online/media/avatars/basilio.jpg',
  sender: {
    id: 7,
    full_name: 'Basilio Tefoye',
    profile_picture: 'https://eventez.online/media/avatars/basilio.jpg',
  },
};

describe('identité de l’expéditeur', () => {
  it("prend la photo fournie par le message", () => {
    expect(getMessageAvatar(WS_MESSAGE)).toBe(
      'https://eventez.online/media/avatars/basilio.jpg');
  });

  it('retombe sur la photo imbriquée si le champ direct manque', () => {
    const message: any = { ...WS_MESSAGE, sender_avatar: undefined };

    expect(getMessageAvatar(message)).toBe(
      'https://eventez.online/media/avatars/basilio.jpg');
  });

  it("déduit les initiales de `full_name` quand c'est le seul nom disponible", () => {
    // LE bug : ce cas retombait sur « U ».
    const message: any = {
      id: 2,
      sender: { id: 7, full_name: 'Basilio Tefoye' },
    };

    expect(getMessageInitials(message)).toBe('BT');
  });

  it("gère un nom en un seul mot", () => {
    const message: any = { id: 3, sender: { id: 7, full_name: 'Cedric' } };

    expect(getMessageInitials(message)).toBe('C');
  });

  it("ne rend « U » que lorsqu'on ignore VRAIMENT qui a écrit", () => {
    // Garde-fou : le repli doit continuer d'exister, mais en dernier recours.
    expect(getMessageInitials({ id: 4, sender: { id: 7 } } as any)).toBe('U');
  });

  it("privilégie `sender_name` sur l'objet imbriqué", () => {
    const message: any = {
      id: 5,
      sender_name: 'Alice Martin',
      sender: { id: 7, full_name: 'Autre Nom' },
    };

    expect(getMessageInitials(message)).toBe('AM');
  });

  it('ne rend aucune photo quand on n’en connaît pas', () => {
    // `undefined` ou `null` : seule compte l'absence de valeur, c'est ce que
    // le composant teste pour basculer sur les initiales.
    expect(getMessageAvatar({ id: 6, sender: { id: 7 } } as any)).toBeFalsy();
  });
});
