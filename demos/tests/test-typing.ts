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
  await demo.page.type('#employer-name', 'Test', { delay: 100 });
  await demo.page.waitForTimeout(500);
  await demo.finish();
}

run().catch(console.error);
