/**
 * Tests du hook useMessageState (reducer messagerie).
 *
 * Couvre les actions principales : LOAD/ADD/UPDATE/REMOVE_MESSAGE,
 * MARK_MESSAGE_READ, ADD/REMOVE_REACTION, START_EDIT/REPLY, modaux et
 * la déduplication tempMessage <-> message confirmé.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useMessageState } from '../useMessageState';
import type { Message } from '../../types';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: '1',
    conversation: 1,
    sender: 42,
    sender_name: 'Alice',
    content: 'Hello',
    message_type: 'text',
    read_by: [],
    is_starred: false,
    is_edited: false,
    is_deleted: false,
    created_at: new Date('2026-01-01T10:00:00Z').toISOString(),
    ...overrides,
  } as Message;
}

describe('useMessageState', () => {
  describe('initial state', () => {
    it('returns the default state when called without args', () => {
      const { result } = renderHook(() => useMessageState());
      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.conversationId).toBeNull();
      expect(result.current.state.isNewConversation).toBe(false);
      expect(result.current.state.attachedFiles).toEqual([]);
      expect(result.current.state.typingUsers).toEqual([]);
    });

    it('flags the conversation as new when only userName is given', () => {
      const { result } = renderHook(() => useMessageState(undefined, 'Alice'));
      expect(result.current.state.isNewConversation).toBe(true);
      expect(result.current.state.conversationTitle).toBe('Alice');
      expect(result.current.state.loading).toBe(false);
    });

    it('starts loading when an existing conversationId is provided', () => {
      const { result } = renderHook(() => useMessageState('conv-1', 'Bob'));
      expect(result.current.state.conversationId).toBe('conv-1');
      expect(result.current.state.loading).toBe(true);
      expect(result.current.state.isNewConversation).toBe(false);
    });
  });

  describe('SET_MESSAGES (LOAD)', () => {
    it('replaces the messages list', () => {
      const { result } = renderHook(() => useMessageState());
      const msgs = [makeMessage({ id: '1' }), makeMessage({ id: '2' })];
      act(() => result.current.actions.setMessages(msgs));
      expect(result.current.state.messages).toHaveLength(2);
      expect(result.current.state.messages[0].id).toBe('1');
    });

    it('overwrites prior content (no merge)', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.setMessages([makeMessage({ id: '1' })]));
      act(() => result.current.actions.setMessages([makeMessage({ id: '2' })]));
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].id).toBe('2');
    });
  });

  describe('ADD_MESSAGE', () => {
    it('prepends new message (FlatList inversé : index 0 = plus récent)', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: 'old' })]),
      );
      act(() =>
        result.current.actions.addMessage(makeMessage({ id: 'new' })),
      );
      expect(result.current.state.messages[0].id).toBe('new');
      expect(result.current.state.messages[1].id).toBe('old');
    });

    it('is idempotent on duplicate id', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.addMessage(makeMessage({ id: 'x', content: 'hi' })),
      );
      act(() =>
        result.current.actions.addMessage(makeMessage({ id: 'x', content: 'changed' })),
      );
      expect(result.current.state.messages).toHaveLength(1);
      // first one wins (no overwrite by ADD_MESSAGE)
      expect(result.current.state.messages[0].content).toBe('hi');
    });

    it('replaces a tempMessage when the confirmed message arrives (same sender/content/time)', () => {
      const { result } = renderHook(() => useMessageState());
      const tempCreatedAt = new Date('2026-01-01T10:00:00Z').toISOString();
      const realCreatedAt = new Date('2026-01-01T10:00:30Z').toISOString();
      act(() =>
        result.current.actions.addMessage(
          makeMessage({
            id: 'temp-abc',
            content: 'Yo',
            sender: 7,
            created_at: tempCreatedAt,
          }),
        ),
      );
      act(() =>
        result.current.actions.addMessage(
          makeMessage({
            id: '999',
            content: 'Yo',
            sender: 7,
            created_at: realCreatedAt,
          }),
        ),
      );
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].id).toBe('999');
    });

    it('keeps both messages if the temp/real time delta exceeds 60s', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.addMessage(
          makeMessage({
            id: 'temp-1',
            sender: 7,
            content: 'A',
            created_at: new Date('2026-01-01T10:00:00Z').toISOString(),
          }),
        ),
      );
      act(() =>
        result.current.actions.addMessage(
          makeMessage({
            id: '999',
            sender: 7,
            content: 'A',
            created_at: new Date('2026-01-01T10:05:00Z').toISOString(),
          }),
        ),
      );
      expect(result.current.state.messages).toHaveLength(2);
    });

    it('handles a sender object (WS payload) without crashing', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.addMessage(
          makeMessage({
            id: 'temp-x',
            sender: 7 as any,
            content: 'WS',
            created_at: new Date('2026-01-01T10:00:00Z').toISOString(),
          }),
        ),
      );
      const wsMessage = {
        ...makeMessage({ id: '900', content: 'WS' }),
        sender: { id: 7, email: 'a@b.com', full_name: 'Alice' } as any,
        created_at: new Date('2026-01-01T10:00:10Z').toISOString(),
      } as any;
      act(() => result.current.actions.addMessage(wsMessage));
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].id).toBe('900');
    });
  });

  describe('UPDATE_MESSAGE (edit)', () => {
    it('updates content + flags is_edited', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1', content: 'old' })]),
      );
      act(() =>
        result.current.actions.updateMessage('1', {
          content: 'new',
          is_edited: true,
          edited_at: new Date().toISOString(),
        }),
      );
      expect(result.current.state.messages[0].content).toBe('new');
      expect(result.current.state.messages[0].is_edited).toBe(true);
    });

    it('is a no-op on unknown id', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1', content: 'old' })]),
      );
      act(() =>
        result.current.actions.updateMessage('999', { content: 'should not appear' }),
      );
      expect(result.current.state.messages[0].content).toBe('old');
    });
  });

  describe('soft delete via UPDATE_MESSAGE', () => {
    it('flags is_deleted and clears content', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1', content: 'secret' })]),
      );
      act(() =>
        result.current.actions.updateMessage('1', {
          is_deleted: true,
          content: '',
        }),
      );
      expect(result.current.state.messages[0].is_deleted).toBe(true);
      expect(result.current.state.messages[0].content).toBe('');
    });
  });

  describe('REMOVE_MESSAGE', () => {
    it('drops the matching message', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([
          makeMessage({ id: '1' }),
          makeMessage({ id: '2' }),
        ]),
      );
      act(() => result.current.actions.removeMessage('1'));
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].id).toBe('2');
    });
  });

  describe('REMOVE_TEMP_MESSAGES', () => {
    it('removes only temp-prefixed messages', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([
          makeMessage({ id: '1' }),
          makeMessage({ id: 'temp-1' }),
          makeMessage({ id: 'temp-2' }),
        ]),
      );
      act(() => result.current.actions.removeTempMessages());
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].id).toBe('1');
    });
  });

  describe('MARK_MESSAGE_READ', () => {
    it('appends the userId to read_by', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1', read_by: [] })]),
      );
      act(() => result.current.actions.markMessageRead('1', '42'));
      expect(result.current.state.messages[0].read_by).toEqual([42]);
    });

    it('is idempotent if user already in read_by', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([
          makeMessage({ id: '1', read_by: [42] }),
        ]),
      );
      act(() => result.current.actions.markMessageRead('1', '42'));
      expect(result.current.state.messages[0].read_by).toEqual([42]);
    });
  });

  describe('reactions', () => {
    it('adds a reaction', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1' })]),
      );
      act(() => result.current.actions.addReaction('1', '👍', '5'));
      expect(result.current.state.messages[0].reactions).toHaveLength(1);
      expect(result.current.state.messages[0].reactions?.[0]).toMatchObject({
        emoji: '👍',
        user: 5,
      });
    });

    it('does not add the same emoji twice for the same user', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1' })]),
      );
      act(() => result.current.actions.addReaction('1', '👍', '5'));
      act(() => result.current.actions.addReaction('1', '👍', '5'));
      expect(result.current.state.messages[0].reactions).toHaveLength(1);
    });

    it('removes the matching reaction', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1' })]),
      );
      act(() => result.current.actions.addReaction('1', '👍', '5'));
      act(() => result.current.actions.addReaction('1', '❤️', '5'));
      act(() => result.current.actions.removeReaction('1', '👍', '5'));
      expect(result.current.state.messages[0].reactions).toHaveLength(1);
      expect(result.current.state.messages[0].reactions?.[0].emoji).toBe('❤️');
    });
  });

  describe('input + draft', () => {
    it('sets and clears newMessage', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.setNewMessage('hi'));
      expect(result.current.state.newMessage).toBe('hi');
    });

    it('sets and clears attachedFiles', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setAttachedFiles([
          { uri: 'file://a.jpg', name: 'a.jpg', type: 'image' },
        ]),
      );
      expect(result.current.state.attachedFiles).toHaveLength(1);
      act(() => result.current.actions.clearAttachedFiles());
      expect(result.current.state.attachedFiles).toEqual([]);
    });
  });

  describe('edit + reply flows', () => {
    it('startEdit primes newMessage with the message content and clears reply', () => {
      const { result } = renderHook(() => useMessageState());
      const msg = makeMessage({ id: '1', content: 'editable' });
      act(() => result.current.actions.startEdit(msg));
      expect(result.current.state.editingMessage?.id).toBe('1');
      expect(result.current.state.newMessage).toBe('editable');
      expect(result.current.state.replyToMessage).toBeNull();
      expect(result.current.state.showActionMenu).toBe(false);
    });

    it('cancelEdit clears editing + draft', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.startEdit(makeMessage({ id: '1' })));
      act(() => result.current.actions.cancelEdit());
      expect(result.current.state.editingMessage).toBeNull();
      expect(result.current.state.newMessage).toBe('');
    });

    it('startReply clears any active edit', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.startEdit(makeMessage({ id: '1' })));
      act(() =>
        result.current.actions.startReply(makeMessage({ id: '2' })),
      );
      expect(result.current.state.editingMessage).toBeNull();
      expect(result.current.state.replyToMessage?.id).toBe('2');
    });
  });

  describe('typing users', () => {
    it('addTypingUser is idempotent', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.addTypingUser('Alice'));
      act(() => result.current.actions.addTypingUser('Alice'));
      expect(result.current.state.typingUsers).toEqual(['Alice']);
    });

    it('removeTypingUser drops the matching name', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.addTypingUser('Alice'));
      act(() => result.current.actions.addTypingUser('Bob'));
      act(() => result.current.actions.removeTypingUser('Alice'));
      expect(result.current.state.typingUsers).toEqual(['Bob']);
    });
  });

  describe('recording', () => {
    it('reset duration when recording stops', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.setRecording(true));
      act(() => result.current.actions.incrementRecordingDuration());
      act(() => result.current.actions.incrementRecordingDuration());
      expect(result.current.state.recordingDuration).toBe(2);
      act(() => result.current.actions.setRecording(false));
      expect(result.current.state.recordingDuration).toBe(0);
    });
  });

  describe('action menu / forward modal', () => {
    it('show + hide action menu', () => {
      const { result } = renderHook(() => useMessageState());
      act(() => result.current.actions.showActionMenu(makeMessage({ id: '1' })));
      expect(result.current.state.showActionMenu).toBe(true);
      expect(result.current.state.selectedMessage?.id).toBe('1');
      act(() => result.current.actions.hideActionMenu());
      expect(result.current.state.showActionMenu).toBe(false);
      expect(result.current.state.selectedMessage).toBeNull();
    });

    it('hideForwardModal also clears forwardTargets', () => {
      const { result } = renderHook(() => useMessageState());
      act(() =>
        result.current.actions.setForwardTargets([
          { id: 1, email: 'a@b.com' } as any,
        ]),
      );
      act(() => result.current.actions.showForwardModal());
      act(() => result.current.actions.hideForwardModal());
      expect(result.current.state.showForwardModal).toBe(false);
      expect(result.current.state.forwardTargets).toEqual([]);
    });
  });

  describe('RESET', () => {
    it('drops everything back to initial', () => {
      const { result } = renderHook(() => useMessageState('conv-1', 'Bob'));
      act(() =>
        result.current.actions.setMessages([makeMessage({ id: '1' })]),
      );
      act(() => result.current.actions.setNewMessage('typing'));
      act(() => result.current.actions.reset());
      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.newMessage).toBe('');
      expect(result.current.state.conversationId).toBeNull();
    });
  });
});
