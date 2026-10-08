package net.overbrand.eventez.pip

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.util.Rational
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Module local Expo — entrée en Picture-in-Picture Android pour la visio.
 *
 * `enter()` demande à l'activité courante de passer en PiP (fenêtre flottante).
 * `isSupported()` indique si l'appareil supporte le PiP (API 26+ ET feature
 * système présente).
 *
 * Le manifeste doit déclarer android:supportsPictureInPicture="true" sur la
 * MainActivity (cf. plugins/withAndroidPictureInPicture.js).
 *
 * ── POURQUOI UN ÉVÉNEMENT `onPipModeChanged` (ajouté 2026-10-07) ────────────
 *
 * En PiP, Android réduit TOUTE la fenêtre de l'activité — il n'extrait pas la
 * vidéo. L'interface React Native (en-tête, titre, bouton raccrocher, bandeau
 * d'enregistrement) se retrouve donc superposée dans une vignette de ~200 dp,
 * où elle mange l'essentiel de la surface et devient intouchable.
 *
 * La documentation Android le dit explicitement :
 *   « Remove other UI elements before your activity enters PiP and restore
 *     them when your activity becomes full screen again. »
 *   https://developer.android.com/develop/ui/views/picture-in-picture
 *
 * On expose donc l'état au JS pour que l'overlay masque ses contrôles.
 *
 * ── CE QUI RESTE VOLONTAIREMENT NON FAIT ───────────────────────────────────
 *
 * `setAutoEnterEnabled(true)` (API 31+) donnerait une transition plus fluide,
 * mais il faut appeler `setPictureInPictureParams` EN AMONT (pendant l'appel,
 * pas au moment de quitter) et poser un `sourceRectHint`. C'est un changement
 * de conception à valider sur appareil réel, pas une retouche.
 */
class EventezPipModule : Module() {

  private var lastReportedPipMode: Boolean? = null

  /** Vrai pendant un appel : le PiP s'armera au depart de l'utilisateur. */
  private var autoEnterArmed: Boolean = false

  override fun definition() = ModuleDefinition {
    Name("EventezPip")

    // Le JS écoute cet événement pour masquer son interface en vignette.
    Events("onPipModeChanged")

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
      enterPipNow()
    }

    /**
     * Lecture directe de l'état PiP.
     *
     * L'événement ci-dessus peut arriver après le montage du composant JS :
     * cette fonction permet de se synchroniser sans attendre un changement.
     */
    Function("isInPipMode") {
      val activity = appContext.currentActivity ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return@Function false
      activity.isInPictureInPictureMode
    }

    /**
     * Arme l'entree automatique en PiP.
     *
     * Le JS appelle ceci au DEBUT de l'appel, pas au moment de quitter.
     */
    Function("setAutoEnter") { enabled: Boolean ->
      autoEnterArmed = enabled
      true
    }

    // ENTREE EN PiP AU BON MOMENT (correction 2026-10-07).
    //
    // `onUserLeaveHint` est appele JUSTE AVANT `onPause`, pendant que
    // l'activite est encore VISIBLE. C'est le seul instant ou le systeme
    // accepte la demande :
    //
    //   « The system may disallow entering picture-in-picture in various
    //     cases, including WHEN THE ACTIVITY IS NOT VISIBLE [...] »
    //   developer.android.com/reference/android/app/Activity#enterPictureInPictureMode
    //
    // Le declenchement precedent passait par l'evenement JS
    // `AppState === 'background'`, qui n'arrive qu'APRES `onPause`/`onStop` :
    // a cet instant l'activite n'est plus visible et la demande est refusee.
    // C'est la cause de fond du « PiP qui ne marche pas ».
    OnUserLeavesActivity {
      if (autoEnterArmed) enterPipNow()
    }

    // `onPictureInPictureModeChanged` n'est pas exposé aux modules Expo : on
    // observe donc le passage avant-plan/arrière-plan, qui accompagne toujours
    // l'entrée et la sortie de PiP (c'est précisément pour cela que le
    // manifeste doit déclarer `configChanges`).
    OnActivityEntersForeground { emitPipMode() }
    OnActivityEntersBackground { emitPipMode() }
  }

  /** Demande l'entree en PiP. Retourne false si le systeme refuse. */
  private fun enterPipNow(): Boolean {
    val activity = appContext.currentActivity ?: return false
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    if (!activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
      return false
    }
    return try {
      // Le ratio DOIT rester entre 1:2.39 et 2.39:1, sinon Android leve
      // « IllegalArgumentException: Aspect ratio is too extreme » et il n'y a
      // pas de PiP du tout. On borne donc systematiquement.
      val params = PictureInPictureParams.Builder()
        .setAspectRatio(clampedRatio(16f / 9f))
        .build()
      activity.enterPictureInPictureMode(params)
      true
    } catch (e: Exception) {
      // NE PLUS AVALER EN SILENCE : un PiP qui echoue etait invisible
      // (exception absorbee, valeur de retour ignoree). Impossible de
      // diagnostiquer « le PiP ne marche pas » sans la moindre trace.
      Log.w(TAG, "Entree en Picture-in-Picture refusee", e)
      false
    }
  }

  private fun emitPipMode() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
    val activity: Activity = appContext.currentActivity ?: return
    val inPip = activity.isInPictureInPictureMode
    // On ne notifie QUE les changements réels : l'overlay se re-rend à chaque
    // événement reçu, et un appel vidéo n'a pas besoin de re-rendus inutiles.
    if (lastReportedPipMode == inPip) return
    lastReportedPipMode = inPip
    sendEvent("onPipModeChanged", mapOf("isInPipMode" to inPip))
  }

  /**
   * Borne un ratio dans la plage acceptee par Android.
   *
   * Hors de [1/2.39, 2.39], `enterPictureInPictureMode` leve une
   * IllegalArgumentException — donc pas de PiP du tout. Mieux vaut un cadrage
   * approximatif qu'un appel refuse.
   */
  private fun clampedRatio(desired: Float): Rational {
    val safe = desired.coerceIn(MIN_ASPECT, MAX_ASPECT)
    // Denominateur fixe : Rational(num, den) a partir d'un float demande une
    // approximation, 1000 donne une precision tres suffisante ici.
    return Rational((safe * 1000).toInt(), 1000)
  }

  companion object {
    private const val TAG = "EventezPip"
    // Plage documentee par Android (1:2.39 a 2.39:1).
    private const val MIN_ASPECT = 1f / 2.39f
    private const val MAX_ASPECT = 2.39f
  }
}
