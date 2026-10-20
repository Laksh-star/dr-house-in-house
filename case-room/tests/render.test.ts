import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const renderer = fileURLToPath(new URL('../scripts/render-replay.mjs', import.meta.url));

test('replay embedding escapes script terminators and preserves replacement metacharacters', () => {
  const dir = mkdtempSync(join(tmpdir(), 'case-render-'));
  try {
    const input = join(dir, 'run.json'), output = join(dir, 'out.html');
    writeFileSync(input, JSON.stringify({schemaVersion:'1.0', mode:'recorded-replay',runId:'synthetic-render-test',case:{title:'Synthetic fixture'},events:[{title:'</script><script>bad()</script> $& $`',summary:'line\u2028break'}],evidence:[]}));
    const r = spawnSync(process.execPath,[renderer,'--input',input,'--output',output],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);
    const html = readFileSync(output,'utf8');
    assert.ok(!html.includes('__CASE_ROOM_DATA__'));
    assert.ok(html.includes('\\u003c/script>'));
    assert.ok(html.includes(' $& $`'));
    assert.ok(html.includes('\\u2028'));
    assert.ok(!html.includes('</script><script>bad()'));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('replay renderer rejects unrecognized bundles and refuses to overwrite output', () => {
  const dir=mkdtempSync(join(tmpdir(),'case-render-'));
  try {
    const input=join(dir,'run.json'),output=join(dir,'out.html');
    writeFileSync(input,JSON.stringify({mode:'live'}));
    assert.notEqual(spawnSync(process.execPath,[renderer,'--input',input,'--output',output]).status,0);
    writeFileSync(input,JSON.stringify({schemaVersion:'1.0',mode:'recorded-replay',events:[],evidence:[]}));
    writeFileSync(output,'preserve this');
    assert.notEqual(spawnSync(process.execPath,[renderer,'--input',input,'--output',output]).status,0);
    assert.equal(readFileSync(output,'utf8'),'preserve this');
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
