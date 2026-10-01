import SwiftUI
import WidgetKit

/// X3 — Widget « Prochain billet ». Données écrites par l'app dans l'App Group
/// (clé `nextTicket`, JSON produit par src/lib/native/nextTicket.ts).
struct NextTicketPayload: Decodable {
  let registrationId: String?
  let title: String
  let whenLabel: String
  let venue: String?
  /// Millisecondes depuis 1970 (format JS).
  let startsAt: Double
  let endsAt: Double
  let deepLink: String
  let labels: [String: String]?

  var startDate: Date { Date(timeIntervalSince1970: startsAt / 1000) }
  var endDate: Date { Date(timeIntervalSince1970: endsAt / 1000) }

  func label(_ key: String, _ fallback: String) -> String {
    if let value = labels?[key], !value.isEmpty { return value }
    return fallback
  }
}

struct NextTicketEntry: TimelineEntry {
  let date: Date
  /// Toujours présent quand l'app a écrit quelque chose : porte les libellés
  /// traduits même quand il n'y a plus de billet (titre vide).
  let payload: NextTicketPayload?

  /// Le billet à afficher, s'il est encore d'actualité à `date`.
  var ticket: NextTicketPayload? {
    guard let payload = payload, !payload.title.isEmpty, payload.endDate > date else { return nil }
    return payload
  }

  func label(_ key: String, _ fallback: String) -> String {
    payload?.label(key, fallback) ?? fallback
  }
}

struct NextTicketProvider: TimelineProvider {
  private func load() -> NextTicketPayload? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "EventezAppGroup") as? String,
          let defaults = UserDefaults(suiteName: group),
          let json = defaults.string(forKey: "nextTicket"),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(NextTicketPayload.self, from: data)
  }

  func placeholder(in context: Context) -> NextTicketEntry {
    NextTicketEntry(date: Date(), payload: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (NextTicketEntry) -> Void) {
    completion(NextTicketEntry(date: Date(), payload: load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<NextTicketEntry>) -> Void) {
    let now = Date()
    let payload = load()
    guard let ticket = payload, !ticket.title.isEmpty, ticket.endDate > now else {
      completion(Timeline(entries: [NextTicketEntry(date: now, payload: payload)], policy: .never))
      return
    }
    // Trois états datés : avant, pendant (« En cours »), après (vide). Le
    // système bascule seul, sans réveiller l'app.
    var entries = [NextTicketEntry(date: now, payload: ticket)]
    if ticket.startDate > now {
      entries.append(NextTicketEntry(date: ticket.startDate, payload: ticket))
    }
    entries.append(NextTicketEntry(date: ticket.endDate, payload: ticket))
    completion(Timeline(entries: entries, policy: .never))
  }
}

struct NextTicketWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: NextTicketEntry

  private var isLive: Bool {
    guard let ticket = entry.ticket else { return false }
    return entry.date >= ticket.startDate && entry.date < ticket.endDate
  }

  var body: some View {
    content
      .widgetURL(URL(string: entry.ticket?.deepLink ?? "eventez://tickets"))
      .modifier(EventezWidgetBackground())
  }

  @ViewBuilder
  private var content: some View {
    switch family {
    case .accessoryInline:
      if let ticket = entry.ticket {
        Text(isLive ? "\(ticket.label("live", "En cours")) · \(ticket.title)" : "\(ticket.title) · \(ticket.whenLabel)")
      } else {
        Text("EventEz")
      }
    case .accessoryRectangular:
      if let ticket = entry.ticket {
        VStack(alignment: .leading, spacing: 1) {
          Text(ticket.title).font(.headline).lineLimit(1)
          if isLive {
            Text(ticket.label("live", "En cours")).font(.caption)
          } else {
            Text(ticket.startDate, style: .relative).font(.caption).monospacedDigit()
          }
          if let venue = ticket.venue { Text(venue).font(.caption2).lineLimit(1) }
        }
      } else {
        Text(entry.label("empty", "Aucun billet à venir")).font(.caption)
      }
    default:
      homeScreen
    }
  }

  private var homeScreen: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 5) {
        Image(systemName: "ticket.fill").font(.caption2)
        Text(entry.label("header", "Prochain billet").uppercased())
          .font(.caption2.weight(.semibold))
          .tracking(0.6)
      }
      .foregroundStyle(.white.opacity(0.8))

      if let ticket = entry.ticket {
        Text(ticket.title)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(family == .systemSmall ? 3 : 2)
        Spacer(minLength: 0)
        if isLive {
          Label(ticket.label("live", "En cours"), systemImage: "dot.radiowaves.left.and.right")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
        } else {
          Text(ticket.whenLabel).font(.subheadline).foregroundStyle(.white)
          Text(ticket.startDate, style: .relative)
            .font(.caption.monospacedDigit())
            .foregroundStyle(.white.opacity(0.8))
        }
        if let venue = ticket.venue, family != .systemSmall {
          Text(venue).font(.caption).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
        }
      } else {
        Spacer(minLength: 0)
        Text(entry.label("empty", "Aucun billet à venir"))
          .font(.subheadline)
          .foregroundStyle(.white.opacity(0.9))
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

/// iOS 17 exige `containerBackground` ; iOS 16 garde le fond classique.
struct EventezWidgetBackground: ViewModifier {
  @Environment(\.widgetFamily) private var family

  @ViewBuilder
  func body(content: Content) -> some View {
    let isAccessory = family == .accessoryInline || family == .accessoryRectangular || family == .accessoryCircular
    if #available(iOS 17.0, *) {
      if isAccessory {
        content.containerBackground(for: .widget) { Color.clear }
      } else {
        content.containerBackground(for: .widget) { EventezBrand.gradient }
      }
    } else if isAccessory {
      content
    } else {
      content.padding().background(EventezBrand.gradient)
    }
  }
}

struct NextTicketWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "EventezNextTicket", provider: NextTicketProvider()) { entry in
      NextTicketWidgetView(entry: entry)
    }
    .configurationDisplayName("Prochain billet")
    .description("Votre prochain événement, d’un coup d’œil.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
  }
}
