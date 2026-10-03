# Matrice de couverture — API mobile (src/api)

Généré le 2026-10-03. Colonnes : verbe + URL émis (arguments factices `id1`, `id2`…), test détaillé dédié (params/body vérifiés dans `<module>.test.ts`). **Toutes** les fonctions sont couvertes par `allEndpoints.test.ts` (requête, réponse, erreur) et `backendRoutes.contract.test.ts` (route Django réelle).

**Total : 706 fonctions — 100 % couvertes par les tests génériques ; 555 (78 %) ont en plus un test détaillé dédié.**

## admin

| Fonction | Requête | Test dédié |
|---|---|---|
| `auditAPI.getLog` | GET `/audit/logs/id1/` | oui |
| `auditAPI.getLogs` | GET `/audit/logs/` | oui |
| `auditAPI.getRecentLogs` | GET `/audit/logs/recent/` | oui |
| `auditAPI.getStatistics` | GET `/audit/logs/statistics/` | oui |
| `publicSettingsAPI.get` | GET `/public-settings/` | oui |
| `siteSettingsAPI.get` | GET `/site-settings/` | oui |
| `siteSettingsAPI.update` | PATCH `/site-settings/` | oui |
| `treasuryAPI.approveDividend` | POST `/admin/treasury/dividends/id1/approve/` | oui |
| `treasuryAPI.approveExpense` | POST `/admin/treasury/expenses/id1/approve/` | oui |
| `treasuryAPI.createDividend` | POST `/admin/treasury/dividends/` | oui |
| `treasuryAPI.createExpense` | POST `/admin/treasury/expenses/` | oui |
| `treasuryAPI.createShareholder` | POST `/admin/treasury/shareholders/` | oui |
| `treasuryAPI.createStaffMember` | POST `/admin/treasury/staff/` | oui |
| `treasuryAPI.createStaffPayment` | POST `/admin/treasury/staff-payments/` | oui |
| `treasuryAPI.createTransaction` | POST `/admin/treasury/transactions/` | oui |
| `treasuryAPI.deleteExpense` | DELETE `/admin/treasury/expenses/id1/` | oui |
| `treasuryAPI.deleteShareholder` | DELETE `/admin/treasury/shareholders/id1/` | oui |
| `treasuryAPI.deleteStaffMember` | DELETE `/admin/treasury/staff/id1/` | oui |
| `treasuryAPI.distributeDividend` | POST `/admin/treasury/dividends/id1/distribute/` | oui |
| `treasuryAPI.generatePayroll` | POST `/admin/treasury/staff-payments/generate/` | oui |
| `treasuryAPI.getDividend` | GET `/admin/treasury/dividends/id1/` | oui |
| `treasuryAPI.getDividends` | GET `/admin/treasury/dividends/` | oui |
| `treasuryAPI.getExpense` | GET `/admin/treasury/expenses/id1/` | oui |
| `treasuryAPI.getExpenses` | GET `/admin/treasury/expenses/` | oui |
| `treasuryAPI.getFinancialSummary` | GET `/admin/treasury/reports/summary/` | oui |
| `treasuryAPI.getMonthlyReport` | GET `/admin/treasury/reports/monthly/` | oui |
| `treasuryAPI.getOverview` | GET `/admin/treasury/overview/` | oui |
| `treasuryAPI.getProfitLoss` | GET `/admin/treasury/reports/profit-loss/` | oui |
| `treasuryAPI.getShareholder` | GET `/admin/treasury/shareholders/id1/` | oui |
| `treasuryAPI.getShareholders` | GET `/admin/treasury/shareholders/` | oui |
| `treasuryAPI.getStaffMember` | GET `/admin/treasury/staff/id1/` | oui |
| `treasuryAPI.getStaffMembers` | GET `/admin/treasury/staff/` | oui |
| `treasuryAPI.getStaffPayments` | GET `/admin/treasury/staff-payments/` | oui |
| `treasuryAPI.getTransaction` | GET `/admin/treasury/transactions/id1/` | oui |
| `treasuryAPI.getTransactions` | GET `/admin/treasury/transactions/` | oui |
| `treasuryAPI.getWallet` | GET `/admin/treasury/overview/` | oui |
| `treasuryAPI.previewDividend` | POST `/admin/treasury/dividends/preview/` | oui |
| `treasuryAPI.recomputeWallet` | POST `/admin/treasury/overview/recompute/` | oui |
| `treasuryAPI.rejectExpense` | POST `/admin/treasury/expenses/id1/reject/` | oui |
| `treasuryAPI.updateExpense` | PATCH `/admin/treasury/expenses/id1/` | oui |
| `treasuryAPI.updateShareholder` | PATCH `/admin/treasury/shareholders/id1/` | oui |
| `treasuryAPI.updateStaffMember` | PATCH `/admin/treasury/staff/id1/` | oui |

## analytics

| Fonction | Requête | Test dédié |
|---|---|---|
| `analyticsAPI.createDashboard` | POST `/analytics/dashboards/` | oui |
| `analyticsAPI.createReport` | POST `/analytics/reports/` | oui |
| `analyticsAPI.createWidget` | POST `/analytics/dashboard-widgets/` | oui |
| `analyticsAPI.deleteDashboard` | DELETE `/analytics/dashboards/id1/` | oui |
| `analyticsAPI.deleteReport` | DELETE `/analytics/reports/id1/` | oui |
| `analyticsAPI.deleteWidget` | DELETE `/analytics/dashboard-widgets/id1/` | oui |
| `analyticsAPI.generateReport` | POST `/analytics/reports/generate/` | oui |
| `analyticsAPI.getDashboard` | GET `/analytics/dashboards/id1/` | oui |
| `analyticsAPI.getDashboardSummary` | GET `/analytics/dashboard_summary/` | oui |
| `analyticsAPI.getDashboardWidgets` | GET `/analytics/dashboards/id1/widgets/` | oui |
| `analyticsAPI.getDashboards` | GET `/analytics/dashboards/` | oui |
| `analyticsAPI.getEventAnalytics` | GET `/analytics/events/` | oui |
| `analyticsAPI.getEventRegistrations` | GET `/analytics/event_registrations/` | oui |
| `analyticsAPI.getRegistrationAnalytics` | GET `/analytics/registrations/` | oui |
| `analyticsAPI.getReport` | GET `/analytics/reports/id1/` | oui |
| `analyticsAPI.getReports` | GET `/analytics/reports/` | oui |
| `analyticsAPI.getRevenueAnalytics` | GET `/analytics/revenue/` | oui |
| `analyticsAPI.getUserAnalytics` | GET `/analytics/users/` | oui |
| `analyticsAPI.getWidget` | GET `/analytics/dashboard-widgets/id1/` | oui |
| `analyticsAPI.getWidgets` | GET `/analytics/dashboard-widgets/` | oui |
| `analyticsAPI.predictAttendance` | GET `/analytics/predict_attendance/` | oui |
| `analyticsAPI.updateDashboard` | PUT `/analytics/dashboards/id1/` | oui |
| `analyticsAPI.updateReport` | PUT `/analytics/reports/id1/` | oui |
| `analyticsAPI.updateWidget` | PUT `/analytics/dashboard-widgets/id1/` | oui |

## announcements

| Fonction | Requête | Test dédié |
|---|---|---|
| `announcementsAPI.create` | POST `/admin/announcements/` | oui |
| `announcementsAPI.delete` | DELETE `/admin/announcements/id1/` | oui |
| `announcementsAPI.get` | GET `/admin/announcements/id1/` | oui |
| `announcementsAPI.getActive` | GET `/announcements/active/` | oui |
| `announcementsAPI.list` | GET `/admin/announcements/` | oui |
| `announcementsAPI.update` | PATCH `/admin/announcements/id1/` | oui |
| `clientReleaseAPI.get` | GET `/admin/client-release-requirement/` | oui |
| `clientReleaseAPI.update` | PATCH `/admin/client-release-requirement/` | oui |

## attendees

| Fonction | Requête | Test dédié |
|---|---|---|
| `attendeeFormsAPI.delegate` | POST `/attendees/id1/delegate/` | non |
| `attendeeFormsAPI.getAttendees` | GET `/registrations/id1/attendees/` | non |
| `attendeeFormsAPI.getByToken` | GET `/attendee-forms/public/id1/` | non |
| `attendeeFormsAPI.patchAttendee` | PATCH `/attendees/id1/` | non |
| `attendeeFormsAPI.patchByToken` | PATCH `/attendee-forms/public/id1/` | non |

## auth

| Fonction | Requête | Test dédié |
|---|---|---|
| `authAPI.appleSignIn` | POST `/social-auth/apple/` | oui |
| `authAPI.googleSignIn` | POST `/social-auth/google/` | oui |
| `authAPI.guestRegister` | POST `/auth/guest-register/` | oui |
| `authAPI.login` | POST `/token/` | oui |
| `authAPI.logout` | POST `/logout/` | oui |
| `authAPI.phoneSendAccountVerification` | POST `/auth/phone/send-account-verification/` | oui |
| `authAPI.phoneSendOTP` | POST `/auth/phone/send-otp/` | oui |
| `authAPI.phoneVerifyAccount` | POST `/auth/phone/verify-account/` | oui |
| `authAPI.phoneVerifyOTP` | POST `/auth/phone/verify/` | oui |
| `authAPI.refreshToken` | POST `/token/refresh/` | oui |
| `authAPI.register` | POST `/register/` | oui |
| `authAPI.registerOrganizer` | POST `/register/organizer/` | oui |
| `authAPI.requestPasswordReset` | POST `/password-reset/request/` | oui |
| `authAPI.resendVerificationEmail` | POST `/verify-email/resend/` | oui |
| `authAPI.resetPassword` | POST `/password-reset/confirm/` | oui |
| `authAPI.upgradeGuest` | POST `/auth/upgrade-guest/` | oui |
| `authAPI.validateResetToken` | GET `/password-reset/validate/id1/` | oui |
| `authAPI.verifyEmail` | GET `/verify-email/id1/` | oui |
| `usersAPI.becomeOrganizer` | POST `/users/become_organizer/` | oui |
| `usersAPI.blockUser` | POST `/users/id1/block/` | oui |
| `usersAPI.changePassword` | POST `/users/change_password/` | oui |
| `usersAPI.createUser` | POST `/users/create_user/` | oui |
| `usersAPI.deleteAccount` | POST `/users/me/delete_account/` | oui |
| `usersAPI.deleteUser` | DELETE `/users/id1/` | oui |
| `usersAPI.followUser` | POST `/users/id1/follow/` | oui |
| `usersAPI.getBadgeCounts` | GET `/users/me/badge-counts/` | non |
| `usersAPI.getCurrentUser` | GET `/users/me/` | oui |
| `usersAPI.getFollowingUsers` | GET `/users/following_users/` | oui |
| `usersAPI.getOrganizers` | GET `/users/organizers/` | oui |
| `usersAPI.getPendingVerification` | GET `/users/pending_verification/` | oui |
| `usersAPI.getUser` | GET `/users/id1/` | oui |
| `usersAPI.getUserAnalytics` | GET `/users/analytics/` | oui |
| `usersAPI.getUserFollowersCount` | GET `/users/id1/followers_count/` | oui |
| `usersAPI.getUserSettings` | GET `/users/me/settings/` | oui |
| `usersAPI.getUsers` | GET `/users/` | oui |
| `usersAPI.isFollowingUser` | GET `/users/id1/is_following/` | oui |
| `usersAPI.listBlocked` | GET `/users/blocked/` | oui |
| `usersAPI.rejectProfile` | POST `/users/id1/reject_profile/` | oui |
| `usersAPI.setUserActive` | POST `/users/id1/set_active/` | oui |
| `usersAPI.unblockUser` | POST `/users/id1/unblock/` | oui |
| `usersAPI.unfollowUser` | POST `/users/id1/unfollow/` | oui |
| `usersAPI.updateCurrentUser` | PATCH `/users/me/` | oui |
| `usersAPI.updateLanguage` | PATCH `/users/me/language/` | non |
| `usersAPI.updateNotificationSettings` | PATCH `/users/notification_settings/` | oui |
| `usersAPI.updateOrganizerProfile` | PUT `/users/update_organizer_profile/` | non |
| `usersAPI.updateProfile` | PUT `/users/update_profile/` | oui |
| `usersAPI.updateProfileImage` | PATCH `/users/me/upload_profile_image/` | oui |
| `usersAPI.updateUser` | PATCH `/users/id1/` | oui |
| `usersAPI.updateUserFollowPreferences` | PATCH `/users/id1/update_follow_preferences/` | oui |
| `usersAPI.updateUserSettings` | PUT `/users/me/settings/` | oui |
| `usersAPI.verifyProfile` | POST `/users/id1/verify_profile/` | oui |
| `verificationAPI.approve` | POST `/verifications/id1/approve/` | oui |
| `verificationAPI.getMyRequest` | GET `/verifications/my_request/` | oui |
| `verificationAPI.getPending` | GET `/verifications/pending/` | oui |
| `verificationAPI.reject` | POST `/verifications/id1/reject/` | oui |
| `verificationAPI.submit` | POST `/verifications/submit/` | oui |

## boxOffice

| Fonction | Requête | Test dédié |
|---|---|---|
| `boxOfficeAPI.closeDrawer` | POST `/box-office/close-drawer/` | non |
| `boxOfficeAPI.getDrawer` | GET `/box-office/drawer/` | non |
| `boxOfficeAPI.openDrawer` | POST `/box-office/open-drawer/` | non |
| `boxOfficeAPI.sell` | POST `/box-office/sell/` | non |

## connections

| Fonction | Requête | Test dédié |
|---|---|---|
| `connectionsAPI.bump` | POST `/connections/bump/` | non |
| `connectionsAPI.bumpConfirm` | POST `/connections/bump/confirm/` | non |
| `connectionsAPI.connect` | POST `/connections/connect/` | non |
| `connectionsAPI.fromQr` | POST `/connections/from_qr/` | non |
| `connectionsAPI.getMyQrToken` | GET `/connections/my_qr_token/` | non |
| `connectionsAPI.list` | GET `/connections/` | non |
| `connectionsAPI.remove` | DELETE `/connections/id1/` | non |

## content

| Fonction | Requête | Test dédié |
|---|---|---|
| `cfpAPI.getAll` | GET `/call-for-papers/` | oui |
| `cfpAPI.getById` | GET `/call-for-papers/id1/` | oui |
| `cfpAPI.getMyProposals` | GET `/talk-proposals/my_proposals/` | oui |
| `cfpAPI.getProposal` | GET `/talk-proposals/id1/` | oui |
| `cfpAPI.submitProposal` | POST `/talk-proposals/` | oui |
| `liveAPI.createQuestion` | POST `/live-questions/` | oui |
| `liveAPI.getPollResults` | GET `/live-polls/id1/results/` | oui |
| `liveAPI.getPollsByEvent` | GET `/live-polls/by_event/` | oui |
| `liveAPI.getQuestionsByEvent` | GET `/live-questions/by_event/` | oui |
| `liveAPI.upvoteQuestion` | POST `/live-questions/id1/upvote/` | oui |
| `liveAPI.vote` | POST `/poll-votes/` | oui |
| `newslettersAPI.create` | POST `/newsletters/` | oui |
| `newslettersAPI.delete` | DELETE `/newsletters/id1/` | oui |
| `newslettersAPI.getAll` | GET `/newsletters/` | oui |
| `newslettersAPI.getById` | GET `/newsletters/id1/` | oui |
| `newslettersAPI.getSubscribers` | GET `/subscribers/` | oui |
| `newslettersAPI.schedule` | POST `/newsletters/id1/schedule/` | oui |
| `newslettersAPI.sendNow` | POST `/newsletters/id1/send_now/` | oui |
| `newslettersAPI.subscribe` | POST `/subscribers/subscribe/` | oui |
| `newslettersAPI.unsubscribe` | POST `/subscribers/unsubscribe/` | oui |
| `newslettersAPI.update` | PATCH `/newsletters/id1/` | oui |
| `recordingsAPI.getByEvent` | GET `/recordings/by_event/` | oui |
| `recordingsAPI.getById` | GET `/recordings/id1/` | oui |
| `recordingsAPI.incrementView` | POST `/recordings/id1/increment_view/` | oui |
| `sponsorsAPI.confirm` | POST `/event-sponsors/id1/confirm/` | oui |
| `sponsorsAPI.getByEvent` | GET `/event-sponsors/by-event/` | oui |
| `sponsorsAPI.getPackages` | GET `/sponsor-packages/` | oui |
| `sponsorsAPI.getSponsor` | GET `/event-sponsors/id1/` | oui |
| `sponsorsAPI.getSponsors` | GET `/event-sponsors/` | oui |
| `sponsorsAPI.trackClick` | POST `/event-sponsors/id1/track-click/` | oui |
| `virtualRoomsAPI.eventJoin` | GET `/virtual-rooms/event/id1/join/` | oui |
| `virtualRoomsAPI.eventPlanInfo` | GET `/virtual-rooms/event/id1/plan-info/` | oui |
| `virtualRoomsAPI.getByEvent` | GET `/virtual-rooms/by_event/` | oui |
| `virtualRoomsAPI.getById` | GET `/virtual-rooms/id1/` | oui |
| `virtualRoomsAPI.getParticipants` | GET `/virtual-rooms/id1/participants/` | oui |
| `virtualRoomsAPI.join` | POST `/virtual-rooms/id1/join/` | oui |
| `virtualRoomsAPI.leave` | POST `/virtual-rooms/id1/leave/` | oui |
| `virtualRoomsAPI.liveStatus` | GET `/virtual-rooms/event/id1/live-status/` | oui |

## events

| Fonction | Requête | Test dédié |
|---|---|---|
| `categoriesAPI.createCategory` | POST `/categories/` | oui |
| `categoriesAPI.deleteCategory` | DELETE `/categories/id1/` | oui |
| `categoriesAPI.getCategories` | GET `/categories/` | oui |
| `categoriesAPI.getCategory` | GET `/categories/id1/` | oui |
| `categoriesAPI.getCategoryEvents` | GET `/categories/id1/events/` | oui |
| `categoriesAPI.toggleActive` | POST `/categories/id1/toggle_active/` | oui |
| `categoriesAPI.updateCategory` | PUT `/categories/id1/` | oui |
| `categoriesAPI.uploadDefaultEventImage` | POST `/categories/id1/upload_default_event_image/` | oui |
| `categoriesAPI.uploadImage` | POST `/categories/id1/upload_image/` | oui |
| `eventTemplatesAPI.getAll` | GET `/event-templates/` | oui |
| `eventTemplatesAPI.getById` | GET `/event-templates/id1/` | oui |
| `eventsAPI.broadcastMessage` | POST `/events/id1/broadcast-message/` | non |
| `eventsAPI.cancelEvent` | POST `/events/id1/cancel/` | oui |
| `eventsAPI.createEvent` | POST `/events/` | oui |
| `eventsAPI.createFormField` | POST `/form-fields/` | oui |
| `eventsAPI.createRecurrence` | POST `/events/id1/create_recurrence/` | oui |
| `eventsAPI.deleteEvent` | DELETE `/events/id1/` | oui |
| `eventsAPI.deleteFormField` | DELETE `/form-fields/id1/` | oui |
| `eventsAPI.duplicateEvent` | POST `/events/id1/duplicate/` | oui |
| `eventsAPI.exportIcal` | GET `/events/id1/export-ical/` | oui |
| `eventsAPI.followEvent` | POST `/events/id1/follow/` | oui |
| `eventsAPI.getCities` | GET `/events/cities/` | oui |
| `eventsAPI.getCityPulse` | GET `/events/city-pulse/` | non |
| `eventsAPI.getEvent` | GET `/events/id1/` | oui |
| `eventsAPI.getEventPulse` | GET `/events/id1/pulse/` | non |
| `eventsAPI.getEventRecap` | GET `/events/id1/recap/` | non |
| `eventsAPI.getEvents` | GET `/events/` | oui |
| `eventsAPI.getFeaturedEvents` | GET `/events/featured/` | oui |
| `eventsAPI.getFollowersCount` | GET `/events/id1/followers_count/` | oui |
| `eventsAPI.getFollowingEvents` | GET `/events/following/` | oui |
| `eventsAPI.getFormFields` | GET `/form-fields/` | oui |
| `eventsAPI.getGoogleCalendarLink` | GET `/events/id1/google-calendar-link/` | oui |
| `eventsAPI.getInstances` | GET `/events/id1/instances/` | oui |
| `eventsAPI.getInternalNotes` | GET `/events/id1/internal-notes/` | oui |
| `eventsAPI.getMapEvents` | GET `/events/map_events/` | oui |
| `eventsAPI.getMeSince` | GET `/me/since/` | non |
| `eventsAPI.getModerationPendingCount` | GET `/events/moderation-pending-count/` | non |
| `eventsAPI.getMyEvents` | GET `/events/my_events/` | oui |
| `eventsAPI.getNearbyEvents` | GET `/events/nearby/` | oui |
| `eventsAPI.getPendingValidation` | GET `/events/pending_validation/` | oui |
| `eventsAPI.getSatelliteEvents` | GET `/events/` | non |
| `eventsAPI.hostApproveEvent` | POST `/events/id1/host-approve/` | non |
| `eventsAPI.hostRejectEvent` | POST `/events/id1/host-reject/` | non |
| `eventsAPI.isFollowing` | GET `/events/id1/is_following/` | oui |
| `eventsAPI.patchEvent` | PATCH `/events/id1/` | oui |
| `eventsAPI.publishEvent` | POST `/events/id1/publish/` | oui |
| `eventsAPI.rejectEvent` | POST `/events/id1/reject_event/` | oui |
| `eventsAPI.removeImages` | POST `/events/id1/remove_images/` | non |
| `eventsAPI.requestChanges` | POST `/events/id1/request-changes/` | oui |
| `eventsAPI.requestFeature` | POST `/events/id1/request_feature/` | oui |
| `eventsAPI.saveInternalNotes` | POST `/events/id1/internal-notes/` | oui |
| `eventsAPI.searchEvents` | GET `/events/` | oui |
| `eventsAPI.submitForValidation` | POST `/events/id1/submit_for_validation/` | oui |
| `eventsAPI.unfollowEvent` | POST `/events/id1/unfollow/` | oui |
| `eventsAPI.updateEvent` | PUT `/events/id1/` | oui |
| `eventsAPI.updateFollowPreferences` | PATCH `/events/id1/update_follow_preferences/` | oui |
| `eventsAPI.updateFormField` | PUT `/form-fields/id1/` | oui |
| `eventsAPI.updateFormFields` | POST `/events/id1/update_form_fields/` | oui |
| `eventsAPI.uploadImages` | POST `/events/id1/upload_images/` | oui |
| `eventsAPI.validateEvent` | POST `/events/id1/validate_event/` | oui |
| `eventsAPI.verifyAccessCode` | POST `/events/id1/verify_access_code/` | oui |
| `tagsAPI.getTag` | GET `/tags/id1/` | oui |
| `tagsAPI.getTags` | GET `/tags/` | oui |

## exhibitors

| Fonction | Requête | Test dédié |
|---|---|---|
| `exhibitorsAPI.acceptApplication` | POST `/booth-applications/id1/accept/` | non |
| `exhibitorsAPI.acceptSalesContract` | POST `/exhibitor-sales-contracts/id1/accept/` | non |
| `exhibitorsAPI.createApplication` | POST `/booth-applications/` | non |
| `exhibitorsAPI.createBooth` | POST `/booths/` | non |
| `exhibitorsAPI.createCategory` | POST `/booth-categories/` | non |
| `exhibitorsAPI.createExhibitor` | POST `/exhibitors/` | non |
| `exhibitorsAPI.createSalesConfig` | POST `/exhibitor-sales-config/` | non |
| `exhibitorsAPI.deleteBooth` | DELETE `/booths/id1/` | non |
| `exhibitorsAPI.deleteCategory` | DELETE `/booth-categories/id1/` | non |
| `exhibitorsAPI.eraseMyLead` | POST `/exhibitor-leads/erase-mine/` | non |
| `exhibitorsAPI.getApplications` | GET `/booth-applications/` | non |
| `exhibitorsAPI.getBadgeManifest` | GET `/booth-badges/checkin-manifest/` | non |
| `exhibitorsAPI.getBookingPaymentOptions` | GET `/booth-bookings/id1/payment-options/` | non |
| `exhibitorsAPI.getBooths` | GET `/booths/` | non |
| `exhibitorsAPI.getCategories` | GET `/booth-categories/` | non |
| `exhibitorsAPI.getExhibitors` | GET `/exhibitors/` | non |
| `exhibitorsAPI.getLeadsAboutMe` | GET `/exhibitor-leads/about-me/` | non |
| `exhibitorsAPI.getMyBookings` | GET `/booth-bookings/` | non |
| `exhibitorsAPI.getMyLeads` | GET `/exhibitor-leads/mine/` | non |
| `exhibitorsAPI.getPublicDirectory` | GET `/events/id1/exhibitor-directory/` | non |
| `exhibitorsAPI.getSalesConfig` | GET `/exhibitor-sales-config/` | non |
| `exhibitorsAPI.getSalesContracts` | GET `/exhibitor-sales-contracts/` | non |
| `exhibitorsAPI.payBooking` | POST `/booth-bookings/id1/pay/` | non |
| `exhibitorsAPI.qualifyLead` | POST `/exhibitor-leads/qualify/` | non |
| `exhibitorsAPI.rejectApplication` | POST `/booth-applications/id1/reject/` | non |
| `exhibitorsAPI.scanLead` | POST `/exhibitor-leads/scan/` | non |
| `exhibitorsAPI.syncBadgeCheckins` | POST `/booth-badges/checkin-sync/` | non |
| `exhibitorsAPI.updateBooth` | PATCH `/booths/id1/` | non |
| `exhibitorsAPI.updateCategory` | PATCH `/booth-categories/id1/` | non |
| `exhibitorsAPI.updateExhibitor` | PATCH `/exhibitors/id1/` | non |
| `exhibitorsAPI.updateSalesConfig` | PATCH `/exhibitor-sales-config/id1/` | non |
| `exhibitorsAPI.verifyAndCheckInBadge` | POST `/booth-badges/verify-check-in/` | non |
| `exhibitorsAPI.waitlistApplication` | POST `/booth-applications/id1/waitlist/` | non |

## feedback

| Fonction | Requête | Test dédié |
|---|---|---|
| `feedbacksAPI.createFeedback` | POST `/feedbacks/` | oui |
| `feedbacksAPI.deleteFeedback` | DELETE `/feedbacks/id1/` | oui |
| `feedbacksAPI.getEventFeedbacks` | GET `/feedbacks/` | oui |
| `feedbacksAPI.getFeedback` | GET `/feedbacks/id1/` | oui |
| `feedbacksAPI.getFeedbacks` | GET `/feedbacks/` | oui |
| `feedbacksAPI.getMyFeedback` | GET `/feedbacks/my_feedback/` | oui |
| `feedbacksAPI.updateFeedback` | PUT `/feedbacks/id1/` | oui |
| `flagsAPI.createFlag` | POST `/flags/` | oui |
| `flagsAPI.getFlag` | GET `/flags/id1/` | oui |
| `flagsAPI.getFlags` | GET `/flags/` | oui |
| `flagsAPI.getUnresolvedFlags` | GET `/flags/unresolved/` | oui |
| `flagsAPI.resolveFlag` | POST `/flags/id1/resolve/` | oui |
| `validationsAPI.createValidation` | POST `/validations/` | oui |
| `validationsAPI.getEventStats` | GET `/validations/event_stats/` | oui |
| `validationsAPI.getValidation` | GET `/validations/id1/` | oui |
| `validationsAPI.getValidations` | GET `/validations/` | oui |
| `validationsAPI.updateValidation` | PUT `/validations/id1/` | oui |

## messages

| Fonction | Requête | Test dédié |
|---|---|---|
| `messagesAPI.acceptMessageRequest` | POST `/conversations/id1/accept_request/` | non |
| `messagesAPI.addParticipant` | POST `/conversations/id1/add_participant/` | oui |
| `messagesAPI.addReaction` | POST `/messages/id1/add_reaction/` | oui |
| `messagesAPI.archiveConversation` | POST `/conversations/id1/archive/` | oui |
| `messagesAPI.blockUser` | POST `/user-messaging-settings/block_user/` | oui |
| `messagesAPI.bulkDeleteMessages` | POST `/messages/bulk_delete/` | non |
| `messagesAPI.createConversation` | POST `/conversations/` | oui |
| `messagesAPI.declineMessageRequest` | POST `/conversations/id1/decline_request/` | non |
| `messagesAPI.deleteConversation` | DELETE `/conversations/id1/` | oui |
| `messagesAPI.deleteMessage` | DELETE `/messages/id1/` | oui |
| `messagesAPI.exportConversation` | GET `/conversations/id1/export/` | oui |
| `messagesAPI.forwardMessage` | POST `/messages/forward_message/` | oui |
| `messagesAPI.forwardMessages` | POST `/messages/forward/` | non |
| `messagesAPI.getBlockedUsers` | GET `/user-messaging-settings/blocked_list/` | oui |
| `messagesAPI.getConversation` | GET `/conversations/id1/` | oui |
| `messagesAPI.getConversationQuota` | GET `/conversations/id1/quota/` | oui |
| `messagesAPI.getConversations` | GET `/conversations/` | oui |
| `messagesAPI.getMessageRequests` | GET `/conversations/requests/` | non |
| `messagesAPI.getMessages` | GET `/messages/` | oui |
| `messagesAPI.getMutedList` | GET `/conversations/id1/muted-list/` | oui |
| `messagesAPI.getPresence` | GET `/conversations/presence/` | oui |
| `messagesAPI.getUserMessagingSettings` | GET `/user-messaging-settings/` | oui |
| `messagesAPI.leaveConversation` | POST `/conversations/id1/leave/` | non |
| `messagesAPI.markConversationAsRead` | POST `/conversations/id1/mark_as_read/` | oui |
| `messagesAPI.markMessageAsRead` | POST `/messages/id1/mark_as_read/` | oui |
| `messagesAPI.muteConversation` | POST `/user-messaging-settings/mute-conversation/` | oui |
| `messagesAPI.muteParticipant` | POST `/conversations/id1/mute/` | oui |
| `messagesAPI.removeParticipant` | POST `/conversations/id1/remove_participant/` | oui |
| `messagesAPI.removeReaction` | POST `/messages/id1/remove_reaction/` | oui |
| `messagesAPI.reportMessage` | POST `/message-reports/` | oui |
| `messagesAPI.searchMessages` | GET `/messages/search/` | oui |
| `messagesAPI.sendMessage` | POST `/messages/` | oui |
| `messagesAPI.setPostingMode` | PATCH `/conversations/id1/posting-mode/` | oui |
| `messagesAPI.starConversation` | POST `/conversations/id1/star/` | oui |
| `messagesAPI.starMessage` | POST `/messages/id1/star/` | oui |
| `messagesAPI.syncMessages` | GET `/messages/sync/` | non |
| `messagesAPI.unblockUser` | POST `/user-messaging-settings/unblock_user/` | oui |
| `messagesAPI.unmuteConversation` | POST `/user-messaging-settings/unmute-conversation/` | oui |
| `messagesAPI.unmuteParticipant` | POST `/conversations/id1/unmute/` | oui |
| `messagesAPI.updateConversation` | PATCH `/conversations/id1/` | oui |
| `messagesAPI.updateMessage` | PATCH `/messages/id1/` | oui |
| `messagesAPI.updateUserMessagingSettings` | PATCH `/user-messaging-settings/id1/` | oui |
| `messagesAPI.uploadAttachment` | POST `/messages/upload_attachment/` | oui |
| `messagesAPI.uploadVoiceMessage` | POST `/messages/upload_voice_message/` | oui |

## misc

| Fonction | Requête | Test dédié |
|---|---|---|
| `aiAssistAPI.description` | POST `/ai-assist/description/` | oui |
| `aiAssistAPI.generate` | POST `/ai-assist/generate/` | oui |
| `aiAssistAPI.optimizeTitle` | POST `/ai-assist/optimize-title/` | oui |
| `aiAssistAPI.pricing` | POST `/ai-assist/pricing/` | oui |
| `aiAssistAPI.seo` | POST `/ai-assist/seo/` | oui |
| `aiAssistAPI.suggestCategory` | POST `/ai-assist/suggest-category/` | oui |
| `aiAssistAPI.usage` | GET `/ai-assist/usage/` | oui |
| `comparisonAPI.compare` | GET `/events/compare/` | oui |
| `currencyAPI.convert` | GET `/commissions/convert/` | non |
| `eventTeamAPI.accept` | POST `/event-team/id1/accept/` | non |
| `eventTeamAPI.decline` | POST `/event-team/id1/decline/` | non |
| `eventTeamAPI.getMyTeamEvents` | GET `/event-team/my_events/` | non |
| `eventTeamAPI.getRolesCatalog` | GET `/event-team/roles-catalog/` | non |
| `eventTeamAPI.invite` | POST `/event-team/` | non |
| `eventTeamAPI.list` | GET `/event-team/` | non |
| `eventTeamAPI.lookupByToken` | GET `/event-team/invitation/id1/` | non |
| `eventTeamAPI.resend` | POST `/event-team/id1/resend/` | non |
| `eventTeamAPI.revoke` | POST `/event-team/id1/revoke/` | non |
| `exportAPI.download` | GET `id1` | non |
| `floorPlansAPI.createArea` | POST `/floor-plan-areas/` | non |
| `floorPlansAPI.deleteArea` | DELETE `/floor-plan-areas/id1/` | non |
| `floorPlansAPI.getAreas` | GET `/floor-plan-areas/` | non |
| `floorPlansAPI.getByEvent` | GET `/floor-plans/by_event/` | oui |
| `floorPlansAPI.getById` | GET `/floor-plans/id1/` | oui |
| `floorPlansAPI.updateArea` | PATCH `/floor-plan-areas/id1/` | non |
| `languagesAPI.list` | GET `/languages/` | non |
| `seatingAPI.cancelReservation` | POST `/seat-reservations/id1/cancel/` | oui |
| `seatingAPI.confirmReservation` | POST `/seat-reservations/id1/confirm/` | oui |
| `seatingAPI.createPlan` | POST `/seating-plans/` | oui |
| `seatingAPI.createReservation` | POST `/seat-reservations/` | oui |
| `seatingAPI.createZone` | POST `/seating-zones/` | oui |
| `seatingAPI.deletePlan` | DELETE `/seating-plans/id1/` | oui |
| `seatingAPI.deleteZone` | DELETE `/seating-zones/id1/` | oui |
| `seatingAPI.getAvailableSeats` | GET `/seating-plans/id1/available_seats/` | oui |
| `seatingAPI.getMyReservations` | GET `/seat-reservations/my_reservations/` | oui |
| `seatingAPI.getPlan` | GET `/seating-plans/id1/` | oui |
| `seatingAPI.getPlans` | GET `/seating-plans/` | oui |
| `seatingAPI.getZones` | GET `/seating-zones/` | oui |
| `seatingAPI.updatePlan` | PATCH `/seating-plans/id1/` | oui |
| `seatingAPI.updateZone` | PATCH `/seating-zones/id1/` | oui |
| `utmAPI.create` | POST `/utm/` | oui |
| `utmAPI.getAll` | GET `/utm/` | oui |
| `utmAPI.getStats` | GET `/utm/stats/` | oui |
| `venuesAPI.create` | POST `/venues/` | non |
| `venuesAPI.getAll` | GET `/venues/` | non |
| `venuesAPI.getById` | GET `/venues/id1/` | non |
| `venuesAPI.getEvents` | GET `/venues/id1/events/` | non |
| `venuesAPI.remove` | DELETE `/venues/id1/` | non |
| `venuesAPI.update` | PATCH `/venues/id1/` | non |
| `volunteersAPI.acceptApplication` | POST `/volunteer-applications/id1/accept/` | oui |
| `volunteersAPI.apply` | POST `/volunteer-applications/` | oui |
| `volunteersAPI.completeTask` | POST `/volunteer-tasks/id1/complete/` | oui |
| `volunteersAPI.createRole` | POST `/volunteer-roles/` | oui |
| `volunteersAPI.deleteRole` | DELETE `/volunteer-roles/id1/` | oui |
| `volunteersAPI.getMyApplications` | GET `/volunteer-applications/my_applications/` | oui |
| `volunteersAPI.getMyTasks` | GET `/volunteer-tasks/my_tasks/` | oui |
| `volunteersAPI.getReceivedApplications` | GET `/volunteer-applications/received/` | non |
| `volunteersAPI.getRoles` | GET `/volunteer-roles/` | oui |
| `volunteersAPI.rejectApplication` | POST `/volunteer-applications/id1/reject/` | oui |
| `volunteersAPI.updateRole` | PATCH `/volunteer-roles/id1/` | oui |
| `volunteersAPI.withdrawApplication` | POST `/volunteer-applications/id1/withdraw/` | oui |
| `waitlistAPI.cancelWaitlist` | POST `/waitlist/id1/cancel/` | oui |
| `waitlistAPI.getMyWaitlist` | GET `/waitlist/my_waitlist/` | oui |
| `waitlistAPI.getStatistics` | GET `/waitlist/statistics/` | oui |
| `waitlistAPI.getWaitlist` | GET `/waitlist/` | oui |
| `waitlistAPI.getWaitlistEntry` | GET `/waitlist/id1/` | oui |
| `waitlistAPI.joinWaitlist` | POST `/waitlist/join/` | oui |
| `waitlistAPI.notifyBatch` | POST `/waitlist/notify_batch/` | oui |
| `waitlistAPI.notifyEntry` | POST `/waitlist/id1/notify/` | oui |
| `waitlistSettingsAPI.createWaitlistSetting` | POST `/waitlist-settings/` | oui |
| `waitlistSettingsAPI.deleteWaitlistSetting` | DELETE `/waitlist-settings/id1/` | oui |
| `waitlistSettingsAPI.getWaitlistSetting` | GET `/waitlist-settings/id1/` | oui |
| `waitlistSettingsAPI.getWaitlistSettings` | GET `/waitlist-settings/` | oui |
| `waitlistSettingsAPI.updateWaitlistSetting` | PUT `/waitlist-settings/id1/` | oui |
| `webhooksAPI.create` | POST `/webhooks/` | oui |
| `webhooksAPI.delete` | DELETE `/webhooks/id1/` | oui |
| `webhooksAPI.deliveries` | GET `/webhooks/id1/deliveries/` | oui |
| `webhooksAPI.getAll` | GET `/webhooks/` | oui |
| `webhooksAPI.getById` | GET `/webhooks/id1/` | oui |
| `webhooksAPI.retry` | POST `/webhook-deliveries/id1/retry/` | oui |
| `webhooksAPI.stats` | GET `/webhooks/stats/` | oui |
| `webhooksAPI.test` | POST `/webhooks/id1/test/` | oui |
| `webhooksAPI.toggleActive` | POST `/webhooks/id1/toggle_active/` | oui |
| `webhooksAPI.update` | PATCH `/webhooks/id1/` | oui |

## notifications

| Fonction | Requête | Test dédié |
|---|---|---|
| `notificationTemplatesAPI.createTemplate` | POST `/notification-templates/` | oui |
| `notificationTemplatesAPI.deleteTemplate` | DELETE `/notification-templates/id1/` | oui |
| `notificationTemplatesAPI.getTemplate` | GET `/notification-templates/id1/` | oui |
| `notificationTemplatesAPI.getTemplates` | GET `/notification-templates/` | oui |
| `notificationTemplatesAPI.updateTemplate` | PUT `/notification-templates/id1/` | oui |
| `notificationsAPI.cancelScheduledNotification` | POST `/notifications/id1/cancel_scheduled/` | oui |
| `notificationsAPI.deleteMultiple` | POST `/notifications/delete_multiple/` | oui |
| `notificationsAPI.deleteNotification` | DELETE `/notifications/id1/` | oui |
| `notificationsAPI.getDevices` | GET `/notifications/devices/` | oui |
| `notificationsAPI.getNotification` | GET `/notifications/id1/` | oui |
| `notificationsAPI.getNotificationStatistics` | GET `/notifications/statistics/` | oui |
| `notificationsAPI.getNotifications` | GET `/notifications/` | oui |
| `notificationsAPI.getScheduledNotifications` | GET `/notifications/scheduled/` | oui |
| `notificationsAPI.getSocialFeed` | GET `/notifications/social_feed/` | non |
| `notificationsAPI.markAllAsRead` | POST `/notifications/mark_all_as_read/` | oui |
| `notificationsAPI.markAsRead` | POST `/notifications/id1/mark_as_read/` | oui |
| `notificationsAPI.registerDevice` | POST `/notifications/register-device/` | oui |
| `notificationsAPI.scheduleNotification` | POST `/notifications/schedule/` | oui |
| `notificationsAPI.sendNotification` | POST `/notifications/send/` | oui |
| `notificationsAPI.unregisterDevice` | POST `/notifications/unregister-device/` | oui |
| `notificationsAPI.updatePreferences` | PATCH `/notifications/preferences/` | oui |

## payments

| Fonction | Requête | Test dédié |
|---|---|---|
| `commissionsAPI.calculate` | POST `/commissions/calculate/` | oui |
| `commissionsAPI.convert` | GET `/commissions/convert/` | oui |
| `commissionsAPI.getCommissions` | GET `/commissions/` | oui |
| `commissionsAPI.getConfig` | GET `/commissions/config/` | oui |
| `commissionsAPI.getStats` | GET `/commissions/stats/` | oui |
| `invoicesAPI.downloadPdf` | GET `/invoices/id1/download_pdf/` | oui |
| `invoicesAPI.getInvoice` | GET `/invoices/id1/` | oui |
| `invoicesAPI.getInvoices` | GET `/invoices/` | oui |
| `paymentsAPI.calculateUsageFees` | POST `/payments/id1/calculate_usage_fees/` | oui |
| `paymentsAPI.cancelPayment` | POST `/payments/id1/cancel_payment/` | oui |
| `paymentsAPI.cinetpayReturn` | GET `/payments/cinetpay/return/` | oui |
| `paymentsAPI.createPayment` | POST `/payments/` | oui |
| `paymentsAPI.getPayment` | GET `/payments/id1/` | oui |
| `paymentsAPI.getPaymentHistory` | GET `/payments/` | oui |
| `paymentsAPI.getPaymentMethods` | GET `/payments/methods/` | oui |
| `paymentsAPI.getPayments` | GET `/payments/` | oui |
| `paymentsAPI.initializePayment` | POST `/payments/id1/initialize_payment/` | oui |
| `paymentsAPI.initiate` | POST `/payments/initiate/` | oui |
| `paymentsAPI.processMobileMoney` | POST `/payments/id1/process_mobile_money/` | oui |
| `paymentsAPI.processMtnMoney` | POST `/payments/id1/process_mtn_money/` | oui |
| `paymentsAPI.processOrangeMoney` | POST `/payments/id1/process_orange_money/` | oui |
| `paymentsAPI.supportedCountries` | GET `/payments/supported-countries/` | non |
| `paymentsAPI.ticketPriceCap` | GET `/payments/ticket-price-cap/` | non |
| `paymentsAPI.updatePayment` | PUT `/payments/id1/` | oui |
| `paymentsAPI.verifyPayment` | GET `/payments/id1/verify_payment/` | oui |
| `payoutsAPI.cancelPayout` | POST `/payouts/id1/cancel/` | oui |
| `payoutsAPI.getAvailableMethods` | GET `/payouts/methods/` | oui |
| `payoutsAPI.getPayout` | GET `/payouts/id1/` | oui |
| `payoutsAPI.getPayouts` | GET `/payouts/` | oui |
| `payoutsAPI.instantPayout` | POST `/payouts/instant-payout/` | non |
| `payoutsAPI.processPayout` | POST `/payouts/id1/process/` | oui |
| `payoutsAPI.requestPayout` | POST `/payouts/request_payout/` | oui |
| `refundsAPI.createRefund` | POST `/refunds/` | oui |
| `refundsAPI.getRefund` | GET `/refunds/id1/` | oui |
| `refundsAPI.getRefunds` | GET `/refunds/` | oui |
| `refundsAPI.processRefund` | POST `/refunds/id1/process_refund/` | oui |
| `subscriptionsAPI.cancel` | POST `/subscriptions/cancel/` | oui |
| `subscriptionsAPI.getCurrentPlan` | GET `/subscription-plans/current/` | oui |
| `subscriptionsAPI.getMySubscription` | GET `/subscriptions/my_subscription/` | oui |
| `subscriptionsAPI.getPlans` | GET `/subscription-plans/` | oui |
| `subscriptionsAPI.getPrices` | GET `/subscription-plans/prices/` | oui |
| `subscriptionsAPI.paymentHistory` | GET `/subscriptions/payment-history/` | oui |
| `subscriptionsAPI.processPayment` | POST `/subscriptions/process-payment/` | oui |
| `subscriptionsAPI.upgrade` | POST `/subscriptions/upgrade/` | oui |
| `subscriptionsAPI.verifyPayment` | GET `/subscriptions/verify-payment/id1/` | oui |
| `walletAPI.getMyWallet` | GET `/wallet/my_wallet/` | oui |
| `walletAPI.getPendingEarnings` | GET `/wallet/pending_earnings/` | oui |
| `walletAPI.getStats` | GET `/wallet/stats/` | oui |
| `walletAPI.getTransactions` | GET `/wallet/transactions/` | oui |
| `walletAPI.stripeOnboardingLink` | POST `/wallet/stripe-onboarding-link/` | non |
| `walletAPI.updateBankDetails` | PATCH `/wallet/update_bank_details/` | oui |

## registrations

| Fonction | Requête | Test dédié |
|---|---|---|
| `registrationsAPI.addTickets` | POST `/registrations/id1/add_tickets/` | oui |
| `registrationsAPI.approveRegistration` | POST `/registrations/id1/approve/` | oui |
| `registrationsAPI.bulkApprove` | POST `/registrations/bulk_approve/` | oui |
| `registrationsAPI.bulkCheckIn` | POST `/registrations/bulk_check_in/` | oui |
| `registrationsAPI.bulkGenerateTickets` | POST `/registrations/bulk_generate_tickets/` | oui |
| `registrationsAPI.bulkReject` | POST `/registrations/bulk_reject/` | oui |
| `registrationsAPI.cancelRegistration` | POST `/registrations/id1/cancel/` | oui |
| `registrationsAPI.checkIn` | POST `/registrations/id1/check_in/` | oui |
| `registrationsAPI.createRegistration` | POST `/registrations/` | oui |
| `registrationsAPI.deleteRegistration` | DELETE `/registrations/id1/` | oui |
| `registrationsAPI.generateQrCodes` | POST `/registrations/id1/generate_qr_codes/` | oui |
| `registrationsAPI.getAccessibleSessions` | GET `/registrations/id1/accessible-sessions/` | oui |
| `registrationsAPI.getAttendanceProofs` | GET `/ticket-purchases/attendance-proofs/` | non |
| `registrationsAPI.getByUser` | GET `/registrations/by_user/` | oui |
| `registrationsAPI.getCheckinManifest` | GET `/ticket-purchases/checkin-manifest/` | non |
| `registrationsAPI.getEventDirectory` | GET `/registrations/event-directory/` | non |
| `registrationsAPI.getLiveOps` | GET `/registrations/live-ops/` | non |
| `registrationsAPI.getMyLiveRegistrations` | GET `/registrations/live/` | non |
| `registrationsAPI.getMyRegistrations` | GET `/registrations/my_registrations/` | oui |
| `registrationsAPI.getPendingApproval` | GET `/registrations/pending_approval/` | oui |
| `registrationsAPI.getRegistration` | GET `/registrations/id1/` | oui |
| `registrationsAPI.getRegistrationStats` | GET `/registrations/stats/` | oui |
| `registrationsAPI.getRegistrations` | GET `/registrations/` | oui |
| `registrationsAPI.getYearInReview` | GET `/me/year-in-review/` | non |
| `registrationsAPI.patchRegistration` | PATCH `/registrations/id1/` | oui |
| `registrationsAPI.rejectRegistration` | POST `/registrations/id1/reject/` | oui |
| `registrationsAPI.resendConfirmation` | POST `/registrations/id1/resend_confirmation/` | oui |
| `registrationsAPI.searchRegistrations` | GET `/registrations/search/` | oui |
| `registrationsAPI.sendEmail` | POST `/registrations/send_email/` | oui |
| `registrationsAPI.setAttendanceIntent` | POST `/registrations/id1/attendance-intent/` | non |
| `registrationsAPI.setExhibitorScanOptIn` | POST `/registrations/id1/networking/` | non |
| `registrationsAPI.setNetworkingOptIn` | POST `/registrations/id1/networking/` | non |
| `registrationsAPI.syncCheckins` | POST `/ticket-purchases/checkin-sync/` | non |
| `registrationsAPI.updateRegistration` | PUT `/registrations/id1/` | oui |
| `registrationsAPI.updateTickets` | POST `/registrations/id1/update_tickets/` | oui |
| `registrationsAPI.verifyAndCheckIn` | POST `/registrations/verify_and_check_in/` | oui |
| `registrationsAPI.verifyAndCheckInTicket` | POST `/registrations/verify_and_check_in_ticket/` | oui |
| `registrationsAPI.verifyTicket` | POST `/registrations/verify_ticket/` | oui |

## sessions

| Fonction | Requête | Test dédié |
|---|---|---|
| `sessionRegistrationsAPI.createSessionRegistration` | POST `/session-registrations/` | oui |
| `sessionRegistrationsAPI.deleteSessionRegistration` | DELETE `/session-registrations/id1/` | oui |
| `sessionRegistrationsAPI.getSessionRegistration` | GET `/session-registrations/id1/` | oui |
| `sessionRegistrationsAPI.getSessionRegistrations` | GET `/session-registrations/` | oui |
| `sessionRegistrationsAPI.updateSessionRegistration` | PUT `/session-registrations/id1/` | oui |
| `sessionResourcesAPI.createSessionResource` | POST `/session-resources/` | oui |
| `sessionResourcesAPI.deleteSessionResource` | DELETE `/session-resources/id1/` | oui |
| `sessionResourcesAPI.downloadResource` | POST `/session-resources/id1/download/` | oui |
| `sessionResourcesAPI.getSessionResource` | GET `/session-resources/id1/` | oui |
| `sessionResourcesAPI.getSessionResources` | GET `/session-resources/` | oui |
| `sessionResourcesAPI.updateSessionResource` | PUT `/session-resources/id1/` | oui |
| `sessionsAPI.addResource` | POST `/sessions/id1/add_resource/` | oui |
| `sessionsAPI.createSession` | POST `/sessions/` | oui |
| `sessionsAPI.deleteSession` | DELETE `/sessions/id1/` | oui |
| `sessionsAPI.getAttendees` | GET `/sessions/id1/attendees/` | oui |
| `sessionsAPI.getCalendar` | GET `/sessions/calendar/` | oui |
| `sessionsAPI.getMySessions` | GET `/sessions/my_sessions/` | oui |
| `sessionsAPI.getSession` | GET `/sessions/id1/` | oui |
| `sessionsAPI.getSessions` | GET `/sessions/` | oui |
| `sessionsAPI.getStatistics` | GET `/sessions/id1/statistics/` | oui |
| `sessionsAPI.getWaitlistStatus` | GET `/sessions/id1/waitlist_status/` | oui |
| `sessionsAPI.joinWaitlist` | POST `/sessions/id1/join_waitlist/` | oui |
| `sessionsAPI.leaveWaitlist` | POST `/sessions/id1/leave_waitlist/` | oui |
| `sessionsAPI.markAttended` | POST `/sessions/id1/mark_attended/` | oui |
| `sessionsAPI.registerToSession` | POST `/sessions/id1/register/` | oui |
| `sessionsAPI.scanAttendance` | POST `/sessions/id1/scan_attendance/` | oui |
| `sessionsAPI.unregisterFromSession` | POST `/sessions/id1/unregister/` | oui |
| `sessionsAPI.updateSession` | PUT `/sessions/id1/` | oui |
| `speakersAPI.createSpeaker` | POST `/speakers/` | oui |
| `speakersAPI.deleteSpeaker` | DELETE `/speakers/id1/` | oui |
| `speakersAPI.getSpeaker` | GET `/speakers/id1/` | oui |
| `speakersAPI.getSpeakerSessions` | GET `/speakers/id1/sessions/` | oui |
| `speakersAPI.getSpeakers` | GET `/speakers/` | oui |
| `speakersAPI.patchSpeaker` | PATCH `/speakers/id1/` | oui |
| `speakersAPI.updateSpeaker` | PUT `/speakers/id1/` | oui |
| `speakersAPI.uploadPhoto` | PATCH `/speakers/id1/` | oui |
| `tracksAPI.createTrack` | POST `/tracks/` | oui |
| `tracksAPI.deleteTrack` | DELETE `/tracks/id1/` | oui |
| `tracksAPI.getTrack` | GET `/tracks/id1/` | oui |
| `tracksAPI.getTracks` | GET `/tracks/` | oui |
| `tracksAPI.updateTrack` | PUT `/tracks/id1/` | oui |

## social

| Fonction | Requête | Test dédié |
|---|---|---|
| `advertisementsAPI.create` | POST `/advertisements/` | oui |
| `advertisementsAPI.delete` | DELETE `/advertisements/id1/` | oui |
| `advertisementsAPI.get` | GET `/advertisements/id1/` | oui |
| `advertisementsAPI.getNearby` | GET `/advertisements/nearby/` | oui |
| `advertisementsAPI.list` | GET `/advertisements/` | oui |
| `advertisementsAPI.recordClick` | POST `/advertisements/id1/click/` | oui |
| `advertisementsAPI.recordView` | POST `/advertisements/id1/view/` | oui |
| `advertisementsAPI.update` | PATCH `/advertisements/id1/` | oui |
| `gamificationAPI.getBadges` | GET `/gamification/badges/` | oui |
| `gamificationAPI.getLeaderboard` | GET `/gamification/leaderboard/` | oui |
| `gamificationAPI.getMyBadges` | GET `/gamification/user-badges/my_badges/` | oui |
| `gamificationAPI.getMyRank` | GET `/gamification/leaderboard/my_rank/` | oui |
| `gamificationAPI.getPointsBalance` | GET `/gamification/points/balance/` | oui |
| `gamificationAPI.getPointsHistory` | GET `/gamification/points/` | oui |
| `gamificationAPI.getPointsSummary` | GET `/gamification/points/summary/` | oui |
| `invitationsAPI.accept` | POST `/invitations/id1/accept/` | oui |
| `invitationsAPI.bulkInvite` | POST `/invitations/` | oui |
| `invitationsAPI.cancel` | DELETE `/invitations/id1/` | oui |
| `invitationsAPI.create` | POST `/invitations/` | oui |
| `invitationsAPI.decline` | POST `/invitations/id1/decline/` | oui |
| `invitationsAPI.getAll` | GET `/invitations/` | oui |
| `invitationsAPI.getById` | GET `/invitations/id1/` | oui |
| `invitationsAPI.getMyInvitations` | GET `/invitations/my_invitations/` | oui |
| `invitationsAPI.remind` | POST `/invitations/id1/remind/` | non |
| `invitationsAPI.remindPending` | POST `/invitations/remind-pending/` | non |
| `invitationsAPI.respondByToken` | GET `/invitations/by_token/` + POST `/invitations/{id}/accept/` (ou `decline/`) | oui |
| `recommendationsAPI.forgetPreferences` | DELETE `/recommendations/preferences/` | non |
| `recommendationsAPI.getPreferences` | GET `/recommendations/preferences/` | non |
| `recommendationsAPI.getRecommendations` | GET `/recommendations/` | oui |
| `recommendationsAPI.getSimilar` | GET `/recommendations/id1/similar/` | oui |
| `recommendationsAPI.recordInteraction` | POST `/recommendations/record_interaction/` | oui |
| `referralsAPI.createCode` | POST `/referrals/codes/` | oui |
| `referralsAPI.deleteCode` | DELETE `/referrals/codes/id1/` | oui |
| `referralsAPI.getCode` | GET `/referrals/codes/id1/` | oui |
| `referralsAPI.getCodes` | GET `/referrals/codes/` | oui |
| `referralsAPI.getStats` | GET `/referrals/codes/id1/stats/` | oui |
| `referralsAPI.trackClick` | POST `/referrals/track/` | oui |
| `referralsAPI.updateCode` | PATCH `/referrals/codes/id1/` | oui |
| `socialAPI.acceptConnection` | POST `/social/connections/id1/accept/` | oui |
| `socialAPI.cancelConnection` | POST `/social/connections/id1/cancel/` | oui |
| `socialAPI.declineConnection` | POST `/social/connections/id1/decline/` | oui |
| `socialAPI.getConnections` | GET `/social/connections/` | oui |
| `socialAPI.getEventAttendees` | GET `/social/connections/event_attendees/` | oui |
| `socialAPI.getEventFeed` | GET `/social/feed/event_feed/` | oui |
| `socialAPI.getFeed` | GET `/social/feed/` | oui |
| `socialAPI.getMyConnections` | GET `/social/connections/my_connections/` | oui |
| `socialAPI.getMyFeed` | GET `/social/feed/my_feed/` | oui |
| `socialAPI.sendConnectionRequest` | POST `/social/connections/` | oui |

## status

| Fonction | Requête | Test dédié |
|---|---|---|
| `statusAPI.addUpdate` | POST `/admin/incidents/id1/updates/` | oui |
| `statusAPI.create` | POST `/admin/incidents/` | oui |
| `statusAPI.delete` | DELETE `/admin/incidents/id1/` | oui |
| `statusAPI.getAdmin` | GET `/admin/incidents/id1/` | oui |
| `statusAPI.getHistory` | GET `/status/incidents/` | oui |
| `statusAPI.getIncident` | GET `/status/incidents/id1/` | oui |
| `statusAPI.getServices` | GET `/status/services/` | oui |
| `statusAPI.getSnapshot` | GET `/status/` | oui |
| `statusAPI.listAdmin` | GET `/admin/incidents/` | oui |
| `statusAPI.resolve` | POST `/admin/incidents/id1/resolve/` | oui |
| `statusAPI.update` | PATCH `/admin/incidents/id1/` | oui |

## tickets

| Fonction | Requête | Test dédié |
|---|---|---|
| `discountsAPI.createDiscount` | POST `/discounts/` | oui |
| `discountsAPI.deleteDiscount` | DELETE `/discounts/id1/` | oui |
| `discountsAPI.getDiscount` | GET `/discounts/id1/` | oui |
| `discountsAPI.getDiscounts` | GET `/discounts/` | oui |
| `discountsAPI.patchDiscount` | PATCH `/discounts/id1/` | oui |
| `discountsAPI.updateDiscount` | PUT `/discounts/id1/` | oui |
| `discountsAPI.validateDiscount` | POST `/discounts/validate_code/` | oui |
| `priceTiersAPI.create` | POST `/ticket-price-tiers/` | non |
| `priceTiersAPI.list` | GET `/ticket-price-tiers/` | non |
| `priceTiersAPI.remove` | DELETE `/ticket-price-tiers/id1/` | non |
| `priceTiersAPI.update` | PATCH `/ticket-price-tiers/id1/` | non |
| `ticketPurchasesAPI.applePassUrl` | — (construit une URL) | non |
| `ticketPurchasesAPI.checkIn` | POST `/ticket-purchases/id1/check_in/` | oui |
| `ticketPurchasesAPI.createTicketPurchase` | POST `/ticket-purchases/` | oui |
| `ticketPurchasesAPI.getGooglePassUrl` | GET `/ticket-purchases/id1/google-pass/` | non |
| `ticketPurchasesAPI.getMyPurchases` | GET `/ticket-purchases/my_purchases/` | oui |
| `ticketPurchasesAPI.getMyTickets` | GET `/ticket-purchases/` | oui |
| `ticketPurchasesAPI.getTicketPurchase` | GET `/ticket-purchases/id1/` | oui |
| `ticketPurchasesAPI.getTicketPurchases` | GET `/ticket-purchases/` | oui |
| `ticketPurchasesAPI.getWalletStatus` | GET `/ticket-purchases/wallet-status/` | non |
| `ticketPurchasesAPI.updateTicketPurchase` | PUT `/ticket-purchases/id1/` | oui |
| `ticketTransfersAPI.acceptByToken` | POST `/ticket-transfers/accept_by_token/` | oui |
| `ticketTransfersAPI.acceptTransfer` | POST `/ticket-transfers/id1/accept/` | oui |
| `ticketTransfersAPI.cancelTransfer` | POST `/ticket-transfers/id1/cancel/` | oui |
| `ticketTransfersAPI.createTransfer` | POST `/ticket-transfers/` | oui |
| `ticketTransfersAPI.declineByToken` | POST `/ticket-transfers/decline_by_token/` | oui |
| `ticketTransfersAPI.declineTransfer` | POST `/ticket-transfers/id1/decline/` | oui |
| `ticketTransfersAPI.getByToken` | GET `/ticket-transfers/by_token/` | oui |
| `ticketTransfersAPI.getPendingTransfers` | GET `/ticket-transfers/pending/` | oui |
| `ticketTransfersAPI.getReceivedTransfers` | GET `/ticket-transfers/received/` | oui |
| `ticketTransfersAPI.getSentTransfers` | GET `/ticket-transfers/sent/` | oui |
| `ticketTransfersAPI.getTransfers` | GET `/ticket-transfers/` | oui |
| `ticketTypesAPI.createTicketType` | POST `/ticket-types/` | oui |
| `ticketTypesAPI.deleteTicketType` | DELETE `/ticket-types/id1/` | oui |
| `ticketTypesAPI.getTicketType` | GET `/ticket-types/id1/` | oui |
| `ticketTypesAPI.getTicketTypes` | GET `/ticket-types/` | oui |
| `ticketTypesAPI.patchTicketType` | PATCH `/ticket-types/id1/` | oui |
| `ticketTypesAPI.updateTicketType` | PUT `/ticket-types/id1/` | oui |
| `ticketsAPI.applePassUrl` | — (construit une URL) | non |
| `ticketsAPI.checkIn` | POST `/ticket-purchases/id1/check_in/` | non |
| `ticketsAPI.createTicketPurchase` | POST `/ticket-purchases/` | non |
| `ticketsAPI.getGooglePassUrl` | GET `/ticket-purchases/id1/google-pass/` | non |
| `ticketsAPI.getMyPurchases` | GET `/ticket-purchases/my_purchases/` | non |
| `ticketsAPI.getMyTickets` | GET `/ticket-purchases/` | non |
| `ticketsAPI.getTicketPurchase` | GET `/ticket-purchases/id1/` | non |
| `ticketsAPI.getTicketPurchases` | GET `/ticket-purchases/` | non |
| `ticketsAPI.getWalletStatus` | GET `/ticket-purchases/wallet-status/` | non |
| `ticketsAPI.updateTicketPurchase` | PUT `/ticket-purchases/id1/` | non |

## weddings

| Fonction | Requête | Test dédié |
|---|---|---|
| `weddingOrganizerAPI.assignGuest` | POST `/guest-tables/id1/assign/` | non |
| `weddingOrganizerAPI.cancelInvitation` | DELETE `/invitations/id1/` | non |
| `weddingOrganizerAPI.createItem` | POST `/gift-items/` | non |
| `weddingOrganizerAPI.createRegistry` | POST `/gift-registries/` | non |
| `weddingOrganizerAPI.createTable` | POST `/guest-tables/` | non |
| `weddingOrganizerAPI.deleteItem` | DELETE `/gift-items/id1/` | non |
| `weddingOrganizerAPI.deleteRegistry` | DELETE `/gift-registries/id1/` | non |
| `weddingOrganizerAPI.deleteTable` | DELETE `/guest-tables/id1/` | non |
| `weddingOrganizerAPI.getGuestList` | GET `/invitations/guest-list/` | non |
| `weddingOrganizerAPI.getTables` | GET `/guest-tables/` | non |
| `weddingOrganizerAPI.importGuestsCsv` | POST `/invitations/import-csv/` | non |
| `weddingOrganizerAPI.remindOne` | POST `/invitations/id1/remind/` | non |
| `weddingOrganizerAPI.remindPending` | POST `/invitations/remind-pending/` | non |
| `weddingOrganizerAPI.setGuestRsvp` | POST `/invitations/id1/organizer-rsvp/` | non |
| `weddingOrganizerAPI.unassignGuest` | POST `/guest-tables/unassign/` | non |
| `weddingOrganizerAPI.updateItem` | PATCH `/gift-items/id1/` | non |
| `weddingOrganizerAPI.updateRegistry` | PATCH `/gift-registries/id1/` | non |
| `weddingOrganizerAPI.updateTable` | PATCH `/guest-tables/id1/` | non |
| `weddingsAPI.contribute` | POST `/gift-registries/id1/contribute/` | non |
| `weddingsAPI.getContributions` | GET `/gift-registries/id1/contributions/` | non |
| `weddingsAPI.getRegistryByEvent` | GET `/gift-registries/` | non |
| `weddingsAPI.invitationByToken` | GET `/invitations/by_token/` | non |
| `weddingsAPI.respondByToken` | POST `/invitations/respond-by-token/` | non |
