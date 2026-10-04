# Widget « Prochain billet » — visuel de l'événement

Le widget n'affichait que du texte sur un dégradé de marque, alors que les
cartes de la liste montrent l'affiche de l'événement. Il porte désormais le même
visuel.

## La contrainte qui dicte toute l'architecture

**Un widget ne peut pas faire de réseau.**

- iOS : l'extension WidgetKit tourne dans un processus séparé, sans accès réseau
  en pratique (et avec un budget d'exécution très court).
- Android : `AppWidgetProvider` est un `BroadcastReceiver` — `onUpdate` doit
  rendre immédiatement, et le bitmap passé aux `RemoteViews` traverse une
  transaction Binder au quota limité (~1 Mo pour tout le widget).

C'est donc **l'app** qui télécharge l'image et la dépose dans un emplacement
partagé ; le widget ne fait qu'une lecture de fichier.

## Chaîne complète

```
pickNextTicket()            getEventImageUrl(event, 'thumb')
  → NextTicket.imageUrl       même cascade que les cartes :
                              display_image → banner_image → image de catégorie

buildWidgetPayload()        imageUrl dans le JSON
  → setWidgetData()

iOS    EventezNativeModule.syncWidgetImage()
         URLSession → App Group/next-ticket-image
         puis WidgetCenter.reloadAllTimelines()
       NextTicketWidget.EventezWidgetImage.load()
         Image(uiImage:) en containerBackground

Android WidgetImageCache.sync()
         HttpURLConnection → filesDir/next_ticket_image
         puis broadcast ACTION_APPWIDGET_UPDATE
        NextTicketWidgetProvider.build()
         setImageViewBitmap sur eventez_widget_image
```

## Décisions à connaître avant d'y toucher

**Vignette, pas plein format.** `getEventImageUrl(event, 'thumb')` → WebP 400 px.
Le fichier est retéléchargé à chaque changement de billet ; un widget ne
justifie jamais une image pleine résolution.

**Deux rechargements, pas un.** `setWidgetData` rend la main tout de suite et le
widget affiche son texte ; le téléchargement déclenche un second rafraîchissement
quand l'image arrive. Attendre le réseau aurait retardé l'affichage du texte.

**L'URL source est mémorisée** (`nextTicketImageSource` / `next_ticket_image_source`).
Sans cela, chaque rafraîchissement — changement d'heure, redimensionnement —
retéléchargerait la même image.

**Le voile sombre n'est pas décoratif.** Le texte du widget est blanc : sur une
photo claire (scène éclairée, salle blanche) il devient illisible. iOS utilise un
`LinearGradient` noir 25 % → 78 %, Android le drawable `eventez_widget_scrim`,
plus les ombres portées sur les `TextView`.

**Le cache est effacé à la déconnexion.** Une image d'événement ne doit jamais
survivre à la sortie du compte sur l'écran d'accueil, même sans texte à côté.
Idem quand il n'y a plus de billet : sinon le visuel du précédent resterait
affiché sous « Aucun billet à venir ».

**Les familles « accessoire » iOS (écran verrouillé) n'ont pas d'image** : elles
sont monochromes et rendues par le système, l'image serait écrasée.

**Tout échec est silencieux.** Réseau coupé, disque plein, image corrompue → le
widget garde son dégradé de marque. C'est un repli acceptable ; une erreur
remontée depuis un `BroadcastReceiver` ne l'est pas.

## Ce qui est vérifié, et ce qui ne l'est pas

Les tests (`src/lib/native/__tests__/nextTicket.test.ts`) couvrent la couche JS :
cascade d'image, préférence pour la vignette, repli sur la bannière, `null` quand
l'événement n'a pas d'image, et `imageUrl: null` sur l'état vide.

**Le natif n'est pas testable ici** : Swift et Kotlin ne se compilent pas dans la
suite Jest. À valider sur un build EAS :

1. un billet dont l'événement a une affiche → le widget la montre ;
2. un billet sans affiche → dégradé de marque, pas de case vide ;
3. changement de billet → l'image suit ;
4. déconnexion → ni texte ni image ;
5. mode avion au premier affichage → texte seul, image à la reconnexion.
