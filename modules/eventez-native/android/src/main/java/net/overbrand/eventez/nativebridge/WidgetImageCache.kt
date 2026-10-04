package net.overbrand.eventez.nativebridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Visuel de l'événement affiché par le widget « Prochain billet ».
 *
 * Un AppWidgetProvider s'exécute dans un BroadcastReceiver : pas de réseau dans
 * `onUpdate`, et le bitmap passé aux RemoteViews traverse une transaction Binder
 * dont le quota est limité (~1 Mo en pratique, partagé par tout le widget).
 * D'où ce cache sur disque, alimenté hors du thread principal.
 *
 * Tout échec est silencieux : le widget garde son dégradé de marque, ce qui est
 * un repli acceptable — contrairement à un plantage du receiver.
 */
object WidgetImageCache {
  private const val FILE = "next_ticket_image"
  private const val PREFS = "eventez_widget"
  private const val KEY_SOURCE = "next_ticket_image_source"

  /** Au-delà, on redimensionne : une transaction Binder trop grosse tue le widget. */
  private const val MAX_WIDTH = 720
  private const val MAX_BYTES = 600 * 1024

  private val io = Executors.newSingleThreadExecutor()

  private fun file(context: Context) = File(context.filesDir, FILE)

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Bitmap en cache, ou null. Appelable depuis `onUpdate` (lecture disque seule). */
  fun load(context: Context): Bitmap? {
    val f = file(context)
    if (!f.exists()) return null
    return try {
      BitmapFactory.decodeFile(f.absolutePath)
    } catch (_: Throwable) {
      null
    }
  }

  fun clear(context: Context) {
    try {
      file(context).delete()
    } catch (_: Throwable) {
    }
    prefs(context).edit().remove(KEY_SOURCE).apply()
  }

  /**
   * Met le cache à jour pour `url`, puis redemande un rendu du widget.
   *
   * Ne retélécharge pas si l'URL est déjà celle en cache : `onUpdate` est appelé
   * souvent (changement d'heure, redimensionnement), et le billet, lui, change
   * rarement.
   */
  fun sync(context: Context, url: String?) {
    if (url.isNullOrBlank()) {
      // Sans ce nettoyage, le visuel du billet précédent resterait affiché
      // derrière le titre du nouveau.
      clear(context)
      refreshWidgets(context)
      return
    }
    val known = prefs(context).getString(KEY_SOURCE, null)
    if (known == url && file(context).exists()) return

    io.execute {
      val bitmap = download(url) ?: return@execute
      try {
        file(context).outputStream().use { out ->
          bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
        }
        prefs(context).edit().putString(KEY_SOURCE, url).apply()
        refreshWidgets(context)
      } catch (_: Throwable) {
        // Disque plein ou droit refusé : le widget garde son fond uni.
      } finally {
        bitmap.recycle()
      }
    }
  }

  private fun download(url: String): Bitmap? = try {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      connectTimeout = 10_000
      readTimeout = 10_000
      instanceFollowRedirects = true
    }
    connection.inputStream.use { stream ->
      val bytes = stream.readBytes()
      if (bytes.size > MAX_BYTES * 4) null else decodeScaled(bytes)
    }
  } catch (_: Throwable) {
    null
  }

  /** Décode en limitant la largeur à MAX_WIDTH, sans charger le plein format en mémoire. */
  private fun decodeScaled(bytes: ByteArray): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    var sample = 1
    while (bounds.outWidth / sample > MAX_WIDTH) sample *= 2
    val opts = BitmapFactory.Options().apply { inSampleSize = sample }
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
  }

  private fun refreshWidgets(context: Context) {
    try {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, NextTicketWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isNotEmpty()) {
        context.sendBroadcast(
          android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            setComponent(component)
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
          }
        )
      }
    } catch (_: Throwable) {
    }
  }
}
