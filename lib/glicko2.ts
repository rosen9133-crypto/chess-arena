// lib/glicko2.ts

export type Glicko2Player = {
  rating: number;
  ratingDeviation: number;
  volatility: number;
};

export type MatchResult = 0 | 0.5 | 1;

export type Glicko2Match = {
  opponent: Glicko2Player;
  score: MatchResult;
};

export type Glicko2Result = {
  rating: number;
  ratingDeviation: number;
  volatility: number;
};

const GLICKO2_SCALE = 173.7178;
const DEFAULT_TAU = 0.5;
const EPSILON = 0.000001;

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function expectedScore(
  mu: number,
  opponentMu: number,
  opponentPhi: number
): number {
  return 1 / (1 + Math.exp(-g(opponentPhi) * (mu - opponentMu)));
}

function volatilityFunction(
  x: number,
  delta: number,
  phi: number,
  variance: number,
  a: number
): number {
  const expX = Math.exp(x);

  const numerator =
    expX * (delta * delta - phi * phi - variance - expX);

  const denominator =
    2 * Math.pow(phi * phi + variance + expX, 2);

  return numerator / denominator - (x - a) / (DEFAULT_TAU * DEFAULT_TAU);
}

function calculateNewVolatility(
  phi: number,
  volatility: number,
  delta: number,
  variance: number
): number {
  const a = Math.log(volatility * volatility);

  let A = a;
  let B: number;

  if (delta * delta > phi * phi + variance) {
    B = Math.log(delta * delta - phi * phi - variance);
  } else {
    let k = 1;

    while (
      volatilityFunction(
        a - k * DEFAULT_TAU,
        delta,
        phi,
        variance,
        a
      ) < 0
    ) {
      k += 1;
    }

    B = a - k * DEFAULT_TAU;
  }

  let fA = volatilityFunction(A, delta, phi, variance, a);
  let fB = volatilityFunction(B, delta, phi, variance, a);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);

    const fC = volatilityFunction(
      C,
      delta,
      phi,
      variance,
      a
    );

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }

    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

export function calculateGlicko2Rating(
  player: Glicko2Player,
  matches: Glicko2Match[]
): Glicko2Result {
  const mu = (player.rating - 1500) / GLICKO2_SCALE;
  const phi = player.ratingDeviation / GLICKO2_SCALE;

  if (matches.length === 0) {
    const phiStar = Math.sqrt(
      phi * phi + player.volatility * player.volatility
    );

    return {
      rating: player.rating,
      ratingDeviation: GLICKO2_SCALE * phiStar,
      volatility: player.volatility,
    };
  }

  let varianceDenominator = 0;
  let performanceSum = 0;

  for (const match of matches) {
    const opponentMu =
      (match.opponent.rating - 1500) / GLICKO2_SCALE;

    const opponentPhi =
      match.opponent.ratingDeviation / GLICKO2_SCALE;

    const opponentG = g(opponentPhi);

    const expectation = expectedScore(
      mu,
      opponentMu,
      opponentPhi
    );

    varianceDenominator +=
      opponentG *
      opponentG *
      expectation *
      (1 - expectation);

    performanceSum +=
      opponentG *
      (match.score - expectation);
  }

  const variance = 1 / varianceDenominator;
  const delta = variance * performanceSum;

  const newVolatility = calculateNewVolatility(
    phi,
    player.volatility,
    delta,
    variance
  );

  const phiStar = Math.sqrt(
    phi * phi + newVolatility * newVolatility
  );

  const newPhi =
    1 /
    Math.sqrt(
      1 / (phiStar * phiStar) +
        1 / variance
    );

  const newMu =
    mu +
    newPhi *
      newPhi *
      performanceSum;

  return {
    rating: 1500 + GLICKO2_SCALE * newMu,
    ratingDeviation: GLICKO2_SCALE * newPhi,
    volatility: newVolatility,
  };
}