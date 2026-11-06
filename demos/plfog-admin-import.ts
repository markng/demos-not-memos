import { NarratedDemo } from '../src/demo-builder';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: 'http://localhost:8099',
    voice: 'Rachel',
    model: 'eleven_v3',
    sounds: true,
    output: './output/plfog-admin-import.mp4',
  });

  await demo.start();

  // Log in to Django admin
  await demo.page.goto('http://localhost:8099/admin/login/');
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    "We've just imported the Past Lives Makerspace occupancy grid from a 177-row Airtable CSV into our Django admin."
  );

  await demo.page.type('#id_username', 'admin');
  await demo.page.type('#id_password', 'admin');
  await demo.page.click('[type="submit"]');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    'Let me walk you through what was imported.'
  );

  // Navigate to Members
  await demo.page.goto('http://localhost:8099/admin/membership/member/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    '82 members were deduplicated from the CSV. Names were cleaned — Airtable record suffixes stripped, aliases merged.'
  );

  await demo.page.waitForTimeout(1500);

  // Pause to show member list
  await demo.page.waitForTimeout(2000);

  // Navigate to Guilds
  await demo.page.goto('http://localhost:8099/admin/membership/guild/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "8 guilds are now first-class entities. Glass, Textiles, Tech, Art Framing, Ceramics, and more. Each guild can hold leases directly — they're tenants just like members."
  );

  await demo.page.waitForTimeout(1500);

  // Click into Glass Guild to show detail
  await demo.page.locator('a:has-text("Glass Guild")').click();
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "The Glass Guild has two leases — spaces A2b and A52 — shown inline right here."
  );

  await demo.page.waitForTimeout(2000);

  // Navigate to Spaces
  await demo.page.goto('http://localhost:8099/admin/membership/space/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "177 spaces imported — studios, storage units, parking spots. Each has square footage, pricing, and rentability status."
  );

  // Pause to show spaces
  await demo.page.waitForTimeout(2000);

  // Navigate to Leases
  await demo.page.goto('http://localhost:8099/admin/membership/lease/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "119 active leases connect tenants to spaces. The tenant column works for both members and guilds through a generic foreign key."
  );

  await demo.page.waitForTimeout(1500);

  // Pause to show leases
  await demo.page.waitForTimeout(2000);

  // Click into a specific lease for detail
  await demo.page.goto('http://localhost:8099/admin/membership/space/?q=A1');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "Let's look at space A1. Kate Reed's studio — 68 square feet at 3.75 per square foot."
  );

  await demo.page.locator('a:has-text("A1")').first().click();
  await demo.page.waitForTimeout(2000);

  // Pause to show space detail
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "Her lease shows inline — 240 dollars a month, active, with the deposit tracked."
  );

  await demo.page.waitForTimeout(2000);

  // Back to dashboard
  await demo.page.goto('http://localhost:8099/admin/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate(
    "The entire Airtable export is now in Django — 82 members, 8 guilds, 177 spaces, 119 leases. All backed by 429 tests at 100% coverage."
  );

  await demo.page.waitForTimeout(2000);

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch(console.error);
