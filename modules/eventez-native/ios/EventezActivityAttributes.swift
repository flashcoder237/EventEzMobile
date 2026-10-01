// SOURCE UNIQUE des attributs de Live Activity EventEz.
//
// ActivityKit apparie l'app et l'extension widget par le NOM du type : ce
// fichier est compilé dans le module natif (app) ET copié tel quel dans
// l'extension par plugins/withEventezIosExtensions.js. Ne pas le dupliquer à
// la main — modifier ici, le plugin recopie au prebuild.
//
// Les libellés arrivent DÉJÀ traduits depuis JS (i18n FR/EN, vouvoiement) :
// l'extension n'a aucune table de traduction à maintenir.
import Foundation

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
public struct EventezActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// "countdown" (participant, avant les portes), "live" (en cours),
    /// "checkin" (organisateur, accueil en cours).
    public var phase: String
    /// Ouverture des portes, en secondes depuis 1970.
    public var doorsAt: Double?
    /// Début de l'événement, en secondes depuis 1970.
    public var startsAt: Double?
    /// Fin de l'événement, en secondes depuis 1970.
    public var endsAt: Double?
    /// Organisateur : personnes accueillies depuis ce téléphone.
    public var checkedIn: Int?
    /// Organisateur : jauge totale si connue.
    public var capacity: Int?
  }

  /// "attendee" ou "organizer".
  public var kind: String
  /// Clé stable : id d'inscription (participant) ou id d'événement (organisateur).
  public var key: String
  public var title: String
  public var venue: String?
  public var deepLink: String
  /// Libellés traduits : countdown, live, checkins, venueFallback…
  public var labels: [String: String]
}
#endif
