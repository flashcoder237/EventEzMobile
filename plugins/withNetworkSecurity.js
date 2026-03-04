/**
 * Expo Config Plugin — Network Security for eventez.online
 *
 * Android: Creates network_security_config.xml that trusts system + user CAs
 * iOS: ATS exceptions are handled in app.json infoPlist
 */
const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

function withNetworkSecurity(config) {
  // Step 1: Create network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );

      if (!existsSync(resXmlDir)) {
        mkdirSync(resXmlDir, { recursive: true });
      }

      const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Trust system + user certificates for eventez.online -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">eventez.online</domain>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </domain-config>
</network-security-config>`;

      writeFileSync(join(resXmlDir, 'network_security_config.xml'), xml);
      return config;
    }
  ]);

  // Step 2: Reference in AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application[0];
    mainApp.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });

  return config;
}

module.exports = withNetworkSecurity;
