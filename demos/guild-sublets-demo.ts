import { NarratedDemo } from '../src/demo-builder';

const BASE = 'http://localhost:8000';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: BASE,
    voice: 'Rachel',
    model: 'eleven_v3',
    sounds: true,
    output: './output/guild-sublets-demo.mp4',
  });

  await demo.start();

  // Log in to Django admin (Unfold theme)
  await demo.page.goto(`${BASE}/admin/login/`);
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    "Let's take a look at the new Guild Sublets feature in Past Lives."
  );

  await demo.page.type('#id_username', 'admin');
  await demo.page.type('#id_password', 'admin');
  await demo.page.click('button[type="submit"]');
  await demo.page.waitForTimeout(2000);

  // --- Guild List ---
  await demo.page.goto(`${BASE}/admin/membership/guild/`);
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "Each guild now shows how many spaces it sublets. The Tech Guild has 4 spaces, for example, and Glass and Textiles each have 2."
  );

  await demo.page.waitForTimeout(2000);

  // --- Guild Detail with SubletInline ---
  await demo.page.locator('a:has-text("Tech Guild")').first().click();
  await demo.page.waitForTimeout(2000);

  // Scroll down to show SubletInline (Spaces inline section)
  // Unfold renders inlines in stacked groups - look for the inline header
  await demo.page.locator('.inline-related, [id*="sublet"]').first().scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1500);

  await demo.narrate(
    "Inside the guild, we can see exactly which spaces are sublet — their ID, name, type, and price. This is read-only since sublet assignments are managed at the space level."
  );

  await demo.page.waitForTimeout(1500);

  await demo.narrate(
    "The Tech Guild sublets four studio spaces — A14a, A14b, A15, and A16."
  );

  await demo.page.waitForTimeout(2000);

  // --- Space List ---
  await demo.page.goto(`${BASE}/admin/membership/space/`);
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "On the space side, each space now shows which guild — if any — it's sublet by."
  );

  await demo.page.waitForTimeout(2000);

  // --- Space Filter ---
  // Unfold hides filters behind a "Filters" button (visible on <2xl screens)
  // On 2xl+ screens the filter sidebar is always visible.
  // Click the Filters button if present, then select the guild filter.
  const filtersBtn = demo.page.locator('a:has-text("Filters")');
  if (await filtersBtn.isVisible()) {
    await filtersBtn.click();
    await demo.page.waitForTimeout(500);
  }

  // Click "Glass Guild" in the sublet_guild filter
  await demo.page.locator('#changelist-filter a:has-text("Glass Guild")').click();
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "We can filter spaces by their sublet guild to quickly see all spaces belonging to a specific guild. Here we see the two spaces sublet by the Glass Guild."
  );

  await demo.page.waitForTimeout(2000);

  // --- Closing ---
  await demo.page.goto(`${BASE}/admin/`);
  await demo.page.waitForTimeout(1500);

  await demo.narrate(
    "Guild sublets give us a clean way to track which spaces belong to which guilds, separate from the lease relationship."
  );

  await demo.page.waitForTimeout(1500);

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch(console.error);
