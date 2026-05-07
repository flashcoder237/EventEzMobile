/**
 * Tests d'intégration payment — registration → init payment → verify (polling) → refund.
 */

import './../__helpers__/mswSetup';
import { setupMswHooks, server } from '../__helpers__/mswSetup';
import { http, HttpResponse } from 'msw';
import { TEST_BASE_URL } from '../__helpers__/mswServer';
import { fixturePayment, fixtureRegistration } from '../__helpers__/mswFixtures';

import {
  registrationsAPI,
  paymentsAPI,
  refundsAPI,
  setTokens,
  clearTokens,
} from '../../api';

describe('Payment flow', () => {
  setupMswHooks();

  beforeEach(async () => {
    await clearTokens();
    await setTokens('access-tok', 'refresh-tok');
  });

  it('création registration → init payment → verify (statut completed)', async () => {
    const regId = 'reg-uuid-1';
    const payId = 'pay-uuid-1';

    server.use(
      http.post(`${TEST_BASE_URL}/registrations/`, () =>
        HttpResponse.json(fixtureRegistration({ id: regId }), { status: 201 }),
      ),
      http.post(`${TEST_BASE_URL}/payments/`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toMatchObject({ registration: regId, payment_method: 'mtn_money' });
        return HttpResponse.json(fixturePayment({ id: payId, registration: regId }), {
          status: 201,
        });
      }),
      http.post(`${TEST_BASE_URL}/payments/${payId}/initialize_payment/`, () =>
        HttpResponse.json({
          payment_url: 'https://notchpay.test/redirect/abc',
          reference: 'ref-123',
        }),
      ),
      http.get(`${TEST_BASE_URL}/payments/${payId}/verify_payment/`, () =>
        HttpResponse.json(fixturePayment({ id: payId, status: 'completed' })),
      ),
    );

    // 1. Crée registration
    const reg = await registrationsAPI.createRegistration({ event: 'evt-1', tickets: [] });
    expect(reg.data.id).toBe(regId);

    // 2. Crée paiement
    const pay = await paymentsAPI.createPayment({
      registration: regId,
      payment_method: 'mtn_money',
    });
    expect(pay.data.id).toBe(payId);

    // 3. Init paiement → URL externe NotchPay
    const init = await paymentsAPI.initializePayment(payId);
    expect(init.data.payment_url).toContain('notchpay');

    // 4. Verify : statut "completed" reçu
    const verify = await paymentsAPI.verifyPayment(payId);
    expect(verify.data.status).toBe('completed');
  });

  it('verify avec polling : pending → pending → completed', async () => {
    const payId = 'pay-uuid-poll';
    const statuses = ['pending', 'pending', 'completed'];
    let call = 0;

    server.use(
      http.get(`${TEST_BASE_URL}/payments/${payId}/verify_payment/`, () => {
        const status = statuses[Math.min(call, statuses.length - 1)];
        call++;
        return HttpResponse.json(fixturePayment({ id: payId, status }));
      }),
    );

    let final: string | null = null;
    for (let i = 0; i < 5; i++) {
      const res = await paymentsAPI.verifyPayment(payId);
      if (res.data.status !== 'pending') {
        final = res.data.status;
        break;
      }
    }
    expect(final).toBe('completed');
    expect(call).toBe(3);
  });

  it('refund flow : POST /refunds/ → process_refund', async () => {
    let createdRefund: any = null;

    server.use(
      http.post(`${TEST_BASE_URL}/refunds/`, async ({ request }) => {
        createdRefund = await request.json();
        return HttpResponse.json(
          { id: 'ref-1', status: 'pending', ...createdRefund },
          { status: 201 },
        );
      }),
      http.post(`${TEST_BASE_URL}/refunds/ref-1/process_refund/`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toEqual({ action: 'approve' });
        return HttpResponse.json({ id: 'ref-1', status: 'completed' });
      }),
    );

    const create = await refundsAPI.createRefund({
      payment: 'pay-uuid-1',
      reason: 'duplicate',
    });
    expect(create.status).toBe(201);
    expect(createdRefund).toMatchObject({ payment: 'pay-uuid-1' });

    const processed = await refundsAPI.processRefund('ref-1', { action: 'approve' });
    expect(processed.data.status).toBe('completed');
  });
});
