/**
 * Capture caméra/micro en WebView — garde-fou contre la régression.
 *
 * Faille (audit sécurité 2026-11, sévérité ÉLEVÉE) : `WebViewScreen`, le
 * navigateur in-app GÉNÉRIQUE, portait `mediaCapturePermissionGrantType="grant"`
 * en prop STATIQUE. Il accordait donc caméra et micro à n'importe quelle URL
 * fournie par un organisateur, sans la moindre validation d'origine — ni au
 * premier chargement, ni aux navigations suivantes.
 *
 * Les 5 appelants de cet écran passent tous un lien TIERS : site d'un sponsor,
 * d'un intervenant, `session.virtual_link`, ressource de session. Aucun ne
 * passe `roomId`, et tous les chemins visio EventEz passent par `startCall`
 * → `VisioCallOverlay`, dont l'URL est construite par le SERVEUR.
 *
 * Le piège à ne pas refaire : conditionner le grant sur `isVisio`. Cette
 * fonction est un test de SOUS-CHAÎNE (/jitsi|8x8\.vc|jaas|\bjwt=/) qu'une URL
 * attaquante satisfait trivialement — un `?jwt=` suffit. Ce n'est pas un test
 * de confiance, et ce test l'affirme explicitement.
 *
 * Et `"grant"` est précisément le mode de react-native-webview qui ne compare
 * AUCUNE origine ; `grantIfSameHostElsePrompt` existe et compare l'origine
 * demandeuse à l'hôte chargé.
 *
 * On lit la source : la prop est statique, donc c'est là que le défaut vit, et
 * rendre cet écran exigerait de mocker une dizaine de dépendances sans rien
 * prouver de plus.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const GENERIC_BROWSER = 'screens/common/WebViewScreen.tsx';
const VISIO_OVERLAY = 'components/visio/VisioCallOverlay.tsx';

/** Extrait la valeur de `mediaCapturePermissionGrantType` d'un source. */
function grantModes(src: string): string[] {
  return Array.from(
    src.matchAll(/mediaCapturePermissionGrantType=["{]\s*["']?([a-zA-Z]+)/g),
    (m) => m[1],
  );
}

describe('navigateur in-app générique (liens tiers)', () => {
  const src = read(GENERIC_BROWSER);

  it("n'accorde PAS la capture média", () => {
    const modes = grantModes(src);
    expect(modes.length).toBeGreaterThan(0); // la prop doit rester explicite
    for (const mode of modes) {
      expect(mode).not.toBe('grant');
    }
    expect(modes).toContain('deny');
  });

  it('ne fait pas dépendre le grant de l’heuristique `isVisio`', () => {
    // `isVisioUrl` est un test de sous-chaîne, pas un test de confiance :
    // s'en servir pour accorder la capture rouvrirait la faille.
    const grantLine = src
      .split('\n')
      .find((l) => l.includes('mediaCapturePermissionGrantType'));
    expect(grantLine).toBeDefined();
    expect(grantLine).not.toMatch(/isVisio/);
  });

  it('borne le schéma à chaque navigation (pas seulement au 1er chargement)', () => {
    // Sans ce garde, une page tierce pouvait rediriger vers un schéma qui
    // sort du web et atteint l'OS (intent://, file://, tel:, javascript:).
    expect(src).toMatch(/onShouldStartLoadWithRequest/);
    // Le garde doit tester le schéma de `req.url`, pas autre chose.
    expect(src).toMatch(/\^https\?:/);
    expect(src).toMatch(/test\(req\.url\)/);
  });

  it('laisse passer http ET https', () => {
    // Les appelants normalisent avec `startsWith('http')` : un lien saisi en
    // http par un organisateur arrive tel quel. Le refuser casserait ces
    // liens en silence — ce n'est pas ce que corrige ce correctif.
    const guard = src.match(/onShouldStartLoadWithRequest[\s\S]{0,400}?\n\s{8}\}\}/);
    expect(guard).not.toBeNull();
    expect(guard![0]).toMatch(/https\?/);
  });
});

describe('overlay visio (URL construite par le serveur)', () => {
  it('conserve le grant : c’est le chemin first-party', () => {
    // Contre-épreuve du correctif : on ne doit PAS avoir cassé la visio
    // légitime. `VisioCallOverlay` charge `call.url`, alimentée par la
    // réponse serveur (VideoProviderConfig + JWT), jamais par une saisie
    // d'organisateur.
    expect(grantModes(read(VISIO_OVERLAY))).toContain('grant');
  });
});

describe('aucun autre écran n’accorde la capture', () => {
  it('seul l’overlay visio porte un grant', () => {
    // Attrape le cas où un nouvel écran copierait les props de l'ancien
    // WebViewScreen, grant inclus.
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          if (grantModes(content).includes('grant')) {
            offenders.push(path.relative(SRC, full).replace(/\\/g, '/'));
          }
        }
      }
    };
    walk(SRC);

    expect(offenders).toEqual([VISIO_OVERLAY]);
  });
});
