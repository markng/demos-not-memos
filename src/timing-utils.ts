/**
 * Timing constants for natural typing and interaction delays
 */
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
  PUNCTUATION_PAUSE_MULTIPLIER: 1.5,
} as const;

/**
 * Common digraphs that are typed faster due to muscle memory
 */
export const FAST_DIGRAPHS = [
  'th', 'er', 'on', 'an', 'en', 'in', 're', 'he', 'ed', 'nd'
] as const;

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
    return Math.random();
  }
}

/**
 * Calculate human reaction delay with random variation
 * @param random Random value in [0, 1)
 * @returns Delay in milliseconds
 */
export function calculateHumanReactionDelay(random: number): number {
  return TIMING_CONSTANTS.HUMAN_REACTION_BASE_MS + 
         random * TIMING_CONSTANTS.HUMAN_REACTION_VARIANCE_MS;
}

/**
 * Calculate random delay variation multiplier
 * @param random Random value in [0, 1)
 * @returns Multiplier for delay variation
 */
export function calculateRandomDelayMultiplier(random: number): number {
  return TIMING_CONSTANTS.RANDOM_VARIANCE_MIN + 
         random * TIMING_CONSTANTS.RANDOM_VARIANCE_RANGE;
}

/**
 * Calculate delay multiplier for common digraphs
 * @param prevChar Previous character
 * @param currentChar Current character
 * @returns Multiplier (0.7 for fast digraphs, 1.0 otherwise)
 */
export function calculateDigraphMultiplier(prevChar: string, currentChar: string): number {
  const digraph = (prevChar + currentChar).toLowerCase();
  return FAST_DIGRAPHS.includes(digraph as any) 
    ? TIMING_CONSTANTS.DIGRAPH_SPEED_MULTIPLIER 
    : 1.0;
}

/**
 * Calculate delay multiplier for space character
 * @param prevChar Previous character
 * @returns Multiplier (1.3 after space, 1.0 otherwise)
 */
export function calculateSpaceDelayMultiplier(prevChar: string): number {
  return prevChar === ' ' 
    ? TIMING_CONSTANTS.SPACE_PAUSE_MULTIPLIER 
    : 1.0;
}

/**
 * Calculate delay multiplier for punctuation
 * @param prevChar Previous character
 * @returns Multiplier (1.5 after punctuation, 1.0 otherwise)
 */
export function calculatePunctuationMultiplier(prevChar: string): number {
  return PUNCTUATION_CHARS.includes(prevChar as any) 
    ? TIMING_CONSTANTS.PUNCTUATION_PAUSE_MULTIPLIER 
    : 1.0;
}

/**
 * Calculate complete keypress delay with all factors
 * @param prevChar Previous character
 * @param currentChar Current character
 * @param baseDelay Base delay in milliseconds
 * @param rng Random number generator
 * @returns Calculated delay in milliseconds
 */
export function calculateKeypressDelay(
  prevChar: string,
  currentChar: string,
  baseDelay: number,
  rng: RandomNumberGenerator = new DefaultRNG()
): number {
  let delay = baseDelay;
  
  // 1. Random variation (+/- 30%)
  delay *= calculateRandomDelayMultiplier(rng.random());
  
  // 2. Common digraphs are faster
  delay *= calculateDigraphMultiplier(prevChar, currentChar);
  
  // 3. After space = slight pause (thinking)
  delay *= calculateSpaceDelayMultiplier(prevChar);
  
  // 4. Punctuation followed by longer pause
  delay *= calculatePunctuationMultiplier(prevChar);
  
  return Math.round(delay);
}
