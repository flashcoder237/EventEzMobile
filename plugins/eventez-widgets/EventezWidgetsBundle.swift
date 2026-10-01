import SwiftUI
import WidgetKit

/// Extension widget EventEz (iOS 16.2+) : widget « Prochain billet » (X3) et
/// Live Activities participant/organisateur (X1 / X14).
/// Ajoutée au projet Xcode par plugins/withEventezIosExtensions.js, uniquement
/// quand EVENTEZ_IOS_EXTENSIONS=1.
@main
struct EventezWidgetsBundle: WidgetBundle {
  var body: some Widget {
    NextTicketWidget()
    EventezLiveActivityWidget()
  }
}

/// Couleurs de marque (MOBILE_STYLE_GUIDE : primaire indigo, accent corail).
enum EventezBrand {
  static let indigo = Color(red: 79 / 255, green: 70 / 255, blue: 229 / 255)
  static let violet = Color(red: 124 / 255, green: 58 / 255, blue: 237 / 255)
  static let coral = Color(red: 1, green: 107 / 255, blue: 107 / 255)

  static var gradient: LinearGradient {
    LinearGradient(colors: [indigo, violet], startPoint: .topLeading, endPoint: .bottomTrailing)
  }
}
