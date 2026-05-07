/**
 * Expo Config Plugin — Network Security for eventez.online
 *
 * Android : on écrit DEUX network_security_config.xml :
 *
 *   - src/main/res/xml/   → release-strict : cleartextTrafficPermitted=false
 *     pour eventez.online (bloque les downgrade attacks en prod). Aucun
 *     domaine ne peut faire du HTTP en release build.
 *
 *   - src/debug/res/xml/  → permissif : cleartext autorisé pour TOUS les
 *     domaines, pour pouvoir dialoguer avec un Metro bundler ou un Django
 *     local sur 192.168.x.x / 10.x.x.x sans avoir à lister chaque IP.
 *     Android resource merger remplace automatiquement la version main
 *     par celle-ci quand on build la variante debug.
 *
 * iOS : ATS exceptions gérées dans app.json infoPlist.
 */
const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const RELEASE_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production : HTTPS uniquement, bloque tout HTTP. Système + user CAs
         pour permettre l'inspection MitM via certificat utilisateur si besoin. -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">eventez.online</domain>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </domain-config>
</network-security-config>`;

const DEBUG_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Debug : cleartext autorisé pour TOUS les domaines. Permet à Metro
         bundler et au backend Django local (http://192.168.x.x:8000, etc.)
         de fonctionner sans devoir lister chaque IP LAN.
         CE FICHIER N'EST PAS EMBARQUÉ DANS LE RELEASE BUILD — Android
         merger remplace par src/main/ quand variant=release. -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
    <!-- eventez.online reste en HTTPS strict même en debug : on ne veut
         pas qu'un dev qui pointe son app vers la prod par mégarde fasse
         du HTTP plain qui n'aboutit pas vraiment côté serveur. -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">eventez.online</domain>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </domain-config>
</network-security-config>`;

function writeXml(dir, contents) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'network_security_config.xml'), contents);
}

function withNetworkSecurity(config) {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;
      // 1. Release config dans src/main/res/xml/ — utilisé par défaut
      writeXml(join(platformRoot, 'app', 'src', 'main', 'res', 'xml'), RELEASE_CONFIG);
      // 2. Debug override dans src/debug/res/xml/ — Android merger l'utilise
      //    automatiquement quand on build la variante debug.
      writeXml(join(platformRoot, 'app', 'src', 'debug', 'res', 'xml'), DEBUG_CONFIG);
      return config;
    },
  ]);

  // Référence dans AndroidManifest — la même pour les deux variantes,
  // c'est le file qui change selon le build type.
  config = withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application[0];
    mainApp.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });

  return config;
}

module.exports = withNetworkSecurity;
