import { NarratedDemo } from '../../src/demo-builder';
import path from 'path';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: `file://${path.resolve(__dirname, '../tax-forms/index.html')}`,
    output: './output/test-typing.mp4',
    sounds: true,
  });

  await demo.start();
  await demo.page.waitForTimeout(500);

  // Test natural typing with variable timing
  // Includes common digraphs (th, er, on), spaces, and punctuation
  await demo.page.type('#employer-name', 'The quick brown fox, then another!');

  await demo.page.waitForTimeout(500);
  await demo.finish();

  console.log('Test complete! Watch for:');
  console.log('- Softer MacBook-style keyboard sounds (not clicky mechanical)');
  console.log('- Variable typing rhythm (not metronome-like)');
  console.log('- Space bar sounds slightly different/louder');
  console.log('- Faster typing on common digraphs (th, er, on)');
  console.log('- Pauses after spaces and punctuation');
}

run().catch(console.error);
