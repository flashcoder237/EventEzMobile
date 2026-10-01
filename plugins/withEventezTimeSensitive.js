/**
 * withEventezTimeSensitive — X5 : notifications « Urgentes » iOS 15+.
 *
 * Le backend envoie déjà `interruptionLevel: "time-sensitive"` pour les
 * rappels de dernière minute (portes ouvertes, événement annulé…). Sans cet
 * entitlement, iOS les rétrograde silencieusement en « actives ».
 *
 * OPT-IN : appliqué si EVENTEZ_IOS_TIME_SENSITIVE=1. EAS active la capability
 * « Time Sensitive Notifications » sur l'App ID au build (synchronisation des
 * capabilities) ; si la synchro est désactivée, l'activer à la main dans le
 * portail Apple Developer avant le build.
 */
const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withEventezTimeSensitive(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.usernotifications.time-sensitive'] = true;
    return cfg;
  });
};
