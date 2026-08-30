/**
 * Les badges affichaient tous un « ? ».
 *
 * Le backend stocke des noms d'icônes au format Lucide/Feather
 * (`message-circle`, `zap`, `crown`…) qu'Ionicons ne connaît pas. Sans
 * correspondance, `<Ionicons name="message-circle">` rend le glyphe inconnu.
 */
import { badgeIcon } from '../GamificationScreen';

// Valeurs RÉELLEMENT présentes en base (SELECT DISTINCT icon FROM badge).
const BACKEND_ICONS = [
  'award', 'calendar', 'check-circle', 'crown', 'flag', 'heart',
  'message-circle', 'rocket', 'star', 'thumbs-up', 'trending-up',
  'trophy', 'users', 'zap',
];

describe('badgeIcon', () => {
  // Liste extraite du vrai glyphmap Ionicons (cf. vérification à l'écriture) :
  // `Ionicons.glyphMap` n'est pas exposé sous le mock de test.
  const IONICONS = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');

  it.each(BACKEND_ICONS)('« %s » donne un glyphe Ionicons valide', (name) => {
    expect(badgeIcon(name) in IONICONS).toBe(true);
  });

  it('retombe sur `ribbon` pour un nom inconnu', () => {
    // Un nouveau badge créé en admin ne doit pas casser l'écran.
    expect(badgeIcon('totalement-inconnu')).toBe('ribbon');
    expect(badgeIcon(null)).toBe('ribbon');
    expect(badgeIcon(undefined)).toBe('ribbon');
  });

  it('accepte un nom déjà Ionicons sans le traduire', () => {
    expect(badgeIcon('rocket')).toBe('rocket');
  });
});
