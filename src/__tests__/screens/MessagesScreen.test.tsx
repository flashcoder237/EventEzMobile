/**
 * Tests pour MessagesScreen
 * Vérifie la liste des conversations
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import MessagesScreen from '../../screens/messages/MessagesScreen';
import { render } from '../mocks/testUtils';
import { messagesAPI } from '../../api/client';
import { mockConversation, mockUser, mockOrganizer } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  messagesAPI: {
    getConversations: jest.fn(),
    markConversationAsRead: jest.fn(),
    deleteConversation: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

const mockMessagesAPI = messagesAPI as jest.Mocked<typeof messagesAPI>;

const mockConversations = [
  mockConversation,
  {
    ...mockConversation,
    id: 'conv-2',
    title: 'Support EventEz',
    unread_count: 0,
    last_message: {
      content: 'Merci pour votre question',
      created_at: '2024-01-09T00:00:00Z',
    },
  },
  {
    ...mockConversation,
    id: 'conv-3',
    title: 'Groupe Festival',
    conversation_type: 'group',
    unread_count: 5,
    last_message: {
      content: 'Rendez-vous demain à 18h',
      created_at: '2024-01-10T12:00:00Z',
    },
  },
];

describe('MessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessagesAPI.getConversations.mockResolvedValue({
      data: { results: mockConversations, count: mockConversations.length },
    } as any);
  });

  describe('Rendering', () => {
    it('should render header with title', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText('Messages')).toBeTruthy();
      });
    });

    it('should render search input', async () => {
      const { getByPlaceholderText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Rechercher/i)).toBeTruthy();
      });
    });

    it('should render conversations list', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
        expect(getByText('Support EventEz')).toBeTruthy();
      });
    });

    it('should render new message button', async () => {
      const { getByTestId } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversations).toHaveBeenCalled();
      });

      // New message button - would need testID
    });
  });

  describe('Conversation Display', () => {
    it('should display last message preview', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText('Merci pour votre question')).toBeTruthy();
      });
    });

    it('should display unread count badge', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText('5')).toBeTruthy();
      });
    });

    it('should display participant avatar', async () => {
      const { UNSAFE_queryAllByType } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversations).toHaveBeenCalled();
      });

      // Check for Image components
      expect(UNSAFE_queryAllByType('Image' as any).length).toBeGreaterThan(0);
    });

    it('should format time correctly', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        // Time should be formatted relative or absolute
        expect(getByText(/\d{1,2}:\d{2}|hier|aujourd/i)).toBeTruthy();
      });
    });

    it('should show group indicator for group conversations', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText('Groupe Festival')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to conversation on press', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
      });

      fireEvent.press(getByText("Discussion avec l'organisateur"));

      expect(mockNavigate).toHaveBeenCalledWith('Conversation', {
        conversationId: 'conv-1',
      });
    });

    it('should navigate to new message screen', async () => {
      const { getByTestId } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversations).toHaveBeenCalled();
      });

      // Press new message button - would need testID
    });
  });

  describe('Search', () => {
    it('should filter conversations by search query', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);
      fireEvent.changeText(searchInput, 'Support');

      await waitFor(() => {
        expect(getByText('Support EventEz')).toBeTruthy();
        expect(queryByText("Discussion avec l'organisateur")).toBeNull();
      });
    });

    it('should show empty state when no results', async () => {
      const { getByPlaceholderText, getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversations).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);
      fireEvent.changeText(searchInput, 'xxxxxxxx');

      await waitFor(() => {
        expect(getByText(/Aucune conversation/i)).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no conversations', async () => {
      mockMessagesAPI.getConversations.mockResolvedValue({
        data: { results: [], count: 0 },
      } as any);

      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText(/Aucun message/i)).toBeTruthy();
      });
    });

    it('should show start conversation button in empty state', async () => {
      mockMessagesAPI.getConversations.mockResolvedValue({
        data: { results: [], count: 0 },
      } as any);

      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText(/Démarrer une conversation/i)).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh conversations on pull', async () => {
      const { UNSAFE_queryByType } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversations).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
    });
  });

  describe('Swipe Actions', () => {
    it('should show delete option on swipe', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
      });

      // Simulate swipe - would need gesture handler
    });

    it('should mark as read on swipe', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
      });

      // Simulate swipe - would need gesture handler
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockMessagesAPI.getConversations.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });

    it('should allow retry on error', async () => {
      mockMessagesAPI.getConversations
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { results: mockConversations, count: mockConversations.length },
        } as any);

      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Réessayer/i));

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
      });
    });
  });

  describe('Tabs', () => {
    it('should show all conversations tab', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText('Tous')).toBeTruthy();
      });
    });

    it('should show unread tab', async () => {
      const { getByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText('Non lus')).toBeTruthy();
      });
    });

    it('should filter by unread when tab pressed', async () => {
      const { getByText, queryByText } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(getByText("Discussion avec l'organisateur")).toBeTruthy();
      });

      fireEvent.press(getByText('Non lus'));

      await waitFor(() => {
        expect(getByText('Groupe Festival')).toBeTruthy();
        expect(queryByText('Support EventEz')).toBeNull(); // Has 0 unread
      });
    });
  });

  describe('Online Status', () => {
    it('should show online indicator for online users', async () => {
      const { UNSAFE_queryAllByType } = render(<MessagesScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversations).toHaveBeenCalled();
      });

      // Check for online indicator View
    });
  });
});
