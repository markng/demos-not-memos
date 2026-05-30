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
  .option(
    '--ignore-https-errors',
    'Skip HTTPS/TLS certificate validation (e.g. for self-signed dev/staging certs)'
  )
  .action((options: { script: string; ignoreHttpsErrors?: boolean }) => {
    const scriptPath = resolve(options.script);

    console.log(`Running demo script: ${scriptPath}`);

    const child = spawn('npx', ['ts-node', scriptPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(options.ignoreHttpsErrors
          ? { DEMOS_IGNORE_HTTPS_ERRORS: '1' }
          : {}),
      },
    });

    child.on('close', (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();
