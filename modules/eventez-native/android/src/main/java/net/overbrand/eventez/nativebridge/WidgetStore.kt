package net.overbrand.eventez.nativebridge

import android.content.Context
import org.json.JSONObject

/**
 * Billet partagé entre l'app (écrit depuis JS), le widget (X3) et la tuile (X11).
 * Un seul JSON en SharedPreferences privées : rien ne sort de l'appareil.
 */
data class NextTicket(
  val title: String,
  val whenLabel: String,
  val venue: String?,
  val startsAtMs: Long,
  val endsAtMs: Long,
  val deepLink: String,
  /**
   * URL du visuel de l'événement. Un AppWidget ne peut pas faire de réseau
   * dans `onUpdate` : l'image est téléchargée en tâche de fond puis mise en
   * cache (cf. WidgetImageCache). `null` = pas d'image, fond de marque seul.
   */
  val imageUrl: String?,
  val labels: Map<String, String>,
) {
  /**
   * Encore pertinent à l'instant `now` (pas terminé). Un titre vide = « aucun
   * billet » : JS écrit quand même les libellés traduits de l'état vide.
   */
  fun isRelevant(now: Long): Boolean = title.isNotBlank() && endsAtMs > now

  fun isLive(now: Long): Boolean = now in startsAtMs until endsAtMs

  fun label(key: String, fallback: String): String = labels[key]?.takeIf { it.isNotBlank() } ?: fallback
}

object WidgetStore {
  private const val PREFS = "eventez_widget"
  private const val KEY = "next_ticket"

  fun write(context: Context, json: String?) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
    if (json == null) prefs.remove(KEY) else prefs.putString(KEY, json)
    prefs.apply()
  }

  fun read(context: Context): NextTicket? {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return null
    return try {
      val o = JSONObject(raw)
      val labels = mutableMapOf<String, String>()
      o.optJSONObject("labels")?.let { l -> l.keys().forEach { k -> labels[k] = l.optString(k) } }
      NextTicket(
        title = o.optString("title"),
        whenLabel = o.optString("whenLabel"),
        venue = o.optString("venue").takeIf { it.isNotBlank() },
        startsAtMs = o.optLong("startsAt"),
        endsAtMs = o.optLong("endsAt"),
        deepLink = o.optString("deepLink", "eventez://tickets"),
        imageUrl = o.optString("imageUrl").takeIf { it.isNotBlank() },
        labels = labels,
      )
    } catch (_: Exception) {
      null
    }
  }
}
