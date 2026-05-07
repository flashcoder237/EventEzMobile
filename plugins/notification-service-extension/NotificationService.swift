// NotificationService.swift
// EventEz iOS Notification Service Extension
//
// Cette extension intercepte les push iOS avant affichage et télécharge l'image
// référencée dans le payload (`data.big_picture_url` ou `data.image_url`),
// puis l'attache à la notification → l'utilisateur voit BigPictureStyle
// en background, comme Eventbrite/Instagram.
//
// Triggered when : APNs payload contient `mutable-content: 1` ET la NSE est
// déclarée dans le bundle. Le backend (fcm_service.py) pose les deux
// automatiquement via firebase_admin.messaging.APNSConfig.

import UserNotifications
import os.log

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        // Récupère l'URL de l'image depuis le payload. FCM expose `image`
        // au top-level si fourni dans `notification.image`. On accepte aussi
        // `big_picture_url` ou `image_url` dans `data` pour flexibilité.
        var imageURLString: String?
        if let fcmImage = request.content.userInfo["fcm_options"] as? [String: Any],
           let img = fcmImage["image"] as? String {
            imageURLString = img
        } else if let img = request.content.userInfo["image"] as? String {
            imageURLString = img
        } else if let img = request.content.userInfo["big_picture_url"] as? String {
            imageURLString = img
        } else if let img = request.content.userInfo["image_url"] as? String {
            imageURLString = img
        }

        guard let urlString = imageURLString,
              let url = URL(string: urlString) else {
            // Pas d'image → notif sans attachment
            contentHandler(bestAttemptContent)
            return
        }

        downloadImage(from: url) { localURL in
            if let localURL = localURL,
               let attachment = try? UNNotificationAttachment(identifier: "image", url: localURL, options: nil) {
                bestAttemptContent.attachments = [attachment]
            }
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // iOS donne ~30s à la NSE pour finir. Au-delà, on doit livrer ce
        // qu'on a — sinon la notif est complètement perdue.
        // os_log pour tracker les timeouts en prod (visible dans Console.app).
        os_log("[NSE] serviceExtensionTimeWillExpire — delivering best attempt without image",
               log: OSLog(subsystem: "com.overbrand.eventez", category: "NSE"),
               type: .info)
        if let contentHandler = contentHandler, let content = bestAttemptContent {
            contentHandler(content)
        }
    }

    /// Télécharge l'image en tmp dir et appelle completion avec l'URL locale.
    /// Timeout strict 10s (request + resource) — au-delà, fallback sans image
    /// pour laisser de la marge avant le serviceExtensionTimeWillExpire (~30s).
    /// Le tempURL retourné par downloadTask est cleanup automatiquement par
    /// iOS si on ne le déplace pas — pour le fichier de destination, on
    /// utilise NSTemporaryDirectory() qui est purgé automatiquement par le
    /// système après livraison de la notif (lifecycle NSE).
    private func downloadImage(from url: URL, completion: @escaping (URL?) -> Void) {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 10
        let session = URLSession(configuration: config)

        let task = session.downloadTask(with: url) { tempURL, response, error in
            guard let tempURL = tempURL, error == nil else {
                if let error = error {
                    os_log("[NSE] download failed: %{public}@",
                           log: OSLog(subsystem: "com.overbrand.eventez", category: "NSE"),
                           type: .error,
                           error.localizedDescription)
                }
                completion(nil)
                return
            }
            // Renommer avec une extension correcte (sinon iOS refuse l'attachment).
            let ext = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let dest = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(ext)
            do {
                try FileManager.default.moveItem(at: tempURL, to: dest)
                completion(dest)
                // Cleanup différé : iOS déplace l'attachment vers son propre
                // sandbox. On planifie un removeItem 30s plus tard pour purger
                // notre copie tmp (best-effort, le système nettoie aussi).
                DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 30) {
                    try? FileManager.default.removeItem(at: dest)
                }
            } catch {
                // Si le move échoue, tente quand même de nettoyer le tempURL.
                try? FileManager.default.removeItem(at: tempURL)
                completion(nil)
            }
        }
        task.resume()
    }
}
