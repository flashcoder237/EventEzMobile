/**
 * Chaîne de contraintes de largeur d'une bulle de message.
 *
 * SYMPTÔME : « Connectez-vous » s'affichait « Connectez ». Le contenu
 * stocké était pourtant complet — le copier/coller restituait tout le
 * message. C'était donc bien un défaut de RENDU, pas de données.
 *
 * CAUSE : `flexShrink: 1` n'était posé que sur `bubbleContainer`. Dans un
 * `messageRow` en `flexDirection: row`, le conteneur rétrécissait bien,
 * mais la View de la bulle et le Text gardaient leur largeur « idéale »
 * de contenu : le wrap ne se déclenchait jamais et le dernier mot était
 * rogné au bord de l'écran.
 *
 * La contrainte doit descendre sur TOUTE la chaîne. Ce test la verrouille
 * maillon par maillon, parce qu'un seul maillon manquant suffit à faire
 * réapparaître le bug — et qu'il est invisible tant qu'on ne teste pas
 * avec un message assez long.
 */
describe('largeur de bulle — chaîne de contraintes', () => {
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'MessageBubble.tsx'),
    'utf8',
  ) as string;

  /** Extrait le corps d'un style nommé dans la StyleSheet. */
  const blockOf = (name: string): string => {
    const start = source.indexOf(`  ${name}: {`);
    if (start === -1) throw new Error(`style ${name} introuvable`);
    const end = source.indexOf('\n  },', start);
    return source.slice(start, end);
  };

  it('bubbleContainer peut rétrécir', () => {
    expect(blockOf('bubbleContainer')).toContain('flexShrink: 1');
  });

  it('la bulle elle-même peut rétrécir', () => {
    // Le maillon qui manquait : sans lui, le conteneur rétrécit mais la
    // bulle garde sa largeur de contenu et déborde.
    expect(blockOf('bubble')).toContain('flexShrink: 1');
  });

  it('la bulle lève la taille minimale automatique du contenu', () => {
    // Sans `minWidth: 0`, un mot long empêche tout rétrécissement et
    // `flexShrink` reste sans effet.
    expect(blockOf('bubble')).toContain('minWidth: 0');
  });

  it('le texte du message peut rétrécir', () => {
    expect(blockOf('messageText')).toContain('flexShrink: 1');
  });

  it("l'horodatage n'impose pas sa largeur à la bulle", () => {
    // Il occupe sa propre ligne : mesuré comme contrainte, il étirait un
    // message court et faussait la mesure d'un message long.
    expect(blockOf('timeRowInside')).toContain("alignSelf: 'flex-end'");
  });

  it('la bulle reste bornée à 75 % de la largeur disponible', () => {
    // Garde-fou inverse : sans plafond, une bulle occuperait toute la
    // ligne et on ne distinguerait plus l'expéditeur du destinataire.
    expect(blockOf('bubbleContainer')).toContain("maxWidth: '75%'");
  });
});
