/**
 * Zone sûre des modales — garde-fou contre la régression.
 *
 * CAS RÉEL : la modale des préférences de notification s'affichait SOUS la
 * barre d'état Android — son en-tête « NOTIFICATIONS · EVENT » se
 * superposait à l'heure, et son bouton d'enregistrement passait sous la
 * barre de navigation.
 *
 * `presentationStyle="pageSheet"` n'a AUCUN effet sur Android : la modale
 * s'ouvre plein écran. Seuls `useSafeAreaInsets()`, `SafeAreaView` ou le
 * wrapper maison `EditorialCanvas` protègent réellement les bords.
 *
 * Ce test lit les fichiers source : il attrape la régression au moment où
 * quelqu'un ajoute une modale plein écran sans zone sûre, ou revient à un
 * padding en dur.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

/** Le fichier gère-t-il la zone sûre d'une manière ou d'une autre ? */
function handlesSafeArea(src: string): boolean {
  return (
    /insets\.(top|bottom)/.test(src) ||
    /<SafeAreaView/.test(src) ||
    /EditorialCanvas/.test(src)
  );
}

describe('modales plein écran', () => {
  // `presentationStyle` n'existe que sur iOS : toute modale qui l'emploie
  // s'ouvre plein écran sur Android et DOIT gérer ses bords.
  const FULLSCREEN_MODALS = [
    'components/common/FollowUserButton.tsx',
    'components/common/MapPickerModal.tsx',
    'components/common/SearchableSelectModal.tsx',
    'components/events/FollowEventButton.tsx',
    'screens/events/MapScreen.tsx',
  ];

  it.each(FULLSCREEN_MODALS)('%s gère la zone sûre', (rel) => {
    expect(handlesSafeArea(read(rel))).toBe(true);
  });
});

describe('modales corrigées — bords protégés', () => {
  // Feuilles ancrées en bas dont un bouton d'action touchait la barre de
  // navigation : le padding en dur (16–24 dp) ne couvre pas les ~48 dp
  // d'une navigation à trois boutons.
  const BOTTOM_ANCHORED = [
    'screens/scan/ScanScreen.tsx',
    'screens/organizer/QRScannerScreen.tsx',
    'screens/organizer/EventRegistrationsScreen.tsx',
    'screens/organizer/WalletScreen.tsx',
    'screens/organizer/TeamManagementScreen.tsx',
    'components/messages/GroupAdminPanel.tsx',
    'screens/organizer/WeddingGiftsManageScreen.tsx',
    'screens/organizer/WeddingTablesManageScreen.tsx',
    'screens/organizer/WeddingGuestsManageScreen.tsx',
    'components/events/AddToCalendarButton.tsx',
    'components/organizer/EventDocumentsButton.tsx',
  ];

  it.each(BOTTOM_ANCHORED)('%s applique insets.bottom', (rel) => {
    expect(/insets\.bottom/.test(read(rel))).toBe(true);
  });
});

describe('pas de nombre magique en guise de zone sûre', () => {
  it('la galerie médias utilise insets.top, pas une valeur approximative', () => {
    const src = read('screens/messages/ConversationScreen.tsx');
    // Le style portait `paddingTop: 44, // safe area approximative` — un
    // nombre qui ne correspond à aucun appareil réel.
    expect(src).not.toContain('safe area approximative');
    expect(src).toMatch(/mediaGalleryCard[\s\S]{0,400}?paddingTop: insets\.top/);
  });

  it('la croix de zoom KYC suit l inset, pas un top fixe', () => {
    const src = read('screens/profile/VerificationScreen.tsx');
    expect(src).toMatch(/zoomCloseBtn[\s\S]{0,200}?top: insets\.top/);
  });
});

describe('cartes centrées bornées par précaution', () => {
  // Ces deux cartes n'avaient ni hauteur maximale ni défilement, alors
  // qu'elles contiennent plusieurs champs de saisie. Clavier ouvert ou
  // grande taille de police, elles pouvaient déborder le padding du fond
  // et mordre les barres système. Aucun cas observé — borne préventive.
  const BOUNDED_CARDS: Array<[string, string]> = [
    ['screens/auth/LoginScreen.tsx', 'guestModalCard'],
    ['screens/payment/PaymentSuccessScreen.tsx', 'upgradeCard'],
  ];

  it.each(BOUNDED_CARDS)('%s : %s a une hauteur maximale', (rel, styleName) => {
    const src = read(rel);
    // La borne doit suivre la déclaration du style, pas exister ailleurs
    // dans le fichier : on lit la fenêtre qui suit la déclaration.
    const start = src.indexOf(`${styleName}: {`);
    expect(start).toBeGreaterThan(-1);
    expect(src.slice(start, start + 500)).toContain('maxHeight');
  });

  it.each(BOUNDED_CARDS)('%s : le contenu de %s défile', (rel) => {
    // Une hauteur maximale SANS défilement tronquerait le contenu au lieu
    // de le rendre atteignable — le remède serait pire que le mal.
    expect(read(rel)).toContain('<ScrollView');
  });
});
