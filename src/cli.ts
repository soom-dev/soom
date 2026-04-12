#!/usr/bin/env bun
import { Command } from 'commander';
import { renderCommand } from './commands/render.js';

const program = new Command();

program
  .name('soom')
  .description(
    'Breathe life into your diagrams. Turn Mermaid files into animated, interactive HTML.'
  )
  .version('0.1.0');

program
  .command('render')
  .description('Render a Mermaid diagram file to an interactive HTML file')
  .argument('<input>', 'input Mermaid file (.mmd or .mermaid)')
  .option('-o, --output <path>', 'output HTML file path')
  .option('-t, --theme <theme>', 'color theme (dark or light)', 'dark')
  .action(async (input: string, options: { output?: string; theme?: string }) => {
    try {
      await renderCommand(input, {
        output: options.output,
        theme: (options.theme as 'dark' | 'light') ?? 'dark',
      });
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
