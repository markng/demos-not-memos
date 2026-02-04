/** @type {import('jest').Config} */
// @ts-nocheck

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/cli.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 98, // Allow for TypeScript-guarded defensive code paths
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  coverageDirectory: 'coverage',
  verbose: true
};
