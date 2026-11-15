/**
 * Configuration reseau Android — garde-fou contre la regression.
 *
 * Faille (audit securite 2026-11, severite MOYENNE) :
 * mobile/android/release-network-config-trusts-user-ca
 *
 * `RELEASE_CONFIG` listait `<certificates src="user" />` dans les
 * trust-anchors du domaine de production, et le commentaire presentait
 * l'inspection MitM comme un objectif de production.
 *
 * Depuis Android 7 (API 24), une application ne fait PLUS confiance aux
 * autorites installees par l'utilisateur, precisement pour que l'interception
 * du trafic demande un appareil roote. Reintroduire l'ancre « user »
 * annulait cette protection sur le domaine qui porte les JWT : une autorite
 * installee sur le telephone — profil d'entreprise, proxy d'un Wi-Fi public,
 * logiciel indesirable — suffisait a lire ET modifier l'integralite des
 * echanges avec l'API, jetons d'authentification compris.
 *
 * Aucun epinglage de certificat n'existe ailleurs dans le depot pour
 * compenser (verifie).
 *
 * `RELEASE_CONFIG` est bien l'artefact ecrit dans
 * `app/src/main/res/xml` — le defaut du resource-merger pour la variante
 * release. Le plugin est enregistre dans app.json et regenere a chaque
 * prebuild, donc corriger le plugin suffit : l'arbre `android/` est ignore
 * par git.
 *
 * On lit la source du plugin : c'est une constante, donc c'est la que le
 * defaut vit, et c'est la que la regression reviendrait.
 */
import * as fs from 'fs';
import * as path from 'path';

const PLUGIN = path.join(__dirname, '..', '..', 'plugins', 'withNetworkSecurity.js');

function pluginSource(): string {
  return fs.readFileSync(PLUGIN, 'utf8');
}

/** Extrait le corps d'une des deux constantes de configuration. */
function configBlock(name: 'RELEASE_CONFIG' | 'DEBUG_CONFIG'): string {
  const src = pluginSource();
  const start = src.indexOf(`const ${name} = \``);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('`;', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

/** Les lignes de code, commentaires XML retires. */
function withoutComments(block: string): string {
  return block.replace(/<!--[\s\S]*?-->/g, '');
}

describe('configuration release Android', () => {
  it('ne fait PAS confiance aux autorites installees par l utilisateur', () => {
    const block = withoutComments(configBlock('RELEASE_CONFIG'));
    expect(block).not.toContain('src="user"');
  });

  it('fait confiance aux autorites systeme', () => {
    // Contre-epreuve : retirer l'ancre « user » ne doit pas avoir retire
    // l'ancre systeme au passage — l'application ne se connecterait plus.
    const block = withoutComments(configBlock('RELEASE_CONFIG'));
    expect(block).toContain('src="system"');
  });

  it('bloque toujours le trafic en clair', () => {
    const block = withoutComments(configBlock('RELEASE_CONFIG'));
    expect(block).toContain('cleartextTrafficPermitted="false"');
  });

  it('couvre bien le domaine de production et ses sous-domaines', () => {
    const block = withoutComments(configBlock('RELEASE_CONFIG'));
    expect(block).toContain('eventez.online');
    expect(block).toContain('includeSubdomains="true"');
  });
});

describe('configuration debug Android', () => {
  it('garde l ancre utilisateur : c est la sa place', () => {
    // L'inspection MitM reste legitime en developpement. Le correctif ne
    // doit pas la supprimer partout, seulement la sortir de la production.
    const block = withoutComments(configBlock('DEBUG_CONFIG'));
    expect(block).toContain('src="user"');
  });
});

describe('le plugin reste branche', () => {
  it('est enregistre dans app.json', () => {
    // Si le plugin est deconnecte, la configuration n'est plus generee du
    // tout et Android retombe sur ses defauts — ce test le signale.
    const appJson = fs.readFileSync(
      path.join(__dirname, '..', '..', 'app.json'), 'utf8',
    );
    expect(appJson).toContain('withNetworkSecurity');
  });

  it('ecrit la config release dans src/main/res/xml', () => {
    // C'est l'emplacement que le resource-merger utilise pour la variante
    // release. L'ecrire ailleurs rendrait le correctif inoperant.
    const src = pluginSource();
    expect(src).toMatch(/'app',\s*'src',\s*'main',\s*'res',\s*'xml'/);
  });
});
