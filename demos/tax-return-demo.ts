import { NarratedDemo } from '../src/demo-builder';
import { join } from 'path';

async function run() {
  // Serve from file:// protocol for local HTML
  const htmlPath = join(__dirname, 'tax-forms', 'index.html');
  const fileUrl = `file://${htmlPath}`;

  const demo = new NarratedDemo({
    baseUrl: fileUrl,
    voice: 'Elli',
    model: 'eleven_v3',
    output: './output/tax-return-demo.mp4',
    sounds: true,
  });

  await demo.start();

  // Introduction - product owner showing off the feature
  await demo.narrate(
    "[excited] Hey team! Let me walk you through the W-2 entry feature I finished this sprint."
  );
  await demo.page.waitForTimeout(500);

  // Step 1: W-2 Information
  await demo.narrate(
    "[thoughtful] So here's the W-2 form. Notice how the layout matches the actual IRS form - users will recognize it immediately."
  );

  // Fill employer information
  await demo.page.click('#employer-name');
  await demo.page.type('#employer-name', 'Acme Technology Corporation', { delay: 50 });

  await demo.narrate("[calm] The employer name field auto-capitalizes and trims whitespace.");

  await demo.page.click('#employer-ein');
  await demo.page.type('#employer-ein', '82-1234567', { delay: 80 });

  await demo.narrate(
    "[curious] Check out this E-I-N validation - it formats as you type."
  );

  // Fill wages
  await demo.page.click('#wages');
  await demo.page.type('#wages', '$87,500.00', { delay: 60 });

  await demo.narrate(
    "[thoughtful] Currency fields format automatically with dollar signs and commas."
  );

  await demo.page.click('#federal-withheld');
  await demo.page.type('#federal-withheld', '$12,847.00', { delay: 60 });

  // Fill Social Security
  await demo.page.click('#social-security-wages');
  await demo.page.type('#social-security-wages', '$87,500.00', { delay: 50 });

  await demo.page.click('#social-security-withheld');
  await demo.page.type('#social-security-withheld', '$5,425.00', { delay: 50 });

  // Fill Medicare
  await demo.page.click('#medicare-wages');
  await demo.page.type('#medicare-wages', '$87,500.00', { delay: 50 });

  await demo.page.click('#medicare-withheld');
  await demo.page.type('#medicare-withheld', '$1,268.75', { delay: 50 });

  // Select state
  await demo.narrate("[calm] State selection uses a standard dropdown.");
  const state = demo.page.locator('#state');
  await state.selectOption('CA');

  await demo.narrate("[excited] All fields are filled in, so we can continue to the next section.");

  // Navigate to Step 2
  await demo.page.click('button:has-text("Continue to 1099")');
  await demo.page.waitForTimeout(500);

  // Step 2: 1099 Income
  await demo.narrate(
    "[thoughtful] Here's the 1099 section. The form fields only appear when needed."
  );

  const has1099 = demo.page.locator('#has-1099');
  await has1099.selectOption('yes');
  await demo.page.waitForTimeout(300);

  await demo.narrate(
    "[excited] See how the form expands with a smooth transition?"
  );

  await demo.page.click('#payer-name');
  await demo.page.type('#payer-name', 'Freelance Consulting LLC', { delay: 50 });

  await demo.page.click('#income-1099-nec');
  await demo.page.type('#income-1099-nec', '$8,500.00', { delay: 60 });

  await demo.narrate(
    "[calm] The 1099-NEC field also formats currency. In the next sprint, I'll add support for multiple 1099s."
  );

  // Navigate to Step 3
  await demo.page.click('button:has-text("Continue to Deductions")');
  await demo.page.waitForTimeout(500);

  // Step 3: Deductions
  await demo.narrate(
    "[excited] This is the deductions page - probably my favorite feature. Watch this."
  );

  await demo.narrate(
    "[thoughtful] Standard deduction is pre-selected because it applies to most users. The itemized option is there for power users."
  );

  // Keep standard deduction (default)
  await demo.page.waitForTimeout(300);

  // Check some credits - demonstrate doWhileNarrating for concurrent action
  await demo.doWhileNarrating(
    "[curious] Now here's the cool part - tax credits with live calculation.",
    async () => {
      const educationCredit = demo.page.locator('#education-credit');
      await educationCredit.click();
    }
  );

  await demo.narrate(
    "[excited] When you check the education credit, it will update the estimated refund on the review page."
  );

  await demo.page.waitForTimeout(500);

  // Navigate to Step 4: Review
  await demo.page.click('button:has-text("Review My Return")');
  await demo.page.waitForTimeout(800);

  // Step 4: Review
  await demo.narrate(
    "[excited] And here's the summary view I built. Let me scroll down to show you everything."
  );

  // Scroll to show the refund (use ID selector to avoid matching success screen box)
  const refundBox = demo.page.locator('#refund-box');
  await refundBox.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(500);

  await demo.narrate(
    "[thoughtful] The refund calculation is the sum of all the computations. I added the green styling for positive refunds, red for amounts owed."
  );

  // Scroll through the summary
  const summaryIncome = demo.page.locator('.summary-section').first();
  await summaryIncome.scrollIntoViewIfNeeded();

  await demo.narrate(
    "[calm] The breakdown shows income, deductions, and credits separately. Users can see exactly where each number comes from."
  );

  await demo.page.waitForTimeout(500);

  await demo.narrate(
    "[curious] Notice the responsive design - this same layout works on mobile too. I'll demo that in the next review."
  );

  // File the return
  await demo.narrate("[excited] Let me show you the submission flow.");

  await demo.page.click('button:has-text("File My Return")');
  await demo.page.waitForTimeout(800);

  // Success screen - wait for confetti animation to be visible
  await demo.page.waitForTimeout(500);
  await demo.narrate(
    "[excited] Success! Check out the confetti animation celebrating the filed return. The confirmation number is generated server-side."
  );

  await demo.page.waitForTimeout(500);

  await demo.narrate(
    "[thoughtful] I added the expected timeline information here based on IRS processing guidelines."
  );

  await demo.narrate(
    "[calm] That's the full flow! Questions? I'm ready for code review whenever you are."
  );

  await demo.page.waitForTimeout(1000);

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch(console.error);
