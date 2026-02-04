/**
 * Timing constants for natural typing and interaction delays
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
export const TIMING_CONSTANTS = {
  /** Base delay for smooth scrolling feel in milliseconds */
  SCROLL_DELAY_MS: 200,
  /** Base human reaction time in milliseconds */
  HUMAN_REACTION_BASE_MS: 100,
  /** Variance in human reaction time in milliseconds */
  HUMAN_REACTION_VARIANCE_MS: 100,
  /** Minimum multiplier for random delay variation (0.7 = -30%) */
  RANDOM_VARIANCE_MIN: 0.7,
  /** Range for random delay variation (0.6 = +60%, total range -30% to +30%) */
  RANDOM_VARIANCE_RANGE: 0.6,
  /** Speed multiplier for common digraphs (0.7 = 30% faster) */
  DIGRAPH_SPEED_MULTIPLIER: 0.7,
  /** Pause multiplier after space character (1.3 = 30% slower) */
  SPACE_PAUSE_MULTIPLIER: 1.3,
  /** Pause multiplier after punctuation (1.5 = 50% slower) */
  PUNCTUATION_PAUSE_MULTIPLIER: 1.5
} as const;

/**
 * Common digraphs that are typed faster due to muscle memory
 */
export const FAST_DIGRAPHS = ['th', 'er', 'on', 'an', 'en', 'in', 're', 'he', 'ed', 'nd'] as const;

/**
 * Punctuation characters that trigger a pause after typing
 */
export const PUNCTUATION_CHARS = ['.', ',', '!', '?'] as const;

/**
 * Random number generator interface for dependency injection
 */
export interface RandomNumberGenerator {
  /** Generate a random number in [0, 1) */
  random(): number;
}

/**
 * Default random number generator using Math.random()
 */
export class DefaultRNG implements RandomNumberGenerator {
  random(): number {
    if (stryMutAct_9fa48("549")) {
      {}
    } else {
      stryCov_9fa48("549");
      return Math.random();
    }
  }
}

/**
 * Calculate human reaction delay with random variation
 * @param random Random value in [0, 1)
 * @returns Delay in milliseconds
 */
export function calculateHumanReactionDelay(random: number): number {
  if (stryMutAct_9fa48("550")) {
    {}
  } else {
    stryCov_9fa48("550");
    return stryMutAct_9fa48("551") ? TIMING_CONSTANTS.HUMAN_REACTION_BASE_MS - random * TIMING_CONSTANTS.HUMAN_REACTION_VARIANCE_MS : (stryCov_9fa48("551"), TIMING_CONSTANTS.HUMAN_REACTION_BASE_MS + (stryMutAct_9fa48("552") ? random / TIMING_CONSTANTS.HUMAN_REACTION_VARIANCE_MS : (stryCov_9fa48("552"), random * TIMING_CONSTANTS.HUMAN_REACTION_VARIANCE_MS)));
  }
}

/**
 * Calculate random delay variation multiplier
 * @param random Random value in [0, 1)
 * @returns Multiplier for delay variation
 */
export function calculateRandomDelayMultiplier(random: number): number {
  if (stryMutAct_9fa48("553")) {
    {}
  } else {
    stryCov_9fa48("553");
    return stryMutAct_9fa48("554") ? TIMING_CONSTANTS.RANDOM_VARIANCE_MIN - random * TIMING_CONSTANTS.RANDOM_VARIANCE_RANGE : (stryCov_9fa48("554"), TIMING_CONSTANTS.RANDOM_VARIANCE_MIN + (stryMutAct_9fa48("555") ? random / TIMING_CONSTANTS.RANDOM_VARIANCE_RANGE : (stryCov_9fa48("555"), random * TIMING_CONSTANTS.RANDOM_VARIANCE_RANGE)));
  }
}

/**
 * Calculate delay multiplier for common digraphs
 * @param prevChar Previous character
 * @param currentChar Current character
 * @returns Multiplier (0.7 for fast digraphs, 1.0 otherwise)
 */
export function calculateDigraphMultiplier(prevChar: string, currentChar: string): number {
  if (stryMutAct_9fa48("556")) {
    {}
  } else {
    stryCov_9fa48("556");
    const digraph = stryMutAct_9fa48("557") ? (prevChar + currentChar).toUpperCase() : (stryCov_9fa48("557"), (stryMutAct_9fa48("558") ? prevChar - currentChar : (stryCov_9fa48("558"), prevChar + currentChar)).toLowerCase());
    return FAST_DIGRAPHS.includes(digraph as any) ? TIMING_CONSTANTS.DIGRAPH_SPEED_MULTIPLIER : 1.0;
  }
}

/**
 * Calculate delay multiplier for space character
 * @param prevChar Previous character
 * @returns Multiplier (1.3 after space, 1.0 otherwise)
 */
export function calculateSpaceDelayMultiplier(prevChar: string): number {
  if (stryMutAct_9fa48("559")) {
    {}
  } else {
    stryCov_9fa48("559");
    return (stryMutAct_9fa48("562") ? prevChar !== ' ' : stryMutAct_9fa48("561") ? false : stryMutAct_9fa48("560") ? true : (stryCov_9fa48("560", "561", "562"), prevChar === (stryMutAct_9fa48("563") ? "" : (stryCov_9fa48("563"), ' ')))) ? TIMING_CONSTANTS.SPACE_PAUSE_MULTIPLIER : 1.0;
  }
}

/**
 * Calculate delay multiplier for punctuation
 * @param prevChar Previous character
 * @returns Multiplier (1.5 after punctuation, 1.0 otherwise)
 */
export function calculatePunctuationMultiplier(prevChar: string): number {
  if (stryMutAct_9fa48("564")) {
    {}
  } else {
    stryCov_9fa48("564");
    return PUNCTUATION_CHARS.includes(prevChar as any) ? TIMING_CONSTANTS.PUNCTUATION_PAUSE_MULTIPLIER : 1.0;
  }
}

/**
 * Calculate complete keypress delay with all factors
 * @param prevChar Previous character
 * @param currentChar Current character
 * @param baseDelay Base delay in milliseconds
 * @param rng Random number generator
 * @returns Calculated delay in milliseconds
 */
export function calculateKeypressDelay(prevChar: string, currentChar: string, baseDelay: number, rng: RandomNumberGenerator = new DefaultRNG()): number {
  if (stryMutAct_9fa48("565")) {
    {}
  } else {
    stryCov_9fa48("565");
    let delay = baseDelay;

    // 1. Random variation (+/- 30%)
    stryMutAct_9fa48("566") ? delay /= calculateRandomDelayMultiplier(rng.random()) : (stryCov_9fa48("566"), delay *= calculateRandomDelayMultiplier(rng.random()));

    // 2. Common digraphs are faster
    stryMutAct_9fa48("567") ? delay /= calculateDigraphMultiplier(prevChar, currentChar) : (stryCov_9fa48("567"), delay *= calculateDigraphMultiplier(prevChar, currentChar));

    // 3. After space = slight pause (thinking)
    stryMutAct_9fa48("568") ? delay /= calculateSpaceDelayMultiplier(prevChar) : (stryCov_9fa48("568"), delay *= calculateSpaceDelayMultiplier(prevChar));

    // 4. Punctuation followed by longer pause
    stryMutAct_9fa48("569") ? delay /= calculatePunctuationMultiplier(prevChar) : (stryCov_9fa48("569"), delay *= calculatePunctuationMultiplier(prevChar));
    return Math.round(delay);
  }
}