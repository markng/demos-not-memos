#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'child_process';
import { resolve } from 'path';

const program = new Command();

program
  .name('demos-not-memos')
  .description('TypeScript DSL for narrated demo videos')
  .version('0.1.0');

program
  .command('narrate')
  .description('Run a demo script to generate a narrated video')
  .requiredOption('--script <path>', 'Path to the demo script (.ts file)')
  .action((options: { script: string }) => {
    const scriptPath = resolve(options.script);

    // eslint-disable-next-line no-console
    console.log(`Running demo script: ${scriptPath}`);

    const child = spawn('npx', ['ts-node', scriptPath], {
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();
