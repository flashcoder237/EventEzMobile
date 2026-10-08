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

  /**
   * Au-delà, on redimensionne : une transaction Binder trop grosse tue le widget.
   *
   * C'est le BITMAP décodé qui traverse le Binder, pas le JPEG : à 720 de
   * large, 720 × 405 × 4 octets (ARGB_8888) ≈ 1,11 Mo, au-delà du quota
   * d'environ 1 Mo partagé par TOUT le widget. 480 × 270 ≈ 506 Ko décodés :
   * net sur un widget 3×2, avec de la marge pour le reste de la transaction.
   */
  private const val MAX_WIDTH = 480
  private const val MAX_BYTES = 600 * 1024

  /** Garde-fou final : un bitmap au-delà de cette taille n'est pas envoyé. */
  private const val MAX_BITMAP_BYTES = 700 * 1024

  private val io = Executors.newSingleThreadExecutor()

  private fun file(context: Context) = File(context.filesDir, FILE)

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Bitmap en cache, ou null. Appelable depuis `onUpdate` (lecture disque seule). */
  fun load(context: Context): Bitmap? {
    val f = file(context)
    if (!f.exists()) return null
    return try {
      val bitmap = BitmapFactory.decodeFile(f.absolutePath) ?: return null
      // Un fichier écrit par une version antérieure peut encore être trop
      // grand : on préfère le dégradé de marque à un widget qui ne s'affiche
      // pas du tout. On efface aussi le fichier et l'URL mémorisée, sinon
      // `sync` croirait le cache à jour et l'image ne reviendrait jamais
      // pour ce billet ; le prochain passage retélécharge une version aux
      // nouvelles dimensions (bornées, donc pas de boucle).
      if (bitmap.byteCount > MAX_BITMAP_BYTES) {
        bitmap.recycle()
        clear(context)
        null
      } else {
        bitmap
      }
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

  /**
   * Décode sans charger le plein format en mémoire, en bornant la largeur à
   * MAX_WIDTH ET le nombre total de pixels. La largeur seule ne suffit pas :
   * une affiche portrait (400 × 711) tient sous MAX_WIDTH mais décode à
   * ~1,1 Mo — au-delà du garde-fou, donc jamais affichée. La borne en pixels
   * garantit que tout ce qui sort d'ici passe sous MAX_BITMAP_BYTES.
   */
  private fun decodeScaled(bytes: ByteArray): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    val maxPixels = MAX_BITMAP_BYTES / 4 // ARGB_8888 : 4 octets par pixel
    var sample = 1
    while (
      bounds.outWidth / sample > MAX_WIDTH ||
      (bounds.outWidth / sample).toLong() * (bounds.outHeight / sample) > maxPixels
    ) sample *= 2
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
