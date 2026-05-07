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
        if let contentHandler = contentHandler, let content = bestAttemptContent {
            contentHandler(content)
        }
    }

    /// Télécharge l'image en tmp dir et appelle completion avec l'URL locale.
    private func downloadImage(from url: URL, completion: @escaping (URL?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { tempURL, response, error in
            guard let tempURL = tempURL, error == nil else {
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
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
