# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-29

### Added
- `ignoreHTTPSErrors` config option and `--ignore-https-errors` CLI flag to skip
  HTTPS/TLS certificate validation — useful when recording demos against local dev
  or staging servers that use self-signed or otherwise invalid certificates. The
  CLI flag sets the `DEMOS_IGNORE_HTTPS_ERRORS` environment variable; an explicit
  config value always takes precedence over the env var.

### Changed
- Simplified redundant code in sync-frame detection and sound-timestamp handling
  (behavior-preserving): dropped a redundant `.trim()` before `Number()` coercion
  and removed provably-redundant `sounds` guards.

### Internal
- Raised the Stryker mutation-test score from 65% to 100% (the `break: 100` gate now
  passes), adding ~100 unit tests across the demo builder, ffmpeg utilities, and
  sound modules. Genuinely-equivalent mutants are documented with inline
  `// Stryker disable` reasons.

## [0.1.0] - 2026-01-30

### Added
- Initial release
- Core demo recording with Playwright integration
- Text-to-speech narration via ElevenLabs
- Keyboard and mouse click sound effects
- Video export with FFmpeg
- `narrateAsync()` for concurrent actions during narration
- `doWhileNarrating()` convenience method
- CLI tool for running demos
- Comprehensive test suite with 100% coverage

### Technical
- TypeScript with full type definitions
- ESM and CommonJS support
- Node.js 18+ required
