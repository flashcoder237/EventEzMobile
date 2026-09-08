import {
  hasAmountDue,
  hasSettledPayment,
  isRegistrationUnsettled,
  isRegistrationPresentable,
} from '../paymentSettled';

describe('paymentSettled', () => {
  // LE cas signale : redirige vers Stripe, rien paye, billet affiche « payé ».
  it("ne considere pas payee une inscription 'confirmed' sans paiement", () => {
    const reg = {
      status: 'confirmed',
      payment_info: { status: 'pending' },
      tickets: [{ is_paid: false, total_price: 5000 }],
    };
    expect(isRegistrationUnsettled(reg)).toBe(true);
    expect(isRegistrationPresentable(reg)).toBe(false);
  });

  it('accepte une inscription reellement payee', () => {
    const reg = {
      status: 'confirmed',
      payment_info: { status: 'completed' },
      tickets: [{ is_paid: true, total_price: 5000 }],
    };
    expect(isRegistrationUnsettled(reg)).toBe(false);
    expect(isRegistrationPresentable(reg)).toBe(true);
  });

  it('traite un remboursement comme un encaissement reel', () => {
    // L'argent est bien entre, puis ressorti : ce n'est pas un impaye.
    expect(hasSettledPayment({ payment_info: { status: 'refunded' } })).toBe(true);
    expect(hasSettledPayment({ payment_info: { status: 'partially_refunded' } })).toBe(true);
  });

  it('laisse passer un evenement gratuit', () => {
    const reg = { status: 'confirmed', tickets: [{ is_paid: true, total_price: 0 }] };
    expect(hasAmountDue(reg)).toBe(false);
    expect(isRegistrationPresentable(reg)).toBe(true);
  });

  it('laisse passer un billet offert (code promo 100 %)', () => {
    // Le backend marque ces lignes is_paid sans creer de Payment.
    const reg = {
      status: 'confirmed',
      payment_info: null,
      tickets: [{ is_paid: true, total_price: 0 }],
    };
    expect(isRegistrationUnsettled(reg)).toBe(false);
  });

  it('gere une inscription a formulaire sans detail billets', () => {
    expect(isRegistrationUnsettled({
      status: 'confirmed', payment_required: true, total_amount: 2000,
    })).toBe(true);
    expect(isRegistrationUnsettled({
      status: 'confirmed', payment_required: false, total_amount: 0,
    })).toBe(false);
  });

  it('refuse de presenter un statut non confirme, meme paye', () => {
    expect(isRegistrationPresentable({
      status: 'cancelled', payment_info: { status: 'completed' },
    })).toBe(false);
  });

  it('ne plante pas sur des donnees absentes ou partielles', () => {
    expect(isRegistrationUnsettled(null)).toBe(false);
    expect(isRegistrationUnsettled(undefined)).toBe(false);
    expect(isRegistrationPresentable({})).toBe(false);
    expect(hasAmountDue({ tickets: [{ total_price: 'abc' as any }] })).toBe(false);
  });

  it('signale un reste a payer dans un lot partiellement regle', () => {
    const reg = {
      status: 'confirmed',
      tickets: [
        { is_paid: true, total_price: 1000 },
        { is_paid: false, total_price: 3000 },
      ],
    };
    // Il reste bien quelque chose a payer...
    expect(hasAmountDue(reg)).toBe(true);
    // ...mais un billet PAYANT a bien ete regle : l'inscription n'est pas
    // « jamais payee », et le billet acquis doit rester utilisable.
    // (Masquer toute la carte ferait perdre au participant le QR de la
    // place qu'il a payee — cf. regression de l'ajout de billets.)
    expect(hasSettledPayment(reg)).toBe(true);
    expect(isRegistrationPresentable(reg)).toBe(true);
  });
});

describe('paymentSettled — scenarios reels de bout en bout', () => {
  // Le backend ne pose `registration.payment` qu'UNE fois (`if not
  // registration.payment`, apps/payments/utils.py). Apres un echec suivi
  // d'une reussite, `payment_info` peut donc remonter le paiement le PLUS
  // RECENT (echoue/pending) et non celui qui a abouti. Se fier au seul
  // `payment_info` refuserait un billet pourtant paye.
  it('accepte un paiement reussi apres un premier echec (retry)', () => {
    const reg = {
      status: 'confirmed',
      payment_info: { status: 'failed' },
      tickets: [{ is_paid: true, total_price: 5000 }],
    };
    expect(isRegistrationUnsettled(reg)).toBe(false);
    expect(isRegistrationPresentable(reg)).toBe(true);
  });

  it("refuse quand le retry n'a pas non plus abouti", () => {
    const reg = {
      status: 'confirmed',
      payment_info: { status: 'failed' },
      tickets: [{ is_paid: false, total_price: 5000 }],
    };
    expect(isRegistrationPresentable(reg)).toBe(false);
  });

  // Ajout de billets sur une inscription deja payee : le backend laisse
  // l'inscription `confirmed` (utils.py ne retouche pas un statut deja
  // terminal) et cree des TicketPurchase impayes. Les billets deja acquis
  // ne doivent pas devenir impresentables pour autant — mais l'inscription
  // porte bien un impaye, donc on ne la presente pas comme entierement
  // reglee. C'est le comportement voulu : le participant doit voir qu'il
  // reste a payer.
  it('signale un reliquat apres ajout de billets a une inscription payee', () => {
    const reg = {
      status: 'confirmed',
      payment_info: { status: 'completed' },
      tickets: [
        { is_paid: true, total_price: 5000 },
        { is_paid: false, total_price: 2000 },
      ],
    };
    expect(hasAmountDue(reg)).toBe(true);
    // `payment_info.status === 'completed'` prouve qu'un encaissement a eu
    // lieu : on ne traite donc pas l'inscription comme jamais payee.
    expect(hasSettledPayment(reg)).toBe(true);
    expect(isRegistrationUnsettled(reg)).toBe(false);
  });

  it('accepte un billet deja scanne (checked_in)', () => {
    expect(isRegistrationPresentable({
      status: 'checked_in',
      payment_info: { status: 'completed' },
      tickets: [{ is_paid: true, total_price: 5000 }],
    })).toBe(true);
  });

  it('refuse une inscription en attente d\'approbation', () => {
    expect(isRegistrationPresentable({
      status: 'pending_approval', tickets: [{ is_paid: true, total_price: 0 }],
    })).toBe(false);
  });

  // Vente au guichet : l'organisateur encaisse en especes, le backend cree
  // un Payment `completed` (payment_method='cash').
  it('accepte une vente au guichet reglee en especes', () => {
    expect(isRegistrationPresentable({
      status: 'confirmed',
      payment_info: { status: 'completed', method: 'cash' },
      tickets: [{ is_paid: true, total_price: 3000 }],
    })).toBe(true);
  });

  // Le prix peut arriver en chaine depuis l'API (DecimalField DRF).
  it('gere un total_price transmis en chaine', () => {
    expect(isRegistrationUnsettled({
      status: 'confirmed', tickets: [{ is_paid: false, total_price: '5000.00' as any }],
    })).toBe(true);
    expect(isRegistrationUnsettled({
      status: 'confirmed', tickets: [{ is_paid: false, total_price: '0.00' as any }],
    })).toBe(false);
  });

  // Un tableau `tickets` absent ne doit pas rendre un impaye presentable.
  it('ne presente pas une inscription payante sans detail billets', () => {
    expect(isRegistrationPresentable({
      status: 'confirmed', payment_required: true, total_amount: 5000,
      payment_info: { status: 'pending' },
    })).toBe(false);
  });
});

describe('paymentSettled — ajout de billets (regression B3)', () => {
  // Le participant paie sa place, puis ajoute un billet qu'il ne paie pas.
  // Il ne doit PAS perdre le QR de la place deja reglee : `payment_info` ne
  // remonte que le paiement le plus recent (l'add-on `pending`), masquant
  // le `completed` d'origine.
  it('conserve le billet paye quand un add-on impaye s\'y ajoute', () => {
    const reg = {
      status: 'confirmed',
      payment_info: { status: 'pending' }, // l'add-on masque le completed
      tickets: [
        { is_paid: true, total_price: 5000 },
        { is_paid: false, total_price: 2000 },
      ],
    };
    expect(isRegistrationPresentable(reg)).toBe(true);
  });

  // Contre-epreuve : le faux positif d'origine ne doit PAS se rouvrir.
  // Aucun billet acquis, aucune preuve => rien n'est presentable.
  it('ne presente rien quand aucun billet n\'est acquis', () => {
    expect(isRegistrationPresentable({
      status: 'confirmed',
      payment_info: { status: 'pending' },
      tickets: [
        { is_paid: false, total_price: 5000 },
        { is_paid: false, total_price: 2000 },
      ],
    })).toBe(false);
  });

  // Piege du relachement : un billet GRATUIT (is_paid par le backend) ne
  // doit pas servir de preuve pour un billet payant jamais regle.
  it('un billet gratuit ne fait pas passer un billet payant impaye', () => {
    const reg = {
      status: 'confirmed',
      payment_info: null,
      tickets: [
        { is_paid: true, total_price: 0 },      // gratuit
        { is_paid: false, total_price: 5000 },  // payant, jamais regle
      ],
    };
    expect(hasAmountDue(reg)).toBe(true);
    expect(isRegistrationPresentable(reg)).toBe(false);
  });
});
