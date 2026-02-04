// @ts-nocheck
import {
  TIMING_CONSTANTS,
  FAST_DIGRAPHS,
  PUNCTUATION_CHARS,
  calculateHumanReactionDelay,
  calculateRandomDelayMultiplier,
  calculateDigraphMultiplier,
  calculateSpaceDelayMultiplier,
  calculatePunctuationMultiplier,
  calculateKeypressDelay,
  RandomNumberGenerator,
  DefaultRNG,
} from '../../src/timing-utils';

describe('timing-utils', () => {
  describe('Constants', () => {
    it('should export timing constants', () => {
      expect(TIMING_CONSTANTS.SCROLL_DELAY_MS).toBe(200);
      expect(TIMING_CONSTANTS.HUMAN_REACTION_BASE_MS).toBe(100);
      expect(TIMING_CONSTANTS.HUMAN_REACTION_VARIANCE_MS).toBe(100);
      expect(TIMING_CONSTANTS.RANDOM_VARIANCE_MIN).toBe(0.7);
      expect(TIMING_CONSTANTS.RANDOM_VARIANCE_RANGE).toBe(0.6);
      expect(TIMING_CONSTANTS.DIGRAPH_SPEED_MULTIPLIER).toBe(0.7);
      expect(TIMING_CONSTANTS.SPACE_PAUSE_MULTIPLIER).toBe(1.3);
      expect(TIMING_CONSTANTS.PUNCTUATION_PAUSE_MULTIPLIER).toBe(1.5);
    });

    it('should export fast digraphs array', () => {
      expect(FAST_DIGRAPHS).toEqual(['th', 'er', 'on', 'an', 'en', 'in', 're', 'he', 'ed', 'nd']);
      expect(FAST_DIGRAPHS.length).toBe(10);
    });

    it('should export punctuation characters array', () => {
      expect(PUNCTUATION_CHARS).toEqual(['.', ',', '!', '?']);
      expect(PUNCTUATION_CHARS.length).toBe(4);
    });

    it('should include all expected digraphs', () => {
      expect(FAST_DIGRAPHS).toContain('th');
      expect(FAST_DIGRAPHS).toContain('er');
      expect(FAST_DIGRAPHS).toContain('on');
      expect(FAST_DIGRAPHS).toContain('an');
      expect(FAST_DIGRAPHS).toContain('en');
      expect(FAST_DIGRAPHS).toContain('in');
      expect(FAST_DIGRAPHS).toContain('re');
      expect(FAST_DIGRAPHS).toContain('he');
      expect(FAST_DIGRAPHS).toContain('ed');
      expect(FAST_DIGRAPHS).toContain('nd');
    });

    it('should include all expected punctuation', () => {
      expect(PUNCTUATION_CHARS).toContain('.');
      expect(PUNCTUATION_CHARS).toContain(',');
      expect(PUNCTUATION_CHARS).toContain('!');
      expect(PUNCTUATION_CHARS).toContain('?');
    });
  });

  describe('DefaultRNG', () => {
    it('should generate random numbers', () => {
      const rng = new DefaultRNG();
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  describe('calculateHumanReactionDelay', () => {
    it('should calculate minimum delay with random=0', () => {
      expect(calculateHumanReactionDelay(0)).toBe(100);
    });

    it('should calculate maximum delay with random=1', () => {
      expect(calculateHumanReactionDelay(1)).toBe(200);
    });

    it('should calculate mid-range delay with random=0.5', () => {
      expect(calculateHumanReactionDelay(0.5)).toBe(150);
    });

    it('should handle fractional random values', () => {
      expect(calculateHumanReactionDelay(0.25)).toBe(125);
      expect(calculateHumanReactionDelay(0.75)).toBe(175);
    });
  });

  describe('calculateRandomDelayMultiplier', () => {
    it('should calculate minimum multiplier with random=0', () => {
      expect(calculateRandomDelayMultiplier(0)).toBe(0.7);
    });

    it('should calculate maximum multiplier with random=1', () => {
      expect(calculateRandomDelayMultiplier(1)).toBeCloseTo(1.3, 2);
    });

    it('should calculate mid-range multiplier with random=0.5', () => {
      expect(calculateRandomDelayMultiplier(0.5)).toBe(1.0);
    });

    it('should handle fractional random values', () => {
      expect(calculateRandomDelayMultiplier(0.25)).toBeCloseTo(0.85, 2);
      expect(calculateRandomDelayMultiplier(0.75)).toBeCloseTo(1.15, 2);
    });
  });

  describe('calculateDigraphMultiplier', () => {
    it('should return 0.7 for fast digraph "th"', () => {
      expect(calculateDigraphMultiplier('t', 'h')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "er"', () => {
      expect(calculateDigraphMultiplier('e', 'r')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "on"', () => {
      expect(calculateDigraphMultiplier('o', 'n')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "an"', () => {
      expect(calculateDigraphMultiplier('a', 'n')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "en"', () => {
      expect(calculateDigraphMultiplier('e', 'n')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "in"', () => {
      expect(calculateDigraphMultiplier('i', 'n')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "re"', () => {
      expect(calculateDigraphMultiplier('r', 'e')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "he"', () => {
      expect(calculateDigraphMultiplier('h', 'e')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "ed"', () => {
      expect(calculateDigraphMultiplier('e', 'd')).toBe(0.7);
    });

    it('should return 0.7 for fast digraph "nd"', () => {
      expect(calculateDigraphMultiplier('n', 'd')).toBe(0.7);
    });

    it('should return 1.0 for non-fast digraph "ab"', () => {
      expect(calculateDigraphMultiplier('a', 'b')).toBe(1.0);
    });

    it('should return 1.0 for non-fast digraph "xy"', () => {
      expect(calculateDigraphMultiplier('x', 'y')).toBe(1.0);
    });

    it('should be case-insensitive for "TH"', () => {
      expect(calculateDigraphMultiplier('T', 'H')).toBe(0.7);
    });

    it('should be case-insensitive for "Er"', () => {
      expect(calculateDigraphMultiplier('E', 'r')).toBe(0.7);
    });
  });

  describe('calculateSpaceDelayMultiplier', () => {
    it('should return 1.3 when prevChar is space', () => {
      expect(calculateSpaceDelayMultiplier(' ')).toBe(1.3);
    });

    it('should return 1.0 when prevChar is not space', () => {
      expect(calculateSpaceDelayMultiplier('a')).toBe(1.0);
    });

    it('should return 1.0 for empty string', () => {
      expect(calculateSpaceDelayMultiplier('')).toBe(1.0);
    });

    it('should return 1.0 for punctuation', () => {
      expect(calculateSpaceDelayMultiplier('.')).toBe(1.0);
    });
  });

  describe('calculatePunctuationMultiplier', () => {
    it('should return 1.5 for period', () => {
      expect(calculatePunctuationMultiplier('.')).toBe(1.5);
    });

    it('should return 1.5 for comma', () => {
      expect(calculatePunctuationMultiplier(',')).toBe(1.5);
    });

    it('should return 1.5 for exclamation', () => {
      expect(calculatePunctuationMultiplier('!')).toBe(1.5);
    });

    it('should return 1.5 for question mark', () => {
      expect(calculatePunctuationMultiplier('?')).toBe(1.5);
    });

    it('should return 1.0 for non-punctuation', () => {
      expect(calculatePunctuationMultiplier('a')).toBe(1.0);
    });

    it('should return 1.0 for space', () => {
      expect(calculatePunctuationMultiplier(' ')).toBe(1.0);
    });

    it('should return 1.0 for other punctuation like semicolon', () => {
      expect(calculatePunctuationMultiplier(';')).toBe(1.0);
    });
  });

  describe('calculateKeypressDelay', () => {
    class MockRNG implements RandomNumberGenerator {
      constructor(private value: number) {}
      random(): number {
        return this.value;
      }
    }

    it('should calculate delay with all factors at baseline', () => {
      const rng = new MockRNG(0.5); // Middle random value
      const delay = calculateKeypressDelay('a', 'b', 100, rng);
      // 100 * 1.0 (mid random) * 1.0 (no digraph) * 1.0 (no space) * 1.0 (no punct) = 100
      expect(delay).toBe(100);
    });

    it('should apply fast digraph multiplier', () => {
      const rng = new MockRNG(0.5);
      const delay = calculateKeypressDelay('t', 'h', 100, rng);
      // 100 * 1.0 * 0.7 * 1.0 * 1.0 = 70
      expect(delay).toBe(70);
    });

    it('should apply space delay multiplier', () => {
      const rng = new MockRNG(0.5);
      const delay = calculateKeypressDelay(' ', 'a', 100, rng);
      // 100 * 1.0 * 1.0 * 1.3 * 1.0 = 130
      expect(delay).toBe(130);
    });

    it('should apply punctuation delay multiplier', () => {
      const rng = new MockRNG(0.5);
      const delay = calculateKeypressDelay('.', 'a', 100, rng);
      // 100 * 1.0 * 1.0 * 1.0 * 1.5 = 150
      expect(delay).toBe(150);
    });

    it('should apply minimum random variation', () => {
      const rng = new MockRNG(0);
      const delay = calculateKeypressDelay('a', 'b', 100, rng);
      // 100 * 0.7 * 1.0 * 1.0 * 1.0 = 70
      expect(delay).toBe(70);
    });

    it('should apply maximum random variation', () => {
      const rng = new MockRNG(1);
      const delay = calculateKeypressDelay('a', 'b', 100, rng);
      // 100 * 1.3 * 1.0 * 1.0 * 1.0 = 130
      expect(delay).toBe(130);
    });

    it('should combine all factors', () => {
      const rng = new MockRNG(0.5);
      const delay = calculateKeypressDelay('.', ' ', 100, rng);
      // After '.', typing ' ': 100 * 1.0 * 1.0 * 1.0 * 1.5 = 150
      // (punctuation applies to prevChar, space doesn't apply to currentChar)
      expect(delay).toBe(150);
    });

    it('should round the result', () => {
      const rng = new MockRNG(0.333);
      const delay = calculateKeypressDelay('a', 'b', 100, rng);
      // Should produce a rounded integer
      expect(Number.isInteger(delay)).toBe(true);
    });

    it('should use default RNG when not provided', () => {
      const delay = calculateKeypressDelay('a', 'b', 100);
      expect(delay).toBeGreaterThan(0);
      expect(Number.isInteger(delay)).toBe(true);
    });
  });
});
