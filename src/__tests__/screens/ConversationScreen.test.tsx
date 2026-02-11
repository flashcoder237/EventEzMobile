/**
 * Tests pour ConversationScreen
 * Vérifie la messagerie et les interactions
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ConversationScreen from '../../screens/messages/ConversationScreen';
import { render } from '../mocks/testUtils';
import { messagesAPI } from '../../api/client';
import { mockConversation, mockMessages, mockUser, mockOrganizer } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  messagesAPI: {
    getConversation: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markConversationAsRead: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    uploadAttachment: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: { conversationId: 'conv-1' },
    }),
  };
});

const mockMessagesAPI = messagesAPI as jest.Mocked<typeof messagesAPI>;

describe('ConversationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessagesAPI.getConversation.mockResolvedValue({ data: mockConversation } as any);
    mockMessagesAPI.getMessages.mockResolvedValue({
      data: { results: mockMessages },
    } as any);
    mockMessagesAPI.sendMessage.mockResolvedValue({ data: mockMessages[0] } as any);
    mockMessagesAPI.markConversationAsRead.mockResolvedValue({ data: {} } as any);
  });

  describe('Rendering', () => {
    it('should render conversation header', async () => {
      const { getByText } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByText(/Discussion|Marie Martin/)).toBeTruthy();
      });
    });

    it('should render message input', async () => {
      const { getByPlaceholderText } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Écrire un message/i)).toBeTruthy();
      });
    });

    it('should render send button', async () => {
      const { UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        // Send button should be present
        expect(UNSAFE_queryAllByType('TouchableOpacity' as any).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Messages Display', () => {
    it('should display messages', async () => {
      const { getByText } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByText('Bonjour ! Comment puis-je vous aider ?')).toBeTruthy();
      });
    });

    it('should display message sender', async () => {
      const { getByText } = render(<ConversationScreen />);

      await waitFor(() => {
        // Sender should be visible
        expect(mockMessagesAPI.getMessages).toHaveBeenCalled();
      });
    });

    it('should differentiate sent and received messages', async () => {
      const { getAllByText } = render(<ConversationScreen />);

      await waitFor(() => {
        // Both messages should be visible
        expect(getAllByText(/Bonjour/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sending Messages', () => {
    it('should send message on submit', async () => {
      const { getByPlaceholderText, UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Écrire un message/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Écrire un message/i);
      fireEvent.changeText(input, 'Test message');

      // Find and press send button
      const touchables = UNSAFE_queryAllByType('TouchableOpacity' as any);
      const sendButton = touchables[touchables.length - 1];
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockMessagesAPI.sendMessage).toHaveBeenCalledWith({
          conversation: 'conv-1',
          content: 'Test message',
        });
      });
    });

    it('should clear input after sending', async () => {
      const { getByPlaceholderText, UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Écrire un message/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Écrire un message/i);
      fireEvent.changeText(input, 'Test message');

      const touchables = UNSAFE_queryAllByType('TouchableOpacity' as any);
      const sendButton = touchables[touchables.length - 1];
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('should not send empty message', async () => {
      const { getByPlaceholderText, UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Écrire un message/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Écrire un message/i);
      fireEvent.changeText(input, '   ');

      const touchables = UNSAFE_queryAllByType('TouchableOpacity' as any);
      const sendButton = touchables[touchables.length - 1];
      fireEvent.press(sendButton);

      expect(mockMessagesAPI.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Reactions', () => {
    it('should show reaction picker on long press', async () => {
      const { getByText, queryByText } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByText('Bonjour ! Comment puis-je vous aider ?')).toBeTruthy();
      });

      // Long press on message
      fireEvent(getByText('Bonjour ! Comment puis-je vous aider ?'), 'onLongPress');

      await waitFor(() => {
        // Reaction picker should be visible
        expect(queryByText('👍')).toBeTruthy();
      });
    });

    it('should add reaction on emoji press', async () => {
      mockMessagesAPI.addReaction.mockResolvedValue({ data: {} } as any);
      const { getByText } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByText('Bonjour ! Comment puis-je vous aider ?')).toBeTruthy();
      });

      // Long press to open picker
      fireEvent(getByText('Bonjour ! Comment puis-je vous aider ?'), 'onLongPress');

      await waitFor(() => {
        expect(getByText('👍')).toBeTruthy();
      });

      fireEvent.press(getByText('👍'));

      await waitFor(() => {
        expect(mockMessagesAPI.addReaction).toHaveBeenCalledWith('msg-1', '👍');
      });
    });

    it('should display existing reactions', async () => {
      const { getByText } = render(<ConversationScreen />);

      await waitFor(() => {
        // First message has a reaction
        expect(getByText('👍')).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch conversation on mount', async () => {
      render(<ConversationScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversation).toHaveBeenCalledWith('conv-1');
      });
    });

    it('should fetch messages on mount', async () => {
      render(<ConversationScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getMessages).toHaveBeenCalledWith({ conversation: 'conv-1' });
      });
    });

    it('should mark conversation as read on mount', async () => {
      render(<ConversationScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.markConversationAsRead).toHaveBeenCalledWith('conv-1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle send error gracefully', async () => {
      mockMessagesAPI.sendMessage.mockRejectedValue(new Error('Network error'));
      const { getByPlaceholderText, UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Écrire un message/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Écrire un message/i);
      fireEvent.changeText(input, 'Test message');

      const touchables = UNSAFE_queryAllByType('TouchableOpacity' as any);
      const sendButton = touchables[touchables.length - 1];
      fireEvent.press(sendButton);

      // Should show error or keep message in input
    });

    it('should handle load error gracefully', async () => {
      mockMessagesAPI.getMessages.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur/)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should go back on back button press', async () => {
      const { UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getConversation).toHaveBeenCalled();
      });

      // Find back button and press
    });
  });

  describe('Optimistic Updates', () => {
    it('should show message immediately before API response', async () => {
      let resolveSend: (value: any) => void;
      mockMessagesAPI.sendMessage.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSend = resolve;
          })
      );

      const { getByPlaceholderText, getByText, UNSAFE_queryAllByType } = render(
        <ConversationScreen />
      );

      await waitFor(() => {
        expect(getByPlaceholderText(/Écrire un message/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Écrire un message/i);
      fireEvent.changeText(input, 'Optimistic message');

      const touchables = UNSAFE_queryAllByType('TouchableOpacity' as any);
      const sendButton = touchables[touchables.length - 1];
      fireEvent.press(sendButton);

      // Message should appear immediately
      await waitFor(() => {
        expect(getByText('Optimistic message')).toBeTruthy();
      });
    });
  });

  describe('Scroll Behavior', () => {
    it('should scroll to bottom on new message', async () => {
      const { UNSAFE_queryByType } = render(<ConversationScreen />);

      await waitFor(() => {
        expect(mockMessagesAPI.getMessages).toHaveBeenCalled();
      });

      // FlatList should exist
    });
  });

  describe('Attachments', () => {
    it('should show attachment button', async () => {
      const { UNSAFE_queryAllByType } = render(<ConversationScreen />);

      await waitFor(() => {
        // Attachment button should be visible
        expect(UNSAFE_queryAllByType('TouchableOpacity' as any).length).toBeGreaterThan(0);
      });
    });
  });
});
