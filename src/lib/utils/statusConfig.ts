/**
 * Configuration centralisee des statuts pour l'application EventEz Mobile.
 * Utilisee par MyTicketsScreen, QRCodeScreen, EventRegistrationsScreen, MyPaymentsScreen, etc.
 */

import { Colors } from '../../constants/theme';

export interface StatusConfigItem {
  label: string;
  color: string;
  bgColor: string;
  icon: string; // Ionicons name
}

// ============================================
// REGISTRATION STATUS CONFIG
// ============================================

export const registrationStatusConfig: Record<string, StatusConfigItem> = {
  pending: {
    label: 'En attente',
    color: Colors.warning,
    bgColor: Colors.warningLight,
    icon: 'time-outline',
  },
  pending_approval: {
    label: 'En attente d\'approbation',
    color: Colors.warning,
    bgColor: Colors.warningLight,
    icon: 'hourglass-outline',
  },
  confirmed: {
    label: 'Confirm\u00e9e',
    color: Colors.success,
    bgColor: Colors.successLight,
    icon: 'checkmark-circle-outline',
  },
  cancelled: {
    label: 'Annul\u00e9e',
    color: Colors.error,
    bgColor: Colors.errorLight,
    icon: 'close-circle-outline',
  },
  rejected: {
    label: 'Rejet\u00e9e',
    color: Colors.error,
    bgColor: Colors.errorLight,
    icon: 'ban-outline',
  },
  completed: {
    label: 'Termin\u00e9e',
    color: Colors.info,
    bgColor: Colors.infoLight,
    icon: 'checkmark-done-outline',
  },
  checked_in: {
    label: 'Enregistr\u00e9(e)',
    color: Colors.success,
    bgColor: Colors.successLight,
    icon: 'enter-outline',
  },
};

// ============================================
// PAYMENT STATUS CONFIG
// ============================================

export const paymentStatusConfig: Record<string, StatusConfigItem> = {
  pending: {
    label: 'En attente',
    color: Colors.warning,
    bgColor: Colors.warningLight,
    icon: 'time-outline',
  },
  processing: {
    label: 'En cours',
    color: Colors.info,
    bgColor: Colors.infoLight,
    icon: 'sync-outline',
  },
  completed: {
    label: 'Pay\u00e9',
    color: Colors.success,
    bgColor: Colors.successLight,
    icon: 'checkmark-circle-outline',
  },
  failed: {
    label: '\u00c9chou\u00e9',
    color: Colors.error,
    bgColor: Colors.errorLight,
    icon: 'alert-circle-outline',
  },
  refunded: {
    label: 'Rembours\u00e9',
    color: Colors.gray600,
    bgColor: Colors.gray100,
    icon: 'return-down-back-outline',
  },
  cancelled: {
    label: 'Annul\u00e9',
    color: Colors.error,
    bgColor: Colors.errorLight,
    icon: 'close-circle-outline',
  },
};

// ============================================
// EVENT STATUS CONFIG
// ============================================

export const eventStatusConfig: Record<string, StatusConfigItem> = {
  draft: {
    label: 'Brouillon',
    color: Colors.gray600,
    bgColor: Colors.gray100,
    icon: 'create-outline',
  },
  submitted: {
    label: 'Soumis',
    color: Colors.warning,
    bgColor: Colors.warningLight,
    icon: 'paper-plane-outline',
  },
  validated: {
    label: 'Valid\u00e9',
    color: Colors.success,
    bgColor: Colors.successLight,
    icon: 'checkmark-circle-outline',
  },
  rejected: {
    label: 'Rejet\u00e9',
    color: Colors.error,
    bgColor: Colors.errorLight,
    icon: 'close-circle-outline',
  },
  completed: {
    label: 'Termin\u00e9',
    color: Colors.info,
    bgColor: Colors.infoLight,
    icon: 'checkmark-done-outline',
  },
  cancelled: {
    label: 'Annul\u00e9',
    color: Colors.error,
    bgColor: Colors.errorLight,
    icon: 'ban-outline',
  },
};

// ============================================
// GENERIC STATUS GETTER
// ============================================

const defaultStatusConfig: StatusConfigItem = {
  label: 'Inconnu',
  color: Colors.gray500,
  bgColor: Colors.gray100,
  icon: 'help-circle-outline',
};

/**
 * Retourne la configuration d'un statut pour un type donne.
 * Fournit un fallback par defaut si le statut n'est pas reconnu.
 */
export function getStatusConfig(
  type: 'registration' | 'payment' | 'event',
  status: string
): StatusConfigItem {
  switch (type) {
    case 'registration':
      return registrationStatusConfig[status] || defaultStatusConfig;
    case 'payment':
      return paymentStatusConfig[status] || defaultStatusConfig;
    case 'event':
      return eventStatusConfig[status] || defaultStatusConfig;
    default:
      return defaultStatusConfig;
  }
}
