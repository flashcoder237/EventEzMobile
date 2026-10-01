import CoreHaptics

/// H6 — Motifs Core Haptics. Mêmes noms et même intention que
/// `haptics.pattern` côté JS (repli Android / iPhone sans moteur haptique),
/// mais avec ce que seul Core Haptics sait faire : intensité et netteté
/// (« sharpness ») réglées pas à pas, enveloppes continues.
///
/// Règle de dosage : tout reste court (< 700 ms) et sous 0,9 d'intensité,
/// sauf `celebrate`, réservé au paiement et au scan validé.
enum EventezHapticPatterns {
  static func events(named name: String) -> [CHHapticEvent]? {
    switch name {
    case "heartbeat":
      // « Lub-dub » : un battement plein puis un écho plus doux.
      return [
        transient(at: 0, intensity: 0.85, sharpness: 0.25),
        transient(at: 0.14, intensity: 0.45, sharpness: 0.15),
      ]
    case "doors":
      // Portes ouvertes : deux battements de cœur, le second plus ample.
      return [
        transient(at: 0, intensity: 0.7, sharpness: 0.25),
        transient(at: 0.14, intensity: 0.35, sharpness: 0.15),
        transient(at: 0.55, intensity: 0.9, sharpness: 0.3),
        transient(at: 0.69, intensity: 0.45, sharpness: 0.15),
      ]
    case "rise":
      // Trois crans qui montent en intensité ET en netteté.
      return [
        transient(at: 0, intensity: 0.35, sharpness: 0.2),
        transient(at: 0.09, intensity: 0.55, sharpness: 0.45),
        transient(at: 0.18, intensity: 0.8, sharpness: 0.7),
      ]
    case "celebrate":
      // Une houle qui enfle (continu) puis trois étincelles nettes.
      return [
        continuous(at: 0, duration: 0.28, intensity: 0.55, sharpness: 0.2),
        transient(at: 0.3, intensity: 0.9, sharpness: 0.6),
        transient(at: 0.42, intensity: 0.55, sharpness: 0.8),
        transient(at: 0.52, intensity: 0.35, sharpness: 0.9),
      ]
    case "tick":
      return [transient(at: 0, intensity: 0.4, sharpness: 0.9)]
    case "wall":
      // Butée : un choc sourd, puis un rebond minuscule.
      return [
        transient(at: 0, intensity: 0.9, sharpness: 0.1),
        transient(at: 0.07, intensity: 0.25, sharpness: 0.1),
      ]
    default:
      return nil
    }
  }

  private static func transient(at time: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
    return CHHapticEvent(
      eventType: .hapticTransient,
      parameters: [
        CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
        CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
      ],
      relativeTime: time
    )
  }

  private static func continuous(at time: TimeInterval, duration: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
    return CHHapticEvent(
      eventType: .hapticContinuous,
      parameters: [
        CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
        CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
        CHHapticEventParameter(parameterID: .attackTime, value: Float(duration) * 0.9),
        CHHapticEventParameter(parameterID: .decayTime, value: 0.05),
      ],
      relativeTime: time,
      duration: duration
    )
  }
}
