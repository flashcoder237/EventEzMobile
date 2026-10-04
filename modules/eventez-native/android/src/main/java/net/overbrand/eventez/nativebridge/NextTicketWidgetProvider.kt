package net.overbrand.eventez.nativebridge

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

/**
 * X3 — Widget « Prochain billet ». Lit WidgetStore ; un tap ouvre le billet
 * (deep link eventez://registrations/{id}) ou « Mes billets » s'il n'y en a pas.
 * Rafraîchi par l'app à chaque écriture, et par le système toutes les 30 min
 * (bascule « En cours », puis disparition après la fin).
 */
class NextTicketWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { manager.updateAppWidget(it, build(context)) }
  }

  companion object {
    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, NextTicketWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val views = build(context)
      ids.forEach { manager.updateAppWidget(it, views) }
    }

    private fun build(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.eventez_next_ticket_widget)
      val now = System.currentTimeMillis()
      val stored = WidgetStore.read(context)
      val ticket = stored?.takeIf { it.isRelevant(now) }
      val header = context.getString(R.string.eventez_widget_header)
      views.setTextViewText(R.id.eventez_widget_header, stored?.label("header", header) ?: header)

      if (ticket == null) {
        val empty = context.getString(R.string.eventez_widget_empty)
        views.setTextViewText(R.id.eventez_widget_title, stored?.label("empty", empty) ?: empty)
        views.setViewVisibility(R.id.eventez_widget_when, View.GONE)
        views.setViewVisibility(R.id.eventez_widget_venue, View.GONE)
        // Pas de billet : pas de visuel non plus, sinon l'image du billet
        // précédent resterait sous le libellé « Aucun billet à venir ».
        views.setViewVisibility(R.id.eventez_widget_image, View.GONE)
        views.setViewVisibility(R.id.eventez_widget_scrim, View.GONE)
        views.setOnClickPendingIntent(R.id.eventez_widget_root, openLink(context, "eventez://tickets"))
        return views
      }

      // Visuel de l'événement, comme sur les cartes de la liste. Le cache est
      // alimenté hors du thread principal (cf. WidgetImageCache) : ici on ne
      // fait qu'une lecture disque, et on retombe sur le fond de marque tant
      // que l'image n'est pas encore descendue.
      WidgetImageCache.sync(context, ticket.imageUrl)
      val cover = if (ticket.imageUrl != null) WidgetImageCache.load(context) else null
      if (cover != null) {
        views.setImageViewBitmap(R.id.eventez_widget_image, cover)
        views.setViewVisibility(R.id.eventez_widget_image, View.VISIBLE)
        views.setViewVisibility(R.id.eventez_widget_scrim, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.eventez_widget_image, View.GONE)
        views.setViewVisibility(R.id.eventez_widget_scrim, View.GONE)
      }

      views.setTextViewText(R.id.eventez_widget_title, ticket.title)
      val whenText = if (ticket.isLive(now)) {
        ticket.label("live", context.getString(R.string.eventez_widget_live))
      } else {
        ticket.whenLabel
      }
      views.setTextViewText(R.id.eventez_widget_when, whenText)
      views.setViewVisibility(R.id.eventez_widget_when, View.VISIBLE)
      if (ticket.venue != null) {
        views.setTextViewText(R.id.eventez_widget_venue, ticket.venue)
        views.setViewVisibility(R.id.eventez_widget_venue, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.eventez_widget_venue, View.GONE)
      }
      views.setOnClickPendingIntent(R.id.eventez_widget_root, openLink(context, ticket.deepLink))
      return views
    }

    fun openLink(context: Context, link: String): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link)).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      return PendingIntent.getActivity(
        context,
        link.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
