/**
 * Test de rendu de AuditLogsScreen — reproduit le crash "écran blanc" signalé.
 *
 * On monte l'écran AVEC un admin (RoleGuard doit laisser passer) et sans stubber
 * les enfants (ExportButton, Badge…) pour qu'un éventuel crash au render remonte.
 * Couvre : rendu OK, liste de logs, empty state, robustesse aux réponses
 * malformées (stats null, severity inattendue).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  },
}));

const themeColors = {
  primary: '#4F46E5', accent: '#FF6B6B', text: '#111827', card: '#FFFFFF',
  background: '#F4F3F0', gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DB',
  gray400: '#9CA3AF', gray500: '#6B7280', gray600: '#4B5563',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' } }),
}));

const mockGetLogs = jest.fn();
const mockGetStatistics = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  auditAPI: {
    getLogs: (...a: any[]) => mockGetLogs(...a),
    getStatistics: (...a: any[]) => mockGetStatistics(...a),
  },
}));

import AuditLogsScreen from '../AuditLogsScreen';

// target_display et user_display sont des OBJETS côté backend réel (pas des
// strings) — c'est ce qui faisait crasher le rendu ("Objects are not valid as
// a React child"). Le fixture reflète la vraie forme.
const sampleLog = {
  id: 'log-1',
  action: 'user.login',
  action_display: 'Connexion utilisateur',
  severity: 'info',
  target_display: { type: 'event', id: '42', display: 'Concert Jazz' },
  user: 42,
  user_display: { id: 42, email: 'admin@eventez.cm', username: 'admin' },
  timestamp: '2026-07-29T10:00:00Z',
};

// Vraie forme de la réponse /audit/logs/statistics/ du backend.
const realStats = {
  total_logs_30_days: 128,
  severity_breakdown: [
    { severity: 'info', count: 100 },
    { severity: 'warning', count: 20 },
    { severity: 'error', count: 8 },
  ],
  actions_breakdown: [], top_users: [], daily_actions: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStatistics.mockResolvedValue({ data: null });
});

it('se rend sans crash pour un admin (pas d\'écran blanc)', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [sampleLog] } });
  const { findByText } = render(<AuditLogsScreen />);
  // Si l'écran crashait, findByText throw. On attend le log affiché.
  expect(await findByText('Connexion utilisateur')).toBeTruthy();
});

it('RÉGRESSION : target_display OBJET rendu sans crash (extrait .display)', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [sampleLog] } });
  const { findByText } = render(<AuditLogsScreen />);
  // Le libellé de la cible affiche display, pas [object Object] ni crash.
  expect(await findByText(/Concert Jazz/)).toBeTruthy();
});

it('affiche les vraies stats backend (total_logs_30_days + severity_breakdown)', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [sampleLog] } });
  mockGetStatistics.mockResolvedValueOnce({ data: realStats });
  const { findByText } = render(<AuditLogsScreen />);
  expect(await findByText('128')).toBeTruthy();   // total 30j
  expect(await findByText('100')).toBeTruthy();   // count info
});

it('affiche l\'empty state quand aucun log', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [] } });
  const { queryByText } = render(<AuditLogsScreen />);
  await waitFor(() => expect(mockGetLogs).toHaveBeenCalled());
  // Pas de crash — le composant reste monté.
  expect(queryByText('Connexion utilisateur')).toBeNull();
});

it('ne crash pas si getLogs rejette (403 / réseau)', async () => {
  mockGetLogs.mockRejectedValueOnce({ response: { status: 403 } });
  const { toJSON } = render(<AuditLogsScreen />);
  await waitFor(() => expect(mockGetLogs).toHaveBeenCalled());
  expect(toJSON()).toBeTruthy(); // toujours monté
});

it('ne crash pas avec des stats malformées + severity inconnue', async () => {
  mockGetLogs.mockResolvedValueOnce({
    data: { results: [{ ...sampleLog, severity: 'zzz-unknown', user_display: null }] },
  });
  mockGetStatistics.mockResolvedValueOnce({ data: { total_logs: 5, by_severity: { info: 3, weird: 2 } } });
  const { findByText } = render(<AuditLogsScreen />);
  expect(await findByText('Connexion utilisateur')).toBeTruthy();
});

// ─── Formes de données adverses reproduisant le crash device ────────────────

it('ne crash pas si getStatistics renvoie une réponse PAGINÉE (forme inattendue)', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [sampleLog] } });
  // Backend renvoie {results:[...]} au lieu de l'objet stats attendu.
  mockGetStatistics.mockResolvedValueOnce({ data: { results: [], count: 0, next: null } });
  const { findByText } = render(<AuditLogsScreen />);
  expect(await findByText('Connexion utilisateur')).toBeTruthy();
});

it('ne crash pas si by_severity est null / non-objet', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [sampleLog] } });
  mockGetStatistics.mockResolvedValueOnce({ data: { total_logs: 3, by_severity: null } });
  const { findByText } = render(<AuditLogsScreen />);
  expect(await findByText('Connexion utilisateur')).toBeTruthy();
});

it('ne crash pas si un log n\'a pas de timestamp', async () => {
  mockGetLogs.mockResolvedValueOnce({
    data: { results: [{ ...sampleLog, timestamp: undefined }] },
  });
  const { findByText } = render(<AuditLogsScreen />);
  expect(await findByText('Connexion utilisateur')).toBeTruthy();
});

it('ne crash pas si getStatistics renvoie un tableau nu', async () => {
  mockGetLogs.mockResolvedValueOnce({ data: { results: [sampleLog] } });
  mockGetStatistics.mockResolvedValueOnce({ data: [] });
  const { findByText } = render(<AuditLogsScreen />);
  expect(await findByText('Connexion utilisateur')).toBeTruthy();
});
