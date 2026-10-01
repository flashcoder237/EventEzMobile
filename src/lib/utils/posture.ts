/**
 * Détecteurs de posture du téléphone (round 3, G0) — fonctions PURES, marquées
 * worklet : elles tournent sur le thread UI (capteurs Reanimated) et se testent
 * telles quelles avec Jest sur des séries d'échantillons.
 *
 * Convention (celle d'Android, m/s²) : écran vers le ciel → g.z ≈ +9,81 ;
 * téléphone tenu droit en portrait → g.y ≈ +9,81. Sur iOS, Reanimated renvoie
 * les valeurs CoreMotion (converties en m/s²) avec le signe d'iOS, opposé :
 * l'appelant les normalise avec `normalizeAxes` avant de les passer ici.
 *
 * Événements produits :
 *  - shake        : secousse franche (pas la marche ni la course) ;
 *  - faceDown     : posé face contre table, immobile 1,2 s ;
 *  - faceUp       : retourné face visible après un faceDown ;
 *  - presentAway  : écran tendu au-delà de la verticale (> 100° pendant 0,4 s) ;
 *  - presentBack  : retour (< 80° pendant 0,3 s) ;
 *  - raise        : à plat ≥ 1 s puis levé (> 60°) en moins de 0,7 s, avec élan.
 */

export type PostureEvent = 'shake' | 'faceDown' | 'faceUp' | 'presentAway' | 'presentBack' | 'raise';

export interface PostureSample {
  /** Horodatage en ms. */
  t: number;
  /** Gravité (m/s², convention Android). */
  gx: number;
  gy: number;
  gz: number;
  /** Accéléromètre brut (m/s², convention Android, gravité incluse ou non). */
  ax: number;
  ay: number;
  az: number;
}

export interface PostureState {
  /** Passe-bas de l'accéléromètre (sa composante lente) → linéaire = brut − lent. */
  lpX: number;
  lpY: number;
  lpZ: number;
  lastT: number;
  // secousse
  shakeAxis: number; // 0 x, 1 y, 2 z
  shakeSign: number;
  shakeFlips: number;
  shakeWindowStart: number;
  shakeCooldownUntil: number;
  // face contre table
  faceDownSince: number;
  isFaceDown: boolean;
  faceUpSince: number;
  // présentation
  presentSince: number;
  presentBackSince: number;
  isPresenting: boolean;
  // lever
  flatSince: number;
  flatArmedAt: number;
  raisePeak: number;
}

export const POSTURE = {
  SHAKE_THRESHOLD: 13, // m/s² d'accélération utile
  SHAKE_FLIPS: 4,
  SHAKE_WINDOW_MS: 700,
  SHAKE_COOLDOWN_MS: 1500,
  FACE_DOWN_MS: 1200,
  FACE_DOWN_STILL: 0.3, // m/s² d'accélération utile max
  FACE_UP_MS: 150,
  PRESENT_ON_DEG: 100,
  PRESENT_ON_MS: 400,
  PRESENT_OFF_DEG: 80,
  PRESENT_OFF_MS: 300,
  RAISE_FLAT_DEG: 30,
  RAISE_FLAT_MS: 1000,
  RAISE_UP_DEG: 60,
  RAISE_WINDOW_MS: 700,
  RAISE_PEAK: 1.5, // m/s² d'élan minimal
  LOWPASS_MS: 200,
};

export function initialPostureState(): PostureState {
  'worklet';
  return {
    lpX: 0, lpY: 0, lpZ: 0, lastT: 0,
    shakeAxis: -1, shakeSign: 0, shakeFlips: 0, shakeWindowStart: 0, shakeCooldownUntil: 0,
    faceDownSince: 0, isFaceDown: false, faceUpSince: 0,
    presentSince: 0, presentBackSince: 0, isPresenting: false,
    flatSince: 0, flatArmedAt: 0, raisePeak: 0,
  };
}

/** Normalise vers la convention Android (iOS : signe opposé sur les 3 axes). */
export function normalizeAxes(x: number, y: number, z: number, isIOS: boolean): [number, number, number] {
  'worklet';
  return isIOS ? [-x, -y, -z] : [x, y, z];
}

/** Angle (°) entre la normale de l'écran et le ciel : 0 = à plat face visible, 90 = vertical, 180 = face contre table. */
export function screenAngle(gx: number, gy: number, gz: number): number {
  'worklet';
  const n = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
  const c = Math.max(-1, Math.min(1, gz / n));
  return (Math.acos(c) * 180) / Math.PI;
}

/**
 * Fait avancer les détecteurs d'un échantillon. Renvoie le NOUVEL état et la
 * liste des événements apparus (souvent vide). Ne modifie pas `prev`.
 */
export function stepPosture(prev: PostureState, s: PostureSample): { state: PostureState; events: PostureEvent[] } {
  'worklet';
  const st: PostureState = { ...prev };
  const events: PostureEvent[] = [];

  // ── Accélération utile = brut − composante lente (passe-haut). Fonctionne
  // que l'accéléromètre inclue la gravité ou non.
  if (st.lastT === 0) {
    st.lpX = s.ax;
    st.lpY = s.ay;
    st.lpZ = s.az;
  } else {
    const dt = Math.max(1, Math.min(200, s.t - st.lastT));
    const k = 1 - Math.exp(-dt / POSTURE.LOWPASS_MS);
    st.lpX += (s.ax - st.lpX) * k;
    st.lpY += (s.ay - st.lpY) * k;
    st.lpZ += (s.az - st.lpZ) * k;
  }
  st.lastT = s.t;
  const lx = s.ax - st.lpX;
  const ly = s.ay - st.lpY;
  const lz = s.az - st.lpZ;
  const lin = Math.sqrt(lx * lx + ly * ly + lz * lz);

  // ── Secousse : plusieurs changements de sens francs sur l'axe dominant.
  const comps = [lx, ly, lz];
  let axis = 0;
  if (Math.abs(ly) > Math.abs(comps[axis])) axis = 1;
  if (Math.abs(lz) > Math.abs(comps[axis])) axis = 2;
  const v = comps[axis];
  if (s.t >= st.shakeCooldownUntil && Math.abs(v) > POSTURE.SHAKE_THRESHOLD) {
    const sign = v > 0 ? 1 : -1;
    if (st.shakeFlips === 0 || s.t - st.shakeWindowStart > POSTURE.SHAKE_WINDOW_MS || axis !== st.shakeAxis) {
      st.shakeAxis = axis;
      st.shakeSign = sign;
      st.shakeFlips = 1;
      st.shakeWindowStart = s.t;
    } else if (sign !== st.shakeSign) {
      st.shakeSign = sign;
      st.shakeFlips += 1;
      if (st.shakeFlips >= POSTURE.SHAKE_FLIPS) {
        events.push('shake');
        st.shakeFlips = 0;
        st.shakeCooldownUntil = s.t + POSTURE.SHAKE_COOLDOWN_MS;
      }
    }
  }

  const angle = screenAngle(s.gx, s.gy, s.gz);

  // ── Face contre table (stable et immobile), puis retour face visible.
  if (!st.isFaceDown) {
    if (s.gz < -9 && lin < POSTURE.FACE_DOWN_STILL) {
      if (st.faceDownSince === 0) st.faceDownSince = s.t;
      if (s.t - st.faceDownSince >= POSTURE.FACE_DOWN_MS) {
        st.isFaceDown = true;
        st.faceUpSince = 0;
        events.push('faceDown');
      }
    } else {
      st.faceDownSince = 0;
    }
  } else if (s.gz > -5) {
    if (st.faceUpSince === 0) st.faceUpSince = s.t;
    if (s.t - st.faceUpSince >= POSTURE.FACE_UP_MS) {
      st.isFaceDown = false;
      st.faceDownSince = 0;
      events.push('faceUp');
    }
  } else {
    st.faceUpSince = 0;
  }

  // ── Présentation : écran tendu au-delà de la verticale (pas posé à plat
  // face contre table : on exige que le téléphone soit plutôt debout).
  const upright = Math.sqrt(s.gx * s.gx + s.gy * s.gy) > 4; // portrait ou paysage
  if (!st.isPresenting) {
    if (angle > POSTURE.PRESENT_ON_DEG && upright && !st.isFaceDown) {
      if (st.presentSince === 0) st.presentSince = s.t;
      if (s.t - st.presentSince >= POSTURE.PRESENT_ON_MS) {
        st.isPresenting = true;
        st.presentBackSince = 0;
        events.push('presentAway');
      }
    } else {
      st.presentSince = 0;
    }
  } else if (angle < POSTURE.PRESENT_OFF_DEG) {
    if (st.presentBackSince === 0) st.presentBackSince = s.t;
    if (s.t - st.presentBackSince >= POSTURE.PRESENT_OFF_MS) {
      st.isPresenting = false;
      st.presentSince = 0;
      events.push('presentBack');
    }
  } else {
    st.presentBackSince = 0;
  }

  // ── Lever : à plat (face visible) au moins 1 s, puis levé vite avec élan.
  if (angle < POSTURE.RAISE_FLAT_DEG) {
    if (st.flatSince === 0) st.flatSince = s.t;
    if (s.t - st.flatSince >= POSTURE.RAISE_FLAT_MS) {
      st.flatArmedAt = s.t; // dernier instant où il était à plat « armé »
      st.raisePeak = 0;
    }
  } else {
    st.flatSince = 0;
    if (st.flatArmedAt > 0) {
      if (s.t - st.flatArmedAt <= POSTURE.RAISE_WINDOW_MS) {
        st.raisePeak = Math.max(st.raisePeak, lin);
        if (angle > POSTURE.RAISE_UP_DEG && st.raisePeak >= POSTURE.RAISE_PEAK) {
          events.push('raise');
          st.flatArmedAt = 0;
          st.raisePeak = 0;
        }
      } else {
        st.flatArmedAt = 0;
        st.raisePeak = 0;
      }
    }
  }

  return { state: st, events };
}
