/**
 * Garde anti-envoi d'une réponse rapide non complétée.
 *
 * Cas réel : l'organisateur appuie sur « Adresse », « Programme », tape
 * « Pourquoi ? », envoie — et la discussion reçoit « 📍 Adresse : » sans
 * adresse, visible de tous les participants.
 */
import { hasUntouchedTemplate } from '../quickReplyGuard';

const TEMPLATES = [
  '📍 Adresse : ',
  '🕐 Horaire : ouverture des portes à … — début à …',
  '📋 Voici le programme : ',
  '👗 Dress code : ',
  '🚗 Parking : ',
  'Merci pour ton message, je reviens vers toi rapidement 🙏',
];

describe('hasUntouchedTemplate', () => {
  it('bloque une amorce restée telle quelle', () => {
    expect(hasUntouchedTemplate('📍 Adresse :', TEMPLATES)).toBe(true);
  });

  it('bloque même si une seule ligne sur plusieurs est incomplète', () => {
    // Le cas de la capture : trois lignes, dont deux amorces vides.
    const message = '📍 Adresse :\n📋 Voici le programme :\nPourquoi ?';
    expect(hasUntouchedTemplate(message, TEMPLATES)).toBe(true);
  });

  it('laisse passer une amorce complétée', () => {
    expect(
      hasUntouchedTemplate('📍 Adresse : 12 rue des Palmiers, Douala', TEMPLATES),
    ).toBe(false);
  });

  it('laisse passer un gabarit déjà complet', () => {
    // « Merci pour ton message… » n'attend aucune suite.
    expect(hasUntouchedTemplate(TEMPLATES[5], TEMPLATES)).toBe(false);
  });

  it('laisse passer un gabarit à trous non terminé par deux-points', () => {
    // L'horaire se complète en remplaçant les « … », pas après un « : ».
    // Le bloquer empêcherait un organisateur d'envoyer un message valide.
    expect(hasUntouchedTemplate(TEMPLATES[1], TEMPLATES)).toBe(false);
  });

  it("ne bloque pas un message de l'utilisateur finissant par deux-points", () => {
    // Il n'a pas utilisé de puce : ce n'est pas à nous de le corriger.
    expect(hasUntouchedTemplate('Rendez-vous ici :', TEMPLATES)).toBe(false);
  });

  it('ignore les espaces autour de la ligne', () => {
    expect(hasUntouchedTemplate('   📍 Adresse :   ', TEMPLATES)).toBe(true);
  });

  it('ne bloque rien quand il n y a aucun gabarit', () => {
    expect(hasUntouchedTemplate('📍 Adresse :', [])).toBe(false);
  });

  it('gère un message vide', () => {
    expect(hasUntouchedTemplate('', TEMPLATES)).toBe(false);
  });
});
