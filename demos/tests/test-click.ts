import { NarratedDemo } from '../../src/demo-builder';
import path from 'path';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: `file://${path.resolve(__dirname, '../tax-forms/index.html')}`,
    output: './output/test-click.mp4',
    sounds: true,
  });

  await demo.start();
  await demo.page.waitForTimeout(500);
  // Use specific button text to avoid matching multiple Continue buttons
  await demo.page.click('button:has-text("Continue to 1099")');
  await demo.page.waitForTimeout(500);
  await demo.finish();
}

run().catch(console.error);
