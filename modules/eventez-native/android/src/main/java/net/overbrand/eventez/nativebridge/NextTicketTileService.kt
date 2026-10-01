package net.overbrand.eventez.nativebridge

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * X11 — Tuile Réglages rapides « Mon prochain billet » (Android 7+ = minSdk 24).
 * Un tap ouvre l'app directement sur le billet. Écran verrouillé : le système
 * demande d'abord le déverrouillage (un QR ne s'affiche jamais par-dessus).
 */
class NextTicketTileService : TileService() {
  override fun onStartListening() {
    super.onStartListening()
    render()
  }

  override fun onClick() {
    super.onClick()
    val ticket = WidgetStore.read(this)?.takeIf { it.isRelevant(System.currentTimeMillis()) }
    val link = ticket?.deepLink ?: "eventez://tickets"
    if (isLocked) unlockAndRun { open(link) } else open(link)
  }

  @SuppressLint("StartActivityAndCollapseDeprecated")
  private fun open(link: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startActivityAndCollapse(NextTicketWidgetProvider.openLink(this, link))
    } else {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link)).apply {
        setPackage(packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      @Suppress("DEPRECATION")
      startActivityAndCollapse(intent)
    }
  }

  private fun render() {
    val tile = qsTile ?: return
    val now = System.currentTimeMillis()
    val stored = WidgetStore.read(this)
    val ticket = stored?.takeIf { it.isRelevant(now) }
    tile.label = stored?.label("tile", getString(R.string.eventez_tile_label)) ?: getString(R.string.eventez_tile_label)
    if (ticket == null) {
      tile.state = Tile.STATE_INACTIVE
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val empty = getString(R.string.eventez_tile_empty)
        tile.subtitle = stored?.label("empty", empty) ?: empty
      }
    } else {
      tile.state = Tile.STATE_ACTIVE
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        tile.subtitle = if (ticket.isLive(now)) ticket.label("live", getString(R.string.eventez_widget_live)) else ticket.title
      }
    }
    tile.updateTile()
  }

  companion object {
    fun refresh(context: Context) {
      try {
        requestListeningState(context, ComponentName(context, NextTicketTileService::class.java))
      } catch (_: Exception) {
        // Tuile non ajoutée par l'utilisateur : rien à rafraîchir.
      }
    }
  }
}
