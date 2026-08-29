package net.overbrand.eventez.pip

import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Module local Expo — entrée en Picture-in-Picture Android pour la visio.
 *
 * `enter()` demande à l'activité courante de passer en PiP (fenêtre flottante).
 * `isSupported()` indique si l'appareil supporte le PiP (API 26+ ET feature
 * système présente). Le déclenchement est piloté côté JS (usePictureInPicture),
 * typiquement quand l'écran de visio perd le focus / l'app passe en arrière-plan.
 *
 * Le manifeste doit déclarer android:supportsPictureInPicture="true" sur la
 * MainActivity (cf. plugins/withAndroidPictureInPicture.js).
 */
class EventezPipModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EventezPip")

    Function("isSupported") {
      val activity = appContext.currentActivity ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
    }

    // Entre en PiP. Retourne true si la demande a été émise.
    Function("enter") {
      val activity = appContext.currentActivity ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      if (!activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
        return@Function false
      }
      try {
        val params = PictureInPictureParams.Builder()
          .setAspectRatio(Rational(16, 9))
          .build()
        activity.enterPictureInPictureMode(params)
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
