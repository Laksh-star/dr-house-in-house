#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function option(name) { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }
const input = option('--input'), output = option('--output');
if (!input || !output) {
  console.error('Usage: node scripts/render-replay.mjs --input run.json --output replay.html [--actor "Recorded actor label"]');
  process.exit(1);
}
const run = JSON.parse(fs.readFileSync(input, 'utf8'));
if (run.schemaVersion !== '1.0' || run.mode !== 'recorded-replay' || !Array.isArray(run.events) || !Array.isArray(run.evidence)) {
  throw new Error('Unsupported replay bundle; expected a real version 1.0 recorded-replay export.');
}
if (option('--actor')) {
  run.provenance = { ...(run.provenance || {}), actorLabel: option('--actor'), attribution: 'Operator-supplied label; not independently attested by the workflow engine.' };
}
const templatePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../replay/replay-template.html');
const template = fs.readFileSync(templatePath, 'utf8');
const token = '__CASE_ROOM_DATA__';
if (template.split(token).length !== 2) throw new Error('Template must contain exactly one data marker.');
const json = JSON.stringify(run).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const html = template.replace(token, () => json);
fs.writeFileSync(output, html, { flag: 'wx' });
console.log(JSON.stringify({ output: path.resolve(output), runId: run.runId, events: run.events.length, bytes: Buffer.byteLength(html), mode: run.mode }));
