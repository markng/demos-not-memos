# Contributing to demos-not-memos

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/markng/demos-not-memos.git
   cd demos-not-memos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run mutation tests
npm run test:mutation
```

## Code Quality

This project maintains 100% test coverage. Before submitting a PR:

1. Ensure all tests pass: `npm test`
2. Verify coverage: `npm run test:coverage`
3. Run mutation tests: `npm run test:mutation`
4. Build successfully: `npm run build`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Ensure CI passes
4. Submit PR with clear description of changes

## Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
