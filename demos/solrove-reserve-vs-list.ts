import { NarratedDemo } from '../src/demo-builder';

const BASE = 'http://127.0.0.1:8010';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: BASE,
    voice: 'Rachel',
    model: 'eleven_v3',
    sounds: false,
    output: './output/solrove-reserve-vs-list.mp4',
  });

  await demo.start();

  // --- 1. Homepage: the free option ---
  await demo.page.goto(`${BASE}/`);
  await demo.page.waitForTimeout(2000);

  const heroBox = demo.page.locator('.hero-reservation');
  await heroBox.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(800);

  await demo.narrate(
    "The homepage now leads with one clear free option: get launch updates. Just your email, no payment."
  );

  // --- 2. Homepage: the new secondary paid path ---
  const reserveLink = demo.page.locator('.hero-reserve-link');
  await reserveLink.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(800);

  await demo.narrate(
    "And right beneath it, the paid path is finally visible. Reserve your spot for one dollar, refundable, to lock in thirty to forty percent off and skip the line. Free versus paid is no longer a guessing game."
  );

  // --- 3. Reserve page: the VIP tier ---
  await demo.page.goto(`${BASE}/reserve/`);
  await demo.page.waitForTimeout(2000);

  const reserveHero = demo.page.locator('.reserve-hero');
  await reserveHero.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(800);

  await demo.narrate(
    "The reserve page is now unmistakably the V.I.P. tier. Limited V.I.P. spots, and the discount lives only here."
  );

  // --- 4. Reserve page: refundable deposit + escape hatch ---
  const altLink = demo.page.locator('.reserve-alt-link');
  await altLink.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(800);

  await demo.narrate(
    "The one dollar is a refundable deposit, not the purchase price. And if you're not ready, there's a clear link back to the free updates list."
  );

  // --- 5. Thank-you / upsell: the next rung ---
  await demo.page.goto(`${BASE}/thank-you/`);
  await demo.page.waitForTimeout(2000);

  const vipCard = demo.page.locator('.vip-hero-card');
  await vipCard.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(800);

  await demo.narrate(
    "After the free signup, the upsell is framed as the next step, not a surprise charge. You're on the free list. Want priority shipping and locked-in pricing? Reserve your spot for one dollar."
  );

  await demo.page.waitForTimeout(1000);

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
