import ActivityKit
import SwiftUI
import WidgetKit

/// X1 (participant) et X14 (organisateur) — une seule configuration, deux rendus.
///
/// Participant : compte à rebours jusqu'à l'ouverture des portes, puis « En
/// cours ». La bascule se fait SANS l'app : `staleDate` = ouverture des
/// portes, et la vue lit `context.isStale` (iOS 16.2+).
/// Organisateur : compteur d'accueil (personnes scannées depuis ce téléphone),
/// mis à jour par l'app à chaque scan.
struct EventezLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: EventezActivityAttributes.self) { context in
      EventezActivityLockScreen(context: context)
        .activityBackgroundTint(EventezBrand.indigo.opacity(0.92))
        .activitySystemActionForegroundColor(.white)
        .widgetURL(URL(string: context.attributes.deepLink))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: context.attributes.kind == "organizer" ? "person.crop.circle.badge.checkmark" : "ticket.fill")
            .font(.title2)
            .foregroundStyle(EventezBrand.coral)
        }
        DynamicIslandExpandedRegion(.trailing) {
          EventezActivityValue(context: context).font(.title3.monospacedDigit())
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.title).font(.headline).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          EventezActivityCaption(context: context).font(.caption).foregroundStyle(.secondary)
        }
      } compactLeading: {
        Image(systemName: context.attributes.kind == "organizer" ? "person.2.fill" : "ticket.fill")
          .foregroundStyle(EventezBrand.coral)
      } compactTrailing: {
        EventezActivityValue(context: context)
          .monospacedDigit()
          .frame(maxWidth: 56)
      } minimal: {
        Image(systemName: context.attributes.kind == "organizer" ? "person.2.fill" : "ticket.fill")
          .foregroundStyle(EventezBrand.coral)
      }
      .widgetURL(URL(string: context.attributes.deepLink))
      .keylineTint(EventezBrand.coral)
    }
  }
}

private func label(_ context: ActivityViewContext<EventezActivityAttributes>, _ key: String, _ fallback: String) -> String {
  if let value = context.attributes.labels[key], !value.isEmpty { return value }
  return fallback
}

private func date(_ seconds: Double?) -> Date? {
  guard let seconds = seconds, seconds > 0 else { return nil }
  return Date(timeIntervalSince1970: seconds)
}

/// Participant : avant les portes ? (sinon « En cours »).
private func isBeforeDoors(_ context: ActivityViewContext<EventezActivityAttributes>) -> Bool {
  guard context.state.phase == "countdown", let doors = date(context.state.doorsAt) else { return false }
  return !context.isStale && doors > Date()
}

/// Valeur courte : minuteur, « En cours » ou compteur d'accueil.
struct EventezActivityValue: View {
  let context: ActivityViewContext<EventezActivityAttributes>

  var body: some View {
    if context.attributes.kind == "organizer" {
      Text("\(context.state.checkedIn ?? 0)")
    } else if isBeforeDoors(context), let doors = date(context.state.doorsAt) {
      Text(timerInterval: Date()...doors, countsDown: true)
    } else {
      Text(label(context, "liveShort", "Live"))
    }
  }
}

/// Légende : « Ouverture des portes dans… », « Portes ouvertes · en cours »,
/// « accueillis depuis ce téléphone ».
struct EventezActivityCaption: View {
  let context: ActivityViewContext<EventezActivityAttributes>

  var body: some View {
    if context.attributes.kind == "organizer" {
      if let capacity = context.state.capacity, capacity > 0 {
        Text("\(context.state.checkedIn ?? 0) / \(capacity) · \(label(context, "checkins", "accueillis"))")
      } else {
        Text(label(context, "checkins", "accueillis depuis ce téléphone"))
      }
    } else if isBeforeDoors(context) {
      Text(label(context, "countdown", "Ouverture des portes dans"))
    } else {
      Text(label(context, "live", "Portes ouvertes · en cours"))
    }
  }
}

struct EventezActivityLockScreen: View {
  let context: ActivityViewContext<EventezActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        Image(systemName: context.attributes.kind == "organizer" ? "person.crop.circle.badge.checkmark" : "ticket.fill")
          .foregroundStyle(EventezBrand.coral)
        Text(context.attributes.title)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(1)
      }
      HStack(alignment: .firstTextBaseline) {
        EventezActivityCaption(context: context)
          .font(.subheadline)
          .foregroundStyle(.white.opacity(0.85))
        Spacer()
        EventezActivityValue(context: context)
          .font(.title2.weight(.semibold).monospacedDigit())
          .foregroundStyle(.white)
      }
      if context.attributes.kind == "organizer",
         let capacity = context.state.capacity, capacity > 0 {
        ProgressView(value: Double(min(context.state.checkedIn ?? 0, capacity)), total: Double(capacity))
          .tint(EventezBrand.coral)
      } else if let venue = context.attributes.venue, !venue.isEmpty {
        Text(venue).font(.caption).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
      }
    }
    .padding(16)
  }
}
