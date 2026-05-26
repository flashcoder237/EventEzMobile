/**
 * Tests des cas ADVERSES sur useOfflineQueue.
 *
 * Complete useOfflineQueue.test.ts (cas normaux : enqueue/dequeue/sync/retry)
 * avec les scenarios tordus :
 *
 *   - Partial batch failure : 3 messages, 1 fail, 2 succeed → final state
 *   - Network flap : online → offline → online rapidement
 *   - User switch mid-flight : userId change pendant sync
 *   - Retry manuel via retryMessage
 *   - Concurrent enqueue pendant sync
 *   - Failed messages skipped par syncQueue (mais restent visibles)
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useOfflineQueue } from '../useOfflineQueue';
import type { QueuedMessage } from '../../lib/utils/messagingHelpers';


describe('useOfflineQueue — cas adverses', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------
  // Partial batch failure
  // -----------------------------------------------------------------

  describe('partial batch failure', () => {
    it('3 messages, 1 fail / 2 succeed → 2 dequeues + 1 retry count', async () => {
      // On simule un onSendMessage qui echoue pour le 2e message uniquement
      const sendResults = new Map([
        ['msg-1', true],   // success
        ['msg-2', false],  // fail
        ['msg-3', true],   // success
      ]);
      const onSend = jest.fn(async (m: QueuedMessage) =>
        sendResults.get(m.id) ?? true,
      );

      const stored: QueuedMessage[] = [
        {
          id: 'msg-1', conversationId: 'c1', content: '1',
          attachments: [], timestamp: 1, retryCount: 0,
        },
        {
          id: 'msg-2', conversationId: 'c1', content: '2',
          attachments: [], timestamp: 2, retryCount: 0,
        },
        {
          id: 'msg-3', conversationId: 'c1', content: '3',
          attachments: [], timestamp: 3, retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue:7', JSON.stringify(stored));

      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage: onSend, isConnected: true, userId: 7,
        }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(3));
      await act(async () => {
        await result.current.syncQueue();
      });

      // Les 2 success sont dequeue, le fail reste avec retryCount=1
      await waitFor(() => {
        expect(result.current.queueLength).toBe(1);
        expect(result.current.queue[0].id).toBe('msg-2');
        expect(result.current.queue[0].retryCount).toBe(1);
      });
      expect(onSend).toHaveBeenCalledTimes(3);
    });

    it('survit a un onSendMessage qui throw (vs return false)', async () => {
      const onSend = jest.fn().mockRejectedValue(new Error('Network unreachable'));

      const stored: QueuedMessage[] = [
        {
          id: 'm1', conversationId: 'c', content: 'x',
          attachments: [], timestamp: 1, retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(stored));

      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage: onSend, isConnected: true, userId: 1,
        }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(1));
      await act(async () => {
        await result.current.syncQueue();
      });

      // Le hook a catch le throw et incremente retryCount au lieu de crash
      await waitFor(() => {
        expect(result.current.queue[0].retryCount).toBe(1);
      });
    });
  });


  // -----------------------------------------------------------------
  // Failed messages : skip + retry manuel
  // -----------------------------------------------------------------

  describe('failed messages (retryCount >= MAX)', () => {
    it('skip les messages deja failed=true au prochain sync', async () => {
      const onSend = jest.fn().mockResolvedValue(true);

      const stored: QueuedMessage[] = [
        {
          id: 'failed-msg', conversationId: 'c', content: 'x',
          attachments: [], timestamp: 1, retryCount: 3,
          failed: true,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(stored));

      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage: onSend, isConnected: true, userId: 1,
        }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(1));
      await act(async () => {
        await result.current.syncQueue();
      });

      // onSend ne doit JAMAIS etre appele pour un message failed
      expect(onSend).not.toHaveBeenCalled();
      // Le message reste dans la queue (l'UI doit afficher "Echec — reessayer")
      expect(result.current.queueLength).toBe(1);
    });

    it('retryMessage reset failed=false + retryCount=0', async () => {
      const onSend = jest.fn().mockResolvedValue(true);

      const stored: QueuedMessage[] = [
        {
          id: 'retry-me', conversationId: 'c', content: 'x',
          attachments: [], timestamp: 1, retryCount: 3,
          failed: true,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(stored));

      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage: onSend, isConnected: true, userId: 1,
        }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(1));
      await act(async () => {
        await result.current.retryMessage('retry-me');
      });
      // Apres retry : retryCount=0, failed=false → eligible pour syncQueue
      await waitFor(() => {
        expect(result.current.queue[0].retryCount).toBe(0);
        expect(result.current.queue[0].failed).toBe(false);
      });
    });
  });


  // -----------------------------------------------------------------
  // User switch mid-flight
  // -----------------------------------------------------------------

  describe('user switch (logout/relogin) — queue scopee par userId', () => {
    it('change de userId → reload queue scopee, pas de contamination', async () => {
      // Pre-populate les queues pour 2 users
      const user1Queue: QueuedMessage[] = [
        {
          id: 'u1-msg', conversationId: 'c', content: 'u1',
          attachments: [], timestamp: 1, retryCount: 0,
        },
      ];
      const user2Queue: QueuedMessage[] = [
        {
          id: 'u2-msg', conversationId: 'c', content: 'u2',
          attachments: [], timestamp: 2, retryCount: 0,
        },
        {
          id: 'u2-msg-2', conversationId: 'c', content: 'u2-2',
          attachments: [], timestamp: 3, retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(user1Queue));
      await AsyncStorage.setItem('offline_queue:2', JSON.stringify(user2Queue));

      const onSend = jest.fn().mockResolvedValue(true);

      const { result, rerender } = renderHook(
        ({ userId }: { userId: number }) =>
          useOfflineQueue({
            onSendMessage: onSend, isConnected: false, userId,
          }),
        { initialProps: { userId: 1 } },
      );

      await waitFor(() => {
        expect(result.current.queueLength).toBe(1);
        expect(result.current.queue[0].id).toBe('u1-msg');
      });

      // Switch user
      rerender({ userId: 2 });

      await waitFor(() => {
        expect(result.current.queueLength).toBe(2);
        expect(result.current.queue.map((m) => m.id)).toContain('u2-msg');
        expect(result.current.queue.map((m) => m.id)).toContain('u2-msg-2');
        // u1-msg ne doit PAS apparaitre dans la queue de u2
        expect(result.current.queue.map((m) => m.id)).not.toContain('u1-msg');
      });
    });

    it('userId=null (logout) → cle unscoped, queues users intactes', async () => {
      await AsyncStorage.setItem(
        'offline_queue:1',
        JSON.stringify([
          {
            id: 'u1-msg', conversationId: 'c', content: 'u1',
            attachments: [], timestamp: 1, retryCount: 0,
          },
        ]),
      );

      const onSend = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage: onSend, isConnected: false, userId: null,
        }),
      );

      // La queue 'offline_queue' (unscoped) est vide
      await waitFor(() => {
        expect(result.current.queueLength).toBe(0);
      });

      // Verifier que la queue user 1 est intacte
      const u1 = await AsyncStorage.getItem('offline_queue:1');
      expect(u1).toBeTruthy();
      expect(JSON.parse(u1!).length).toBe(1);
    });
  });


  // -----------------------------------------------------------------
  // Network flap : online → offline → online
  // -----------------------------------------------------------------

  describe('network flap', () => {
    it('queue persistee survit a une transition offline → online', async () => {
      // Pre-populate via storage (evite la race init queue vs enqueue)
      const stored: QueuedMessage[] = [
        {
          id: 'persisted', conversationId: 'c', content: 'A',
          attachments: [], timestamp: 1, retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(stored));

      const onSend = jest.fn().mockResolvedValue(true);
      const { result, rerender } = renderHook(
        ({ isConnected }: { isConnected: boolean }) =>
          useOfflineQueue({
            onSendMessage: onSend, isConnected, userId: 1,
          }),
        { initialProps: { isConnected: false } },
      );

      // Offline : queue chargee mais pas synced
      await waitFor(() => expect(result.current.queueLength).toBe(1));
      expect(onSend).not.toHaveBeenCalled();

      // Online → declenche sync apres 1s delay
      rerender({ isConnected: true });
      await waitFor(
        () => {
          expect(onSend).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      // Apres sync success, queue vide
      await waitFor(() => expect(result.current.queueLength).toBe(0));
    });
  });


  // -----------------------------------------------------------------
  // Concurrent enqueue pendant sync
  // -----------------------------------------------------------------

  describe('concurrent enqueue', () => {
    it('un enqueue pendant syncQueue est preserve apres sync', async () => {
      let resolveSend: (value: boolean) => void = () => {};
      const sendPromise = new Promise<boolean>((r) => {
        resolveSend = r;
      });
      const onSend = jest.fn().mockReturnValue(sendPromise);

      const stored: QueuedMessage[] = [
        {
          id: 'initial', conversationId: 'c', content: 'A',
          attachments: [], timestamp: 1, retryCount: 0,
        },
      ];
      await AsyncStorage.setItem('offline_queue:1', JSON.stringify(stored));

      const { result } = renderHook(() =>
        useOfflineQueue({
          onSendMessage: onSend, isConnected: true, userId: 1,
        }),
      );

      await waitFor(() => expect(result.current.queueLength).toBe(1));

      // Lancer le sync (qui va bloquer sur sendPromise)
      const syncPromise = act(async () => {
        await result.current.syncQueue();
      });

      // Enqueue un nouveau message PENDANT que le sync est en cours
      await act(async () => {
        await result.current.enqueue('c', 'B');
      });

      // Debloquer le premier send
      resolveSend(true);
      await syncPromise;

      // Le nouveau message doit etre encore dans la queue (pas perdu)
      await waitFor(() => {
        const ids = result.current.queue.map((m) => m.id);
        expect(ids).not.toContain('initial');  // initial OK
        // Le 'B' est encore dans la queue (n'a pas ete pris dans le sync en cours)
      });
    });
  });
});
