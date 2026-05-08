/**
 * Tests du hook useOfflineQueue.
 *
 * Couvre l'enqueue/dequeue, la persistance AsyncStorage scopée par userId,
 * la synchronisation quand le réseau revient, le cap MAX_RETRY_COUNT,
 * le callback onMessageFailed et le cleanup des timers.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfflineQueue } from '../useOfflineQueue';
import type { QueuedMessage } from '../../lib/utils/messagingHelpers';

describe('useOfflineQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with an empty queue when storage is empty', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: false, userId: 1 }),
      );
      // loadQueue runs in effect — wait for it
      await waitFor(() => {
        expect(result.current.queueLength).toBe(0);
      });
      expect(result.current.queue).toEqual([]);
      expect(result.current.isSyncing).toBe(false);
    });

    it('rehydrates queue from AsyncStorage on mount (scoped by userId)', async () => {
      const stored: QueuedMessage[] = [
        {
          id: 'queued-1',
          conversationId: 'c1',
          content: 'persistent',
          attachments: [],
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue:42', JSON.stringify(stored));
      const onSendMessage = jest.fn().mockResolvedValue(true);

      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: false, userId: 42 }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(1));
      expect(result.current.queue[0].content).toBe('persistent');
    });

    it('uses an unscoped key when no userId is provided', async () => {
      const stored: QueuedMessage[] = [
        {
          id: 'queued-1',
          conversationId: 'c1',
          content: 'no-user',
          attachments: [],
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue', JSON.stringify(stored));
      const onSendMessage = jest.fn().mockResolvedValue(true);

      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: false }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(1));
    });

    it('handles corrupted storage gracefully (does not crash)', async () => {
      await AsyncStorage.setItem('offline_queue:1', '{not-json');
      const onSendMessage = jest.fn().mockResolvedValue(true);

      // mute console.error from the hook — corrupted JSON path logs in __DEV__
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: false, userId: 1 }),
      );

      // queue stays empty (no rethrow), loadQueue catch swallowed it
      await waitFor(() => expect(result.current.queueLength).toBe(0));
      errSpy.mockRestore();
    });
  });

  describe('enqueue', () => {
    it('appends a message and persists to AsyncStorage', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: false, userId: 1 }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(0));

      let returnedId: string | undefined;
      await act(async () => {
        returnedId = await result.current.enqueue('conv-1', 'hello');
      });

      expect(returnedId).toMatch(/^queued-/);
      await waitFor(() => expect(result.current.queueLength).toBe(1));
      expect(result.current.queue[0]).toMatchObject({
        conversationId: 'conv-1',
        content: 'hello',
        retryCount: 0,
      });

      const stored = await AsyncStorage.getItem('offline_queue:1');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].content).toBe('hello');
    });
  });

  describe('syncQueue', () => {
    it('does nothing when offline (isConnected=false)', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: false, userId: 1 }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(0));
      await act(async () => {
        await result.current.enqueue('c1', 'hi');
      });
      await waitFor(() => expect(result.current.queueLength).toBe(1));

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(onSendMessage).not.toHaveBeenCalled();
      expect(result.current.queueLength).toBe(1);
    });

    it('flushes pending messages when online', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: true, userId: 1 }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(0));
      await act(async () => {
        await result.current.enqueue('c1', 'one');
        await result.current.enqueue('c1', 'two');
      });
      await waitFor(() => expect(result.current.queueLength).toBe(2));

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(onSendMessage).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(result.current.queueLength).toBe(0));

      const stored = await AsyncStorage.getItem('offline_queue:1');
      expect(JSON.parse(stored!)).toEqual([]);
    });

    it('increments retryCount when send returns false', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(false);
      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: true, userId: 1 }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(0));
      await act(async () => {
        await result.current.enqueue('c1', 'fail-once');
      });

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(onSendMessage).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(result.current.queue[0]?.retryCount).toBe(1);
      });
      expect(result.current.queueLength).toBe(1);
    });

    it('increments retryCount when send throws', async () => {
      const onSendMessage = jest
        .fn()
        .mockRejectedValue(new Error('Network down'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: true, userId: 1 }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(0));
      await act(async () => {
        await result.current.enqueue('c1', 'throws');
      });

      await act(async () => {
        await result.current.syncQueue();
      });

      await waitFor(() => {
        expect(result.current.queue[0]?.retryCount).toBe(1);
      });
      errSpy.mockRestore();
    });

    it('drops + calls onMessageFailed once retryCount hits MAX_RETRY_COUNT (3)', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(false);
      const onMessageFailed = jest.fn();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage,
          isConnected: true,
          userId: 1,
          onMessageFailed,
        }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(0));

      // Pre-populate AsyncStorage with a message already at retryCount=3
      // so the next sync immediately abandons it.
      const dead: QueuedMessage[] = [
        {
          id: 'queued-dead',
          conversationId: 'c1',
          content: 'over the top',
          attachments: [],
          timestamp: Date.now(),
          retryCount: 3,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(dead));

      // Force reload by remounting
      warnSpy.mockClear();
      const fresh = renderHook(() =>
        useOfflineQueue({
          onSendMessage,
          isConnected: true,
          userId: 1,
          onMessageFailed,
        }),
      );
      await waitFor(() => expect(fresh.result.current.queueLength).toBe(1));

      await act(async () => {
        await fresh.result.current.syncQueue();
      });

      expect(onMessageFailed).toHaveBeenCalledTimes(1);
      expect(onMessageFailed).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'queued-dead' }),
      );
      // dead message dropped from queue (no infinite re-enqueue)
      await waitFor(() => expect(fresh.result.current.queueLength).toBe(0));
      // onSendMessage NOT called for the dead message
      expect(onSendMessage).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('clears the pending sync timer on unmount (no error after unmount)', async () => {
      jest.useFakeTimers();
      const onSendMessage = jest.fn().mockResolvedValue(true);

      const { result, unmount } = renderHook(() =>
        useOfflineQueue({ onSendMessage, isConnected: true, userId: 1 }),
      );

      // enqueue a message → triggers the 1s setTimeout for syncQueue
      await act(async () => {
        await result.current.enqueue('c1', 'pending');
      });

      unmount();
      // Advance past the 1s + 5s retry windows : si timer pas cleared
      // on aurait un syncQueue qui appellerait onSendMessage post-unmount.
      jest.advanceTimersByTime(10000);

      expect(onSendMessage).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
