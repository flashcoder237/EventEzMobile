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

/**
 * Couleur propre au badge : `Badge.color` est saisi en admin et exposé par
 * l'API, mais l'écran l'ignorait au profit d'un violet uniforme — toute la
 * collection se ressemblait.
 */
import { badgeAccent, shadeColor } from '../GamificationScreen';

// Valeurs réellement en base.
const BACKEND_COLORS = [
  '#EAB308', '#A855F7', '#F59E0B', '#8B5CF6', '#3B82F6', '#10B981',
  '#06B6D4', '#14B8A6', '#EC4899', '#7C3AED', '#D946EF', '#F97316', '#EF4444',
];

describe('badgeAccent', () => {
  it.each(BACKEND_COLORS)('accepte la couleur « %s »', (c) => {
    expect(badgeAccent(c, '#4F46E5')).toBe(c);
  });

  it('retombe sur la couleur par défaut si la valeur est inexploitable', () => {
    // Un `color` vide ou malformé produirait un dégradé cassé : `NaN` dans
    // LinearGradient fige le rendu natif.
    for (const bad of ['', '  ', 'rouge', '#GGG', '#12345', null, undefined]) {
      expect(badgeAccent(bad as any, '#4F46E5')).toBe('#4F46E5');
    }
  });
});

describe('shadeColor', () => {
  it.each(BACKEND_COLORS)('produit un hex valide depuis « %s »', (c) => {
    expect(shadeColor(c, -28)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('assombrit et éclaircit sans déborder', () => {
    expect(shadeColor('#000000', -50)).toBe('#000000'); // pas de valeur négative
    expect(shadeColor('#ffffff', 50)).toBe('#ffffff');  // pas au-delà de 255
  });
});
