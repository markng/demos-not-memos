# demos-not-memos

A TypeScript DSL for creating narrated demo videos with synchronized voiceover using ElevenLabs TTS and Playwright browser automation.

**Write code, not scripts.** Instead of manually recording screen captures and voiceovers, define your demo programmatically and let the DSL handle timing, audio generation, and video production.

## Features

- Playwright-based browser automation for reliable, repeatable demos
- ElevenLabs TTS with expressive audio tags for natural voiceover
- Automatic audio/video synchronization with precise timing
- UI sounds (clicks, keystrokes) for enhanced realism
- Simple, intuitive API that reads like a script

## Requirements

- **Node.js** 18.0.0 or higher
- **ffmpeg** and **ffprobe** (for audio/video processing)
- **ElevenLabs API key** (set as `ELEVENLABS_API_KEY` environment variable)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

## Installation

```bash
git clone <repository-url>
cd demos-not-memos
npm install
```

Set your ElevenLabs API key:

```bash
export ELEVENLABS_API_KEY="your-api-key-here"
```

## Quick Start

Create a demo script:

```typescript
// demos/my-demo.ts
import { NarratedDemo } from '../src/demo-builder';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: 'https://example.com',
    output: './output/my-demo.mp4'
  });

  await demo.start();

  await demo.narrate("Welcome to our product demo!");
  await demo.page.click('#get-started');
  await demo.narrate("Click Get Started to begin.");

  await demo.finish();
}

run().catch(console.error);
```

Run it:

```bash
# Using the CLI
npm run dev narrate --script demos/my-demo.ts

# Or directly with ts-node
npx ts-node demos/my-demo.ts
```

## API Reference

### NarratedDemo

The main class for creating narrated demo videos.

#### Constructor

```typescript
const demo = new NarratedDemo(config: DemoConfig);
```

**DemoConfig options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | *required* | Base URL to navigate to on start |
| `output` | `string` | *required* | Output file path for the final video (.mp4) |
| `viewport` | `{ width: number, height: number }` | `{ width: 1280, height: 720 }` | Browser viewport dimensions |
| `voice` | `string` | `'Rachel'` | ElevenLabs voice name or ID |
| `model` | `string` | `'eleven_v3'` | ElevenLabs model (use `eleven_v3` for audio tags) |
| `sounds` | `boolean` | `false` | Enable UI sounds (clicks, keystrokes) |

#### Methods

##### `start(): Promise<void>`

Launches the browser, starts video recording, and navigates to the `baseUrl`.

```typescript
await demo.start();
```

##### `page: Page | SoundEnabledPage`

Access the Playwright Page instance for browser interactions. When `sounds: true`, returns a `SoundEnabledPage` wrapper that automatically records click and type timestamps.

```typescript
// Navigation
await demo.page.goto('/products');

// Clicking
await demo.page.click('#submit-button');

// Typing (records keystroke sounds when sounds enabled)
await demo.page.type('#email', 'user@example.com');

// Fill (faster, no keystroke sounds)
await demo.page.fill('#password', 'secret123');

// Locators
await demo.page.locator('.feature-card').first().click();

// Waiting
await demo.page.waitForSelector('.loaded');
await demo.page.waitForTimeout(1000);
```

For advanced Playwright operations, access the raw page:

```typescript
const rawPage = (demo.page as SoundEnabledPage).raw;
await rawPage.evaluate(() => window.scrollTo(0, 0));
```

##### `narrate(text: string): Promise<Narration>`

Generate and play a narration segment. The method waits for the speech to complete before returning.

```typescript
await demo.narrate("This feature helps you save time.");
```

##### `finish(): Promise<string>`

Stops recording, processes audio/video, and produces the final MP4 file. Returns the output path.

```typescript
const outputPath = await demo.finish();
console.log(`Video saved to: ${outputPath}`);
```

##### `getElapsedTime(): number`

Returns milliseconds elapsed since `start()` was called.

```typescript
const elapsed = demo.getElapsedTime();
console.log(`Recording for ${elapsed}ms`);
```

### Narration

Returned by `demo.narrate()`, provides timing control for narration segments.

#### Methods

##### `waitUntilComplete(): Promise<void>`

Wait for the narration audio to finish playing. Note: `narrate()` calls this automatically, so you typically don't need to call it directly.

##### `whileDoing(action: () => Promise<void>): Promise<void>`

Execute an action in parallel with the narration. Resolves when both complete.

```typescript
// Perform an action while narrating
const narration = await demo.narrate("Watch as I scroll through the features...");
// Note: Since narrate() already waits, you'd need to restructure for parallel execution
```

##### `getDuration(): number`

Get the duration of the generated audio in milliseconds.

```typescript
const narration = await demo.narrate("Hello world");
console.log(`Duration: ${narration.getDuration()}ms`);
```

### SoundEnabledPage

A wrapper around Playwright's Page that automatically records timestamps for UI sounds.

When `sounds: true` in config, `demo.page` returns this wrapper. All standard Page methods work, with automatic sound recording for:

- `click(selector)` - Records a click sound
- `type(selector, text)` - Records a keypress for each character

```typescript
const demo = new NarratedDemo({
  baseUrl: 'https://example.com',
  output: './output/demo.mp4',
  sounds: true  // Enable UI sounds
});

await demo.start();
await demo.page.click('#button');  // Click sound recorded
await demo.page.type('#input', 'hello');  // 5 keypress sounds recorded
await demo.finish();  // Sounds mixed into final video
```

## ElevenLabs Audio Tags

The `eleven_v3` model supports expressive audio tags for natural-sounding narration. Enclose tags in square brackets:

```typescript
await demo.narrate("[excited] Check out this amazing feature!");
await demo.narrate("[whispers] Here's a little secret...");
await demo.narrate("[curious] What happens if we click here?");
```

### Supported Tags

**Emotions:**
- `[excited]` - Enthusiastic, energetic delivery
- `[curious]` - Inquisitive, wondering tone
- `[sarcastic]` - Dry, ironic delivery
- `[mischievously]` - Playful, scheming tone

**Voice Effects:**
- `[whispers]` - Soft, quiet speech
- `[sighs]` - Exasperated or relieved sigh
- `[laughs]` - Laughter
- `[crying]` - Tearful delivery

**Sound Effects:**
- `[applause]` - Clapping sounds
- `[gunshot]` - Gunshot sound
- `[gulps]` - Gulping sound

**Accents:**
- `[strong French accent]`
- `[strong British accent]`
- Other accent descriptors

**Multiple Tags:**

Combine tags within a single narration:

```typescript
await demo.narrate("[curious] What's this button do? [excited] Oh wow, that's amazing!");
```

## Voice Options

Built-in voice name mappings:

| Name | Description |
|------|-------------|
| Rachel | Clear, professional female voice (default) |
| Domi | Professional female voice |
| Bella | Warm female voice |
| Antoni | Professional male voice |
| Elli | Young female voice |
| Josh | Friendly male voice |
| Arnold | Deep male voice |
| Adam | Professional male voice |
| Sam | Conversational voice |
| Sarah | Warm female voice |

You can also use any ElevenLabs voice ID directly:

```typescript
const demo = new NarratedDemo({
  voice: 'pNInz6obpgDQGcFmaJgB',  // Voice ID
  // ...
});
```

See the [ElevenLabs Voice Library](https://elevenlabs.io/voice-library) for more voices.

## CLI Usage

The CLI provides a convenient way to run demo scripts:

```bash
# Development mode (uses ts-node)
npm run dev narrate --script <path-to-script>

# Examples
npm run dev narrate --script demos/simple-demo.ts
npm run dev narrate --script demos/roaming-panda-tour.ts
```

After building:

```bash
npm run build
node dist/cli.js narrate --script demos/my-demo.ts
```

## Example Scripts

### Simple Demo

```typescript
import { NarratedDemo } from '../src/demo-builder';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: 'https://example.com',
    voice: 'Rachel',
    model: 'eleven_v3',
    output: './output/simple-demo.mp4'
  });

  await demo.start();

  await demo.narrate("This is a simple demo.");
  await demo.page.locator('h1').scrollIntoViewIfNeeded();
  await demo.narrate("The demo is now complete.");

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch(console.error);
```

### Product Tour with Expressive Narration

```typescript
import { NarratedDemo } from '../src/demo-builder';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: 'https://your-product.com',
    voice: 'Rachel',
    model: 'eleven_v3',
    sounds: true,
    output: './output/product-tour.mp4'
  });

  await demo.start();

  // Homepage
  await demo.narrate("[excited] Welcome to our product!");

  // Navigate to features
  await demo.page.click('a[href="/features"]');
  await demo.page.waitForLoadState('networkidle');
  await demo.narrate("[curious] Let me show you what makes us special...");

  // Scroll through features
  await demo.page.locator('#key-features').scrollIntoViewIfNeeded();
  await demo.narrate("These features save our customers hours every week.");

  // Call to action
  await demo.page.click('.cta-button');
  await demo.narrate("[whispers] Getting started takes just a minute.");

  // Form demo
  await demo.page.type('#email', 'demo@example.com');
  await demo.narrate("[excited] Thanks for watching!");

  await demo.finish();
}

run().catch(console.error);
```

## How It Works

1. **Start**: Launches a Chromium browser with Playwright and begins video recording
2. **Narrate**: Generates TTS audio via ElevenLabs API, tracks timing relative to video start
3. **Browser Actions**: Your code interacts with the page while video records
4. **Finish**:
   - Closes browser and finalizes video recording
   - Concatenates audio segments with correct timing using ffmpeg
   - Merges audio track with video
   - Produces final MP4 file

## Project Structure

```
demos-not-memos/
├── src/
│   ├── index.ts          # Package exports
│   ├── cli.ts            # CLI entry point
│   ├── demo-builder.ts   # NarratedDemo & SoundEnabledPage classes
│   ├── narration.ts      # Narration class
│   ├── types.ts          # TypeScript interfaces and defaults
│   ├── audio-utils.ts    # ElevenLabs TTS generation
│   ├── ffmpeg-utils.ts   # Audio/video processing
│   └── sounds.ts         # UI sound effects
├── demos/                # Example demo scripts
├── output/               # Generated videos
└── tests/                # Test suite
```

## Development

```bash
# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### "Demo not started" error

Ensure you call `await demo.start()` before accessing `demo.page` or calling `demo.narrate()`.

### ffmpeg not found

Install ffmpeg and ensure it's in your PATH:

```bash
which ffmpeg  # Should output a path
```

### ElevenLabs API errors

- Verify your API key is set: `echo $ELEVENLABS_API_KEY`
- Check your ElevenLabs account has available credits
- Ensure you're using a valid voice name or ID

### Browser not opening

The browser launches in non-headless mode. Ensure your system supports GUI applications, or modify the `chromium.launch({ headless: false })` call in `demo-builder.ts` if needed.

### Audio/video sync issues

The DSL uses real-time timing - narration duration matches actual speech. If sync issues occur:
- Ensure your system clock is stable
- Try shorter narration segments
- Check that no background processes are causing timing delays

## License

MIT
