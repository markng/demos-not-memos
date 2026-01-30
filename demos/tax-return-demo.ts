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

  // Welcome and introduction
  await demo.narrate(
    "[excited] Welcome to TaxoMatic! Let's file your 2024 federal tax return together."
  );
  await demo.page.waitForTimeout(500);

  // Step 1: W-2 Information
  await demo.narrate(
    "[thoughtful] First, let's enter your W-2 information from your employer."
  );

  // Fill employer information
  const employerName = demo.page.locator('#employer-name');
  await employerName.click();
  await employerName.type('Acme Technology Corporation', { delay: 50 });

  await demo.narrate("[calm] I'll enter Acme Technology as the employer.");

  const employerEin = demo.page.locator('#employer-ein');
  await employerEin.click();
  await employerEin.type('82-1234567', { delay: 80 });

  // Fill wages
  await demo.narrate(
    "[curious] Now for the important numbers. Your wages from Box 1..."
  );

  const wages = demo.page.locator('#wages');
  await wages.click();
  await wages.type('$87,500.00', { delay: 60 });

  const federalWithheld = demo.page.locator('#federal-withheld');
  await federalWithheld.click();
  await federalWithheld.type('$12,847.00', { delay: 60 });

  await demo.narrate(
    "[thoughtful] And you had nearly thirteen thousand dollars withheld in federal taxes."
  );

  // Fill Social Security
  const ssWages = demo.page.locator('#social-security-wages');
  await ssWages.click();
  await ssWages.type('$87,500.00', { delay: 50 });

  const ssWithheld = demo.page.locator('#social-security-withheld');
  await ssWithheld.click();
  await ssWithheld.type('$5,425.00', { delay: 50 });

  // Fill Medicare
  const medicareWages = demo.page.locator('#medicare-wages');
  await medicareWages.click();
  await medicareWages.type('$87,500.00', { delay: 50 });

  const medicareWithheld = demo.page.locator('#medicare-withheld');
  await medicareWithheld.click();
  await medicareWithheld.type('$1,268.75', { delay: 50 });

  // Select state
  await demo.narrate("[calm] Let me select your state...");
  const state = demo.page.locator('#state');
  await state.selectOption('CA');

  await demo.narrate("[excited] Great! Your W-2 is complete. Let's move on.");

  // Navigate to Step 2
  await demo.page.click('button:has-text("Continue to 1099")');
  await demo.page.waitForTimeout(500);

  // Step 2: 1099 Income
  await demo.narrate(
    "[curious] Now, did you have any 1099 income this year? Freelance work, perhaps?"
  );

  const has1099 = demo.page.locator('#has-1099');
  await has1099.selectOption('yes');
  await demo.page.waitForTimeout(300);

  await demo.narrate(
    "[thoughtful] Ah, I see you did some consulting on the side. Let's add that."
  );

  const payerName = demo.page.locator('#payer-name');
  await payerName.click();
  await payerName.type('Freelance Consulting LLC', { delay: 50 });

  const income1099NEC = demo.page.locator('#income-1099-nec');
  await income1099NEC.click();
  await income1099NEC.type('$8,500.00', { delay: 60 });

  await demo.narrate(
    "[calm] Eighty-five hundred in freelance income. Don't forget, you'll owe self-employment tax on this."
  );

  // Navigate to Step 3
  await demo.page.click('button:has-text("Continue to Deductions")');
  await demo.page.waitForTimeout(500);

  // Step 3: Deductions
  await demo.narrate(
    "[excited] Now for my favorite part - deductions! Let's maximize your refund."
  );

  await demo.narrate(
    "[thoughtful] For most people, the standard deduction of fourteen thousand six hundred dollars is the best choice."
  );

  // Keep standard deduction (default)
  await demo.page.waitForTimeout(300);

  // Check some credits
  await demo.narrate("[curious] Do you qualify for any tax credits?");

  const educationCredit = demo.page.locator('#education-credit');
  await educationCredit.click();

  await demo.narrate(
    "[excited] The education credit! Were you taking classes this year? That could be worth up to twenty-five hundred dollars."
  );

  await demo.page.waitForTimeout(500);

  // Navigate to Step 4: Review
  await demo.page.click('button:has-text("Review My Return")');
  await demo.page.waitForTimeout(800);

  // Step 4: Review
  await demo.narrate(
    "[excited] Alright, let's see how you did this year!"
  );

  // Scroll to show the refund (use ID selector to avoid matching success screen box)
  const refundBox = demo.page.locator('#refund-box');
  await refundBox.scrollIntoViewIfNeeded();
  await demo.page.waitForTimeout(500);

  await demo.narrate(
    "[excited] Great news! Based on your entries, you're getting a refund of over three thousand dollars!"
  );

  // Scroll through the summary
  const summaryIncome = demo.page.locator('.summary-section').first();
  await summaryIncome.scrollIntoViewIfNeeded();

  await demo.narrate(
    "[thoughtful] Let's review the breakdown. Your total income was ninety-six thousand dollars, including your W-2 and freelance work."
  );

  await demo.page.waitForTimeout(500);

  await demo.narrate(
    "[calm] After subtracting your standard deduction and applying the education credit, you're getting money back!"
  );

  // File the return
  await demo.narrate("[excited] Ready to file? Let's submit your return!");

  await demo.page.click('button:has-text("File My Return")');
  await demo.page.waitForTimeout(800);

  // Success screen
  await demo.narrate(
    "[excited] Congratulations! Your 2024 tax return has been successfully filed!"
  );

  await demo.page.waitForTimeout(500);

  await demo.narrate(
    "[calm] You should receive your refund via direct deposit within fourteen to twenty-one days."
  );

  await demo.narrate(
    "[excited] Thank you for using TaxoMatic! Have a wonderful day!"
  );

  await demo.page.waitForTimeout(1000);

  const outputPath = await demo.finish();
  console.log(`Demo saved to: ${outputPath}`);
}

run().catch(console.error);
