import { NarratedDemo } from '../src/demo-builder';

async function run() {
  const demo = new NarratedDemo({
    baseUrl: 'http://localhost:8001',
    voice: 'Rachel',
    model: 'eleven_v3',
    sounds: false,
    output: './output/roaming-panda-legal-pages.mp4',
  });

  await demo.start();

  // Navigate directly to the privacy policy page
  await demo.page.goto('http://localhost:8001/privacy/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate("Here's the privacy policy page with the updated styling.");

  // Show the hero section and last-updated date
  const privacyHero = demo.page.locator('section.page-hero');
  await privacyHero.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1500);

  // Scroll to the first legal-section to show the warm background and border styling
  const introSection = demo.page.locator('.legal-section').first();
  await introSection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    'Each section sits on a warm background with subtle borders that highlight on hover.'
  );

  // Scroll to section 2 "Information We Collect" to show the custom bullet styling
  const infoSection = demo.page.locator('.legal-section').nth(1);
  await infoSection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    'The privacy list items use custom amber accent bullets instead of default browser styling.'
  );

  // Scroll through the middle sections
  const smsSection = demo.page.locator('.legal-section').nth(3);
  await smsSection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1500);

  // Scroll to the data security section
  const securitySection = demo.page.locator('.legal-section').nth(5);
  await securitySection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1500);

  // Scroll to the contact section at the bottom
  const contactSection = demo.page.locator('ul.privacy-list.contact-info');
  await contactSection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    'Contact links use the amber accent color, matching the site brand.'
  );

  await demo.page.waitForTimeout(500);

  // Navigate to the terms of service page
  await demo.page.goto('http://localhost:8001/terms/');
  await demo.page.waitForTimeout(2000);

  await demo.narrate("And the terms of service, using the same legal-content styling.");

  // Show the hero
  const termsHero = demo.page.locator('section.page-hero');
  await termsHero.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1500);

  // Scroll to the SMS section which has h4 sub-headings
  const smsProgramSection = demo.page.locator('.legal-section').nth(2);
  await smsProgramSection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    'The SMS terms section uses sub-headings styled with the display font, keeping a clear hierarchy.'
  );

  // Scroll through payment terms
  const paymentSection = demo.page.locator('.legal-section').nth(4);
  await paymentSection.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1500);

  // Scroll to the contact section at the bottom
  const termsContact = demo.page.locator('ul.contact-list');
  await termsContact.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(1000);

  await demo.narrate(
    "Both pages use the site's CSS variables for brand consistency."
  );

  await demo.page.waitForTimeout(1000);

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch(console.error);
