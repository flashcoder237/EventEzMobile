package net.overbrand.eventez.nativebridge

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Pont natif EventEz côté Android : widget + tuile (X3/X11), proximité (G10),
 * partage entrant (X12). Live Activities, Handoff et Core Haptics sont propres
 * à iOS : no-op ici (JS retombe sur ses propres replis).
 */
class EventezNativeModule : Module() {
  private var wakeLock: PowerManager.WakeLock? = null
  private var sensorListener: SensorEventListener? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context indisponible" }

  override fun definition() = ModuleDefinition {
    Name("EventezNative")

    Events("onProximityChange", "onShareIntent")

    OnDestroy { stopProximity() }

    // ── Widgets (X3) + tuile (X11) ────────────────────────────────────────
    Function("appGroupAvailable") { true }

    Function("setWidgetData") { json: String? ->
      WidgetStore.write(context, json)
      // Déconnexion (json null) : on efface aussi le visuel en cache. Une image
      // d'événement ne doit JAMAIS survivre à la sortie du compte sur l'écran
      // d'accueil, même sans texte à côté.
      if (json == null) WidgetImageCache.clear(context)
      NextTicketWidgetProvider.refresh(context)
      NextTicketTileService.refresh(context)
      true
    }

    // ── iOS uniquement ────────────────────────────────────────────────────
    Function("liveActivitiesEnabled") { false }
    AsyncFunction("startLiveActivity") { _: String, _: String, _: Double? -> null as String? }
    AsyncFunction("updateLiveActivity") { _: String, _: String, _: Double? -> false }
    AsyncFunction("endLiveActivity") { _: String, _: Boolean -> false }
    Function("listLiveActivities") { emptyList<String>() }
    Function("setHandoff") { _: String, _: String? -> }
    Function("clearHandoff") { }
    Function("supportsRichHaptics") { false }
    AsyncFunction("playHaptic") { _: String -> false }

    // ── Proximité (G10) ───────────────────────────────────────────────────
    AsyncFunction("setProximityMonitoring") { enabled: Boolean ->
      if (enabled) startProximity() else {
        stopProximity()
        true
      }
    }

    // ── Partage entrant (X12) ─────────────────────────────────────────────
    Function("consumeSharedText") {
      val activity = appContext.currentActivity ?: return@Function null
      val text = sharedText(activity.intent)
      if (text != null) {
        // Consommé une fois : une rotation ou un retour à l'app ne rejoue pas le partage.
        activity.intent = Intent(activity.intent).apply {
          action = Intent.ACTION_MAIN
          removeExtra(Intent.EXTRA_TEXT)
        }
      }
      text
    }

    OnNewIntent { intent ->
      sharedText(intent)?.let { sendEvent("onShareIntent", mapOf("text" to it)) }
    }
  }

  private fun sharedText(intent: Intent?): String? {
    if (intent?.action != Intent.ACTION_SEND) return null
    if (intent.type?.startsWith("text/") != true) return null
    return intent.getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() }
  }

  @SuppressLint("WakelockTimeout")
  private fun startProximity(): Boolean {
    val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
    if (!power.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) return false
    if (wakeLock == null) {
      wakeLock = power.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "eventez:proximity")
    }
    // Plafond de 15 min : un message vocal oublié ne garde jamais le verrou.
    wakeLock?.takeIf { !it.isHeld }?.acquire(15 * 60 * 1000L)

    if (sensorListener == null) {
      val sensors = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val sensor = sensors?.getDefaultSensor(Sensor.TYPE_PROXIMITY)
      if (sensors != null && sensor != null) {
        val listener = object : SensorEventListener {
          override fun onSensorChanged(event: SensorEvent) {
            val near = event.values.firstOrNull()?.let { it < sensor.maximumRange } ?: false
            sendEvent("onProximityChange", mapOf("near" to near))
          }

          override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }
        sensors.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        sensorListener = listener
      }
    }
    return true
  }

  private fun stopProximity() {
    sensorListener?.let { listener ->
      (appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)
        ?.unregisterListener(listener)
    }
    sensorListener = null
    wakeLock?.let {
      // RELEASE_FLAG_WAIT_FOR_NO_PROXIMITY : l'écran ne se rallume qu'une fois
      // le téléphone éloigné de l'oreille.
      if (it.isHeld) it.release(PowerManager.RELEASE_FLAG_WAIT_FOR_NO_PROXIMITY)
    }
  }
}
