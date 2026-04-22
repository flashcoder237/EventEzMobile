import React, { ReactNode } from 'react';
import { useStatus } from '../../contexts/StatusContext';
import { useAuth } from '../../contexts/AuthContext';
import MaintenanceScreen from '../../screens/status/MaintenanceScreen';

/**
 * Affiche la MaintenanceScreen en plein ecran quand un incident global bloquant est actif.
 * Les admins (role=admin ou is_staff/superuser) bypassent ce gate pour pouvoir resoudre l'incident.
 */
export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { blockingIncident } = useStatus();
  const { user } = useAuth();

  const isAdmin =
    user?.role === 'admin' ||
    (user as any)?.is_staff === true ||
    (user as any)?.is_superuser === true;

  if (blockingIncident && !isAdmin) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
