import { NarratedDemo } from '../../src/demo-builder';
import path from 'path';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: `file://${path.resolve(__dirname, '../tax-forms/index.html')}`,
    output: './output/test-cursor.mp4',
    showCursor: true,
  });

  await demo.start();
  await demo.page.waitForTimeout(500);
  // Hover over different elements to see cursor movement
  await demo.page.locator('#employer-name').hover();
  await demo.page.waitForTimeout(800);
  // Use specific button text to avoid matching multiple Continue buttons
  await demo.page.locator('button:has-text("Continue to 1099")').hover();
  await demo.page.waitForTimeout(800);
  await demo.finish();
}

run().catch(console.error);
