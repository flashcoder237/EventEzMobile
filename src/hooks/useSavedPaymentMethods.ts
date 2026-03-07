/**
 * Hook pour la gestion des moyens de paiement sauvegardés
 * Utilise SecureStore pour stocker les numéros de téléphone Mobile Money de manière sécurisée
 */

import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const PAYMENT_METHODS_KEY = 'eventez_saved_payment_methods';
const MAX_SAVED_METHODS = 5;

export type PaymentMethodType = 'mtn_money' | 'orange_money' | 'credit_card' | 'wave' | 'mpesa' | 'airtel_money';

export interface SavedPaymentMethod {
  id: string;
  type: PaymentMethodType;
  phoneNumber: string; // Stored in full, but displayed masked
  displayName: string; // "MTN ****1234" or "Orange ****5678"
  lastUsed: number;
  createdAt: number;
}

// Helpers pour déterminer le type depuis le numéro
const getMtnPrefixes = () => ['67', '68', '77', '78', '650', '651', '652', '653', '654'];
const getOrangePrefixes = () => ['69', '655', '656', '657', '658', '659', '55', '59'];

export function detectPaymentType(phoneNumber: string): PaymentMethodType | null {
  const cleanNumber = phoneNumber.replace(/\s/g, '');

  // Vérifier MTN
  for (const prefix of getMtnPrefixes()) {
    if (cleanNumber.startsWith(prefix) || cleanNumber.startsWith('237' + prefix)) {
      return 'mtn_money';
    }
  }

  // Vérifier Orange
  for (const prefix of getOrangePrefixes()) {
    if (cleanNumber.startsWith(prefix) || cleanNumber.startsWith('237' + prefix)) {
      return 'orange_money';
    }
  }

  return null;
}

export function maskPhoneNumber(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/\s/g, '');
  if (cleanNumber.length < 4) return '****';
  return '****' + cleanNumber.slice(-4);
}

export function getPaymentMethodLabel(type: PaymentMethodType): string {
  switch (type) {
    case 'mtn_money':
      return 'MTN Mobile Money';
    case 'orange_money':
      return 'Orange Money';
    case 'wave':
      return 'Wave';
    case 'mpesa':
      return 'M-Pesa';
    case 'airtel_money':
      return 'Airtel Money';
    default:
      return 'Mobile Money';
  }
}

export function useSavedPaymentMethods() {
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les méthodes sauvegardées
  useEffect(() => {
    loadSavedMethods();
  }, []);

  const loadSavedMethods = async () => {
    try {
      const data = await SecureStore.getItemAsync(PAYMENT_METHODS_KEY);
      if (data) {
        const methods: SavedPaymentMethod[] = JSON.parse(data);
        // Trier par dernière utilisation (plus récent en premier)
        methods.sort((a, b) => b.lastUsed - a.lastUsed);
        setSavedMethods(methods);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement moyens de paiement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les méthodes
  const saveMethods = useCallback(async (methods: SavedPaymentMethod[]) => {
    try {
      await SecureStore.setItemAsync(PAYMENT_METHODS_KEY, JSON.stringify(methods));
      setSavedMethods(methods);
    } catch (error) {
      if (__DEV__) console.error('Erreur sauvegarde moyens de paiement:', error);
    }
  }, []);

  // Ajouter ou mettre à jour un moyen de paiement
  const savePaymentMethod = useCallback(async (phoneNumber: string, type?: PaymentMethodType): Promise<SavedPaymentMethod | null> => {
    const cleanNumber = phoneNumber.replace(/\s/g, '');

    // Détecter le type si non fourni
    const methodType = type || detectPaymentType(cleanNumber);
    if (!methodType) {
      if (__DEV__) console.warn('Type de paiement non détecté pour:', cleanNumber);
      return null;
    }

    // Vérifier si ce numéro existe déjà
    const existingIndex = savedMethods.findIndex(m => m.phoneNumber === cleanNumber);
    const now = Date.now();

    if (existingIndex !== -1) {
      // Mettre à jour la date de dernière utilisation
      const updatedMethods = [...savedMethods];
      updatedMethods[existingIndex] = {
        ...updatedMethods[existingIndex],
        lastUsed: now,
      };
      updatedMethods.sort((a, b) => b.lastUsed - a.lastUsed);
      await saveMethods(updatedMethods);
      return updatedMethods[existingIndex];
    }

    // Créer un nouveau moyen de paiement
    const newMethod: SavedPaymentMethod = {
      id: `pm_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type: methodType,
      phoneNumber: cleanNumber,
      displayName: `${getPaymentMethodLabel(methodType).split(' ')[0]} ${maskPhoneNumber(cleanNumber)}`,
      lastUsed: now,
      createdAt: now,
    };

    // Ajouter en tête de liste
    let newMethods = [newMethod, ...savedMethods];

    // Limiter le nombre de méthodes sauvegardées
    if (newMethods.length > MAX_SAVED_METHODS) {
      newMethods = newMethods.slice(0, MAX_SAVED_METHODS);
    }

    await saveMethods(newMethods);
    return newMethod;
  }, [savedMethods, saveMethods]);

  // Supprimer un moyen de paiement
  const removePaymentMethod = useCallback(async (id: string): Promise<boolean> => {
    const newMethods = savedMethods.filter(m => m.id !== id);
    if (newMethods.length === savedMethods.length) {
      return false;
    }
    await saveMethods(newMethods);
    return true;
  }, [savedMethods, saveMethods]);

  // Supprimer tous les moyens de paiement
  const clearAllPaymentMethods = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(PAYMENT_METHODS_KEY);
    setSavedMethods([]);
  }, []);

  // Obtenir le moyen de paiement le plus récent d'un type donné
  const getLastUsedMethod = useCallback((type?: PaymentMethodType): SavedPaymentMethod | null => {
    if (!type) {
      return savedMethods[0] || null;
    }
    return savedMethods.find(m => m.type === type) || null;
  }, [savedMethods]);

  // Obtenir tous les moyens de paiement d'un type donné
  const getMethodsByType = useCallback((type: PaymentMethodType): SavedPaymentMethod[] => {
    return savedMethods.filter(m => m.type === type);
  }, [savedMethods]);

  // Mettre à jour la date de dernière utilisation
  const markAsUsed = useCallback(async (id: string): Promise<void> => {
    const index = savedMethods.findIndex(m => m.id === id);
    if (index === -1) return;

    const updatedMethods = [...savedMethods];
    updatedMethods[index] = {
      ...updatedMethods[index],
      lastUsed: Date.now(),
    };
    updatedMethods.sort((a, b) => b.lastUsed - a.lastUsed);
    await saveMethods(updatedMethods);
  }, [savedMethods, saveMethods]);

  return {
    // État
    savedMethods,
    loading,
    hasSavedMethods: savedMethods.length > 0,

    // Actions
    savePaymentMethod,
    removePaymentMethod,
    clearAllPaymentMethods,
    getLastUsedMethod,
    getMethodsByType,
    markAsUsed,
    refresh: loadSavedMethods,
  };
}

// Export des helpers pour utilisation externe
export { getMtnPrefixes, getOrangePrefixes };
