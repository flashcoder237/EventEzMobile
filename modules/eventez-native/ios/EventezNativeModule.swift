import ExpoModulesCore
import UIKit
import CoreHaptics
#if canImport(ActivityKit)
import ActivityKit
#endif
#if canImport(WidgetKit)
import WidgetKit
#endif

/// Pont natif EventEz côté iOS. Chaque fonctionnalité se désactive d'elle-même
/// quand sa configuration manque (pas d'App Group → pas de widget ; pas de
/// NSSupportsLiveActivities → pas de Live Activity) : JS reçoit `false`/`nil`.
public class EventezNativeModule: Module {
  private var handoffActivity: NSUserActivity?
  private var proximityObserver: NSObjectProtocol?
  private var hapticEngine: CHHapticEngine?

  private static let widgetKey = "nextTicket"

  public func definition() -> ModuleDefinition {
    Name("EventezNative")

    Events("onProximityChange", "onShareIntent")

    OnDestroy {
      self.stopProximity()
      self.hapticEngine?.stop(completionHandler: nil)
    }

    // ── Widgets (X3) ──────────────────────────────────────────────────────
    Function("appGroupAvailable") { () -> Bool in
      return self.sharedDefaults() != nil
    }

    Function("setWidgetData") { (json: String?) -> Bool in
      guard let defaults = self.sharedDefaults() else { return false }
      if let json = json {
        defaults.set(json, forKey: Self.widgetKey)
      } else {
        defaults.removeObject(forKey: Self.widgetKey)
      }
      #if canImport(WidgetKit)
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      #endif
      return true
    }

    // ── Live Activities (X1 / X14) ────────────────────────────────────────
    Function("liveActivitiesEnabled") { () -> Bool in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      #endif
      return false
    }

    AsyncFunction("startLiveActivity") { (attributesJson: String, stateJson: String, staleDateMs: Double?) async -> String? in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        return await self.startActivity(attributesJson: attributesJson, stateJson: stateJson, staleDateMs: staleDateMs)
      }
      #endif
      return nil
    }

    AsyncFunction("updateLiveActivity") { (key: String, stateJson: String, staleDateMs: Double?) async -> Bool in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        return await self.updateActivity(key: key, stateJson: stateJson, staleDateMs: staleDateMs)
      }
      #endif
      return false
    }

    AsyncFunction("endLiveActivity") { (key: String, dismissImmediately: Bool) async -> Bool in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        return await self.endActivity(key: key, dismissImmediately: dismissImmediately)
      }
      #endif
      return false
    }

    Function("listLiveActivities") { () -> [String] in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        return Activity<EventezActivityAttributes>.activities
          .filter { $0.activityState == .active || $0.activityState == .stale }
          .map { $0.attributes.key }
      }
      #endif
      return []
    }

    // ── Handoff (X13) ─────────────────────────────────────────────────────
    Function("setHandoff") { (url: String, title: String?) in
      DispatchQueue.main.async {
        guard let webURL = URL(string: url) else { return }
        let activity = self.handoffActivity ?? NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
        activity.webpageURL = webURL
        activity.title = title
        activity.isEligibleForHandoff = true
        activity.isEligibleForSearch = false
        activity.becomeCurrent()
        self.handoffActivity = activity
      }
    }

    Function("clearHandoff") {
      DispatchQueue.main.async {
        self.handoffActivity?.invalidate()
        self.handoffActivity = nil
      }
    }

    // ── Proximité (G10) ───────────────────────────────────────────────────
    AsyncFunction("setProximityMonitoring") { (enabled: Bool) -> Bool in
      if enabled {
        return self.startProximity()
      }
      self.stopProximity()
      return true
    }.runOnQueue(.main)

    // ── Core Haptics (H6) ─────────────────────────────────────────────────
    Function("supportsRichHaptics") { () -> Bool in
      return CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    AsyncFunction("playHaptic") { (name: String) -> Bool in
      return self.playHaptic(named: name)
    }.runOnQueue(.main)

    // ── Partage entrant : Android uniquement ──────────────────────────────
    Function("consumeSharedText") { () -> String? in
      return nil
    }
  }

  // MARK: - App Group

  private func sharedDefaults() -> UserDefaults? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "EventezAppGroup") as? String,
          !group.isEmpty else { return nil }
    return UserDefaults(suiteName: group)
  }

  // MARK: - Live Activities

  #if canImport(ActivityKit)
  @available(iOS 16.2, *)
  private func decodeState(_ json: String) -> EventezActivityAttributes.ContentState? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(EventezActivityAttributes.ContentState.self, from: data)
  }

  @available(iOS 16.2, *)
  private func staleDate(_ ms: Double?) -> Date? {
    guard let ms = ms, ms > 0 else { return nil }
    return Date(timeIntervalSince1970: ms / 1000)
  }

  @available(iOS 16.2, *)
  private func activity(forKey key: String) -> Activity<EventezActivityAttributes>? {
    return Activity<EventezActivityAttributes>.activities.first {
      $0.attributes.key == key && ($0.activityState == .active || $0.activityState == .stale)
    }
  }

  @available(iOS 16.2, *)
  private func startActivity(attributesJson: String, stateJson: String, staleDateMs: Double?) async -> String? {
    guard ActivityAuthorizationInfo().areActivitiesEnabled,
          let data = attributesJson.data(using: .utf8),
          let attributes = try? JSONDecoder().decode(EventezActivityAttributes.self, from: data),
          let state = decodeState(stateJson) else { return nil }
    let content = ActivityContent(state: state, staleDate: staleDate(staleDateMs))
    // Jamais deux activités pour la même clé : on met à jour l'existante.
    if let existing = activity(forKey: attributes.key) {
      await existing.update(content)
      return existing.id
    }
    do {
      let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
      return activity.id
    } catch {
      // NSSupportsLiveActivities absent, quota atteint, app en arrière-plan…
      return nil
    }
  }

  @available(iOS 16.2, *)
  private func updateActivity(key: String, stateJson: String, staleDateMs: Double?) async -> Bool {
    guard let activity = activity(forKey: key), let state = decodeState(stateJson) else { return false }
    await activity.update(ActivityContent(state: state, staleDate: staleDate(staleDateMs)))
    return true
  }

  @available(iOS 16.2, *)
  private func endActivity(key: String, dismissImmediately: Bool) async -> Bool {
    let matches = Activity<EventezActivityAttributes>.activities.filter { $0.attributes.key == key }
    guard !matches.isEmpty else { return false }
    for activity in matches {
      await activity.end(nil, dismissalPolicy: dismissImmediately ? .immediate : .default)
    }
    return true
  }
  #endif

  // MARK: - Proximité

  private func startProximity() -> Bool {
    let device = UIDevice.current
    device.isProximityMonitoringEnabled = true
    // Sans capteur (iPad, simulateur), iOS laisse la propriété à false.
    guard device.isProximityMonitoringEnabled else { return false }
    if proximityObserver == nil {
      proximityObserver = NotificationCenter.default.addObserver(
        forName: UIDevice.proximityStateDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onProximityChange", ["near": UIDevice.current.proximityState])
      }
    }
    return true
  }

  private func stopProximity() {
    if let observer = proximityObserver {
      NotificationCenter.default.removeObserver(observer)
      proximityObserver = nil
    }
    DispatchQueue.main.async {
      UIDevice.current.isProximityMonitoringEnabled = false
    }
  }

  // MARK: - Core Haptics

  private func engine() throws -> CHHapticEngine {
    if let engine = hapticEngine { return engine }
    let engine = try CHHapticEngine()
    engine.isAutoShutdownEnabled = true
    engine.playsHapticsOnly = true
    engine.resetHandler = { [weak self] in
      try? self?.hapticEngine?.start()
    }
    engine.stoppedHandler = { [weak self] _ in
      // Moteur arrêté par le système (app en arrière-plan, appel…) : on le
      // recrée au prochain motif plutôt que de garder une instance morte.
      self?.hapticEngine = nil
    }
    try engine.start()
    hapticEngine = engine
    return engine
  }

  private func playHaptic(named name: String) -> Bool {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics,
          let events = EventezHapticPatterns.events(named: name) else { return false }
    do {
      let pattern = try CHHapticPattern(events: events, parameters: [])
      let player = try engine().makePlayer(with: pattern)
      try player.start(atTime: CHHapticTimeImmediate)
      return true
    } catch {
      hapticEngine = nil
      return false
    }
  }
}
