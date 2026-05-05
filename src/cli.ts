#!/usr/bin/env bun
import { Command } from 'commander';
import { renderCommand } from './pipeline.js';
import { readPrefs, writePrefs } from './telemetry/prefs.js';

const program = new Command();

program
  .name('soom')
  .description(
    'Breathe life into your diagrams. Turn Mermaid files into animated, interactive HTML.'
  )
  .version('0.1.0', '-v, --version');

program
  .command('render')
  .description('Render a Mermaid diagram file to an interactive HTML file')
  .argument('<input>', 'input Mermaid file (.mmd or .mermaid)')
  .option('-o, --output <path>', 'output HTML file path')
  .option('-t, --theme <theme>', 'color theme (dark or light)', 'dark')
  .option('-O, --open', 'open the output file in the default browser', false)
  .action(async (input: string, options: { output?: string; theme?: string; open?: boolean }) => {
    try {
      await renderCommand(input, {
        output: options.output,
        theme: (options.theme as 'dark' | 'light') ?? 'dark',
        open: options.open,
      });
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

const telemetry = program.command('telemetry').description('Manage telemetry preferences');

telemetry
  .command('status')
  .description('Show current telemetry opt-in status')
  .action(async () => {
    const prefs = await readPrefs();
    if (prefs === null) {
      console.log('Telemetry: undecided (run `soom render` to see the first-run notice)');
    } else {
      console.log(`Telemetry: ${prefs.enabled ? 'enabled' : 'disabled'}`);
    }
  });

telemetry
  .command('enable')
  .description('Opt in to anonymous usage telemetry')
  .action(async () => {
    await writePrefs({ enabled: true });
    console.log('Telemetry enabled. Thank you for helping improve Hansoom.');
  });

telemetry
  .command('disable')
  .description('Opt out of anonymous usage telemetry')
  .action(async () => {
    await writePrefs({ enabled: false });
    console.log('Telemetry disabled. No data will be sent.');
  });

program.parse();
