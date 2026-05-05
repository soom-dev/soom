#!/usr/bin/env bun
import { copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cloudPublic = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');

const runtimeSrc = join(root, 'dist-runtime', 'runtime.js');
const runtimeDst = join(cloudPublic, 'runtime.js');

await copyFile(runtimeSrc, runtimeDst);
console.log(`Copied runtime bundle → cloud/public/assets/runtime.js`);
