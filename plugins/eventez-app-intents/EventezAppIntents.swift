import AppIntents
import UIKit

/// X4 — « Montrer mon billet » : Siri, Spotlight, Raccourcis et bouton Action.
/// Ouvre l'app sur « Mes billets » via le deep link eventez://tickets (même
/// routage que les liens e-mail). Compilé dans la cible de l'APP (les
/// métadonnées App Intents ne sont extraites que de la cible principale),
/// ajouté par plugins/withEventezAppIntents.js.
@available(iOS 16.0, *)
struct ShowMyTicketIntent: AppIntent {
  static var title: LocalizedStringResource = "Montrer mon billet"
  static var description = IntentDescription("Ouvre vos billets EventEz, prêts à être scannés.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let url = URL(string: "eventez://tickets") {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

@available(iOS 16.0, *)
struct EventezAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ShowMyTicketIntent(),
      phrases: [
        "Montrer mon billet \(.applicationName)",
        "Mon billet \(.applicationName)",
        "Show my \(.applicationName) ticket",
        "Open my \(.applicationName) ticket",
      ],
      shortTitle: "Mon billet",
      systemImageName: "ticket"
    )
  }
}
