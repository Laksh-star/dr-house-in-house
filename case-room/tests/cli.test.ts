import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { evaluate,Repository } from '../src/repository.js';
import { decisionSchema } from '../src/schema.js';

const root=fileURLToPath(new URL('../',import.meta.url));
// All decisions here are SYNTHETIC AUTOMATED TEST FIXTURES, never live assistant decisions.
function fixture(version:number,target='room-timeline',patch:Record<string,unknown>={}) {
  return {decisionVersion:version,idempotencyKey:`synthetic-test-${version}`,action:'inspect',targetEvidenceId:target,hypothesis:'air',evidenceIds:['opening'],rationale:'SYNTHETIC TEST FIXTURE: inspect a predefined archive record.',...patch};
}
function harness() {
  const dir=mkdtempSync(join(tmpdir(),'case-room-test-')); const db=join(dir,'case.db'); let n=0;
  const env:NodeJS.ProcessEnv={...process.env,CASE_ROOM_DB:db};
  // Clear credentials: tests do not require any model API keys or remote model provider.
  for(const key of Object.keys(env)) if(/(API_KEY|ANTHROPIC|OPENAI|GOOGLE_API|AZURE_OPENAI)/.test(key)) delete env[key as keyof typeof env];
  function cli(args:string[],expected=0) {
    const result=spawnSync(process.execPath,['--require',join(root,'tests/no-http.cjs'),'--import','tsx',join(root,'src/cli.ts'),...args],{cwd:root,env,encoding:'utf8',timeout:45000});
    assert.equal(result.status,expected,`CLI ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
    const lines=(expected===0?result.stdout:result.stderr).trim().split('\n').filter(line=>line.startsWith('{'));
    return JSON.parse(lines.at(-1)!);
  }
  function resume(run:string,value:unknown,expected=0) {const path=join(dir,`synthetic-decision-${++n}.json`);writeFileSync(path,JSON.stringify(value));return cli(['resume','--run',run,'--decision',path],expected);}
  function bundle(run:string) {const path=join(dir,`export-${++n}.json`);cli(['export','--run',run,'--out',path]);return JSON.parse(readFileSync(path,'utf8'));}
  return {dir,db,cli,resume,bundle,cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}

test('fresh-process start, suspend, resume, duplicate receipts, persisted completion and public export',()=>{
  const h=harness();try {
    const started=h.cli(['start','--case','night-shift','--run-id','restart-test']);
    assert.equal(started.status,'suspended');assert.deepEqual(started.pending.stepPath,['decision-1']);
    assert.equal(started.pending.decisionVersion,1);
    assert.equal(started.pending.requiredSchema.additionalProperties,false);
    assert.equal(JSON.stringify(started).includes('stuck'),false);
    const partial=h.bundle('restart-test');assert.equal(partial.resolution,undefined);assert.deepEqual(partial.evidence.map((e:{id:string})=>e.id),['opening']);
    assert.equal(JSON.stringify(partial).includes('failed exhaust'),false);
    const d1=fixture(1);const receipt=h.resume('restart-test',d1);
    assert.equal(receipt.receipt.revealedEvidenceId,'room-timeline');
    const after=h.cli(['pending','--run','restart-test']);
    assert.equal(after.pending.decisionVersion,2);assert.deepEqual(after.pending.stepPath,['decision-2']);
    assert.ok(after.pending.allowedEvidenceIds.includes('facilities-log'));
    const beforeDuplicate=h.bundle('restart-test');
    assert.deepEqual(h.resume('restart-test',d1),receipt);
    assert.deepEqual(h.bundle('restart-test').events,beforeDuplicate.events);
    assert.equal(h.resume('restart-test',{...d1,rationale:'different synthetic fixture'},1).error.code,'IDEMPOTENCY_CONFLICT');
    h.resume('restart-test',fixture(2,'facilities-log'));
    const d3=fixture(3,'unused',{action:'resolve',targetEvidenceId:undefined,evidenceIds:['room-timeline','facilities-log'],rationale:'SYNTHETIC TEST FIXTURE: air hypothesis from the timeline and service log.'});
    const last=h.resume('restart-test',d3);
    const status=h.cli(['status','--run','restart-test']);assert.equal(status.status,'success');assert.equal(status.caseStatus,'resolved');assert.equal(status.finalized,true);
    assert.deepEqual(status.protocolChecks.references,{runId:'restart-test',valid:true});
    assert.deepEqual(status.protocolChecks.budget,{runId:'restart-test',valid:true});
    assert.deepEqual(status.terminalTransition.resolved,{runId:'restart-test'});assert.equal(status.terminalTransition.exhausted,null);
    assert.deepEqual(h.resume('restart-test',d3),last);
    assert.equal(h.cli(['pending','--run','restart-test']).pending,null);
    const output=h.bundle('restart-test');assert.equal(output.schemaVersion,'1.0');assert.equal(output.mode,'recorded-replay');assert.equal(output.status,'resolved');
    assert.ok(output.resolution.summary.includes('faulty archive heating system'));
    assert.equal(output.receipts.modelApiCalls,0);assert.equal(output.receipts.mockTranscript,false);
    assert.equal(output.receipts.evaluation.acceptedDecisions,3);assert.equal(output.receipts.evaluation.invalidEvidenceReferences,0);
    assert.equal(output.evidence.some((e:{id:string})=>e.id==='maintenance-report'),false);
    assert.deepEqual(output.events.map((e:{seq:number})=>e.seq),output.events.map((_:unknown,i:number)=>i+1));
    assert.ok(output.events.every((e:{evidenceIds:string[]})=>e.evidenceIds.every(id=>output.evidence.some((v:{id:string})=>v.id===id))));
    const db=new DatabaseSync(h.db);const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>String(r.name));
    assert.ok(tables.some(name=>name.includes('workflow')&&name.includes('snapshot')),`Actual Mastra snapshot table exists: ${tables}`);db.close();
  } finally {h.cleanup();}
});

test('invalid citations, locked/repeated inspections, stale versions, premature resolve, strict malformed input remain suspended',()=>{
  const h=harness();try {
    h.cli(['start','--case','night-shift','--run-id','invalid-test']);
    const bad:[unknown,string][]=[
      [fixture(1,'room-timeline',{evidenceIds:['invented']}),'UNKNOWN_EVIDENCE'],
      [fixture(1,'room-timeline',{evidenceIds:['meal-log']}),'UNREVEALED_EVIDENCE'],
      [fixture(2),'STALE_VERSION'],
      [fixture(1,'maintenance-report'),'INSPECT_NOT_ALLOWED'],
      [fixture(1,'opening'),'INSPECT_NOT_ALLOWED'],
      [fixture(1,'invented'),'UNKNOWN_EVIDENCE'],
      [fixture(1,'unused',{action:'resolve',targetEvidenceId:undefined}),'PREMATURE_RESOLVE'],
      [fixture(1,'room-timeline',{extra:'not allowed'}),'SCHEMA_INVALID'],
      [fixture(1,'room-timeline',{perspectives:[{role:'skeptic',position:'question the meal',hidden:true}]}),'SCHEMA_INVALID'],
      [fixture(1,'room-timeline',{approved:false}),'SCHEMA_INVALID'],
      [fixture(1,'room-timeline',{action:false}),'SCHEMA_INVALID'],
      [fixture(1,'room-timeline',{decisionVersion:1.5}),'SCHEMA_INVALID'],
      [fixture(1,'room-timeline',{targetEvidenceId:undefined}),'SCHEMA_INVALID'],
      [fixture(1,'room-timeline',{evidenceIds:['opening','opening']}),'SCHEMA_INVALID'],
    ];
    for(const [decision,code] of bad) assert.equal(h.resume('invalid-test',decision,1).error.code,code);
    const path=join(h.dir,'malformed.json');writeFileSync(path,'{bad JSON');
    assert.equal(h.cli(['resume','--run','invalid-test','--decision',path],1).error.code,'MALFORMED_JSON');
    const current=h.cli(['status','--run','invalid-test']);assert.equal(current.status,'suspended');assert.equal(current.decisionVersion,1);assert.equal(current.acceptedDecisions,0);
    h.resume('invalid-test',fixture(1));
    assert.equal(h.resume('invalid-test',fixture(2,'room-timeline'),1).error.code,'INSPECT_NOT_ALLOWED');
  }finally{h.cleanup();}
});

test('five-decision hard bound chooses exhausted branch; completed export withholds hidden truth',()=>{
  const h=harness();try {
    h.cli(['start','--case','night-shift','--run-id','budget-test']);
    const targets=['room-timeline','shift-log','meal-log','day-shift-log','facilities-log'];
    targets.forEach((id,i)=>h.resume('budget-test',fixture(i+1,id)));
    const status=h.cli(['status','--run','budget-test']);assert.equal(status.status,'success');assert.equal(status.caseStatus,'exhausted');assert.equal(status.acceptedDecisions,5);
    assert.deepEqual(status.terminalTransition.exhausted,{runId:'budget-test'});assert.equal(status.terminalTransition.resolved,null);
    assert.equal(h.cli(['pending','--run','budget-test']).pending,null);
    assert.equal(h.resume('budget-test',fixture(6,'maintenance-report'),1).error.code,'RUN_CLOSED');
    const out=h.bundle('budget-test');assert.equal(out.resolution,undefined);assert.equal(out.status,'exhausted');
    assert.equal(out.receipts.evaluation.remainingDecisions,0);assert.equal(out.receipts.evaluation.budgetWithinBound,true);
    assert.ok(out.events.some((e:{type:string})=>e.type==='budget_exhausted'));assert.equal(out.events.some((e:{type:string})=>e.type==='resolution'),false);
  }finally{h.cleanup();}
});

test('restart of the same suspended execute is idempotent after ledger commit / snapshot gap',()=>{
  const h=harness();try{
    h.cli(['start','--case','night-shift','--run-id','gap-test']);
    const decision=decisionSchema.parse(fixture(1));
    // Simulate process death after execute() committed application side effects, before snapshot advancement.
    // The untouched real Mastra snapshot is still suspended at decision-1.
    const repo=new Repository(h.db);const receipt=repo.apply('gap-test',decision);repo.close();
    assert.deepEqual(h.resume('gap-test',decision),{receipt});
    const status=h.cli(['status','--run','gap-test']);assert.deepEqual(status.stepPath,['decision-2']);assert.equal(status.acceptedDecisions,1);
    const out=h.bundle('gap-test');assert.equal(out.events.filter((e:{type:string})=>e.type==='evidence_revealed').length,1);
  }finally{h.cleanup();}
});

test('snapshot/ledger gap blocks pending and new decisions before resume; exact original retry still heals',()=>{
  const h=harness();try{
    const runId='guarded-gap-test';
    h.cli(['start','--case','night-shift','--run-id',runId]);
    const decision=decisionSchema.parse(fixture(1));
    // Commit only the ledger: the real Mastra snapshot stays suspended at decision-1.
    const repo=new Repository(h.db);const receipt=repo.apply(runId,decision);repo.close();
    function persisted() {
      const db=new DatabaseSync(h.db);
      try {
        const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>String(r.name)).filter(name=>name.includes('workflow')&&name.includes('snapshot'));
        assert.ok(tables.length>0,'Inspect actual persisted Mastra snapshots, not a mock');
        return {ledger:db.prepare('SELECT payload FROM case_room_runs WHERE run_id=?').get(runId),snapshots:tables.map(name=>db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all())};
      }finally{db.close();}
    }
    const before=persisted();
    const pending=h.cli(['pending','--run',runId],1);
    assert.equal(pending.error.code,'RECOVERY_REQUIRED');
    assert.match(pending.error.message,/exact original decision/i);
    assert.equal(pending.pending,undefined);
    assert.deepEqual(persisted(),before,'Reading pending must not change ledger or snapshots');
    // Before this fix pending advertised version 2 alongside decision-1. This is otherwise valid.
    assert.equal(h.resume(runId,fixture(2,'facilities-log'),1).error.code,'RECOVERY_REQUIRED');
    assert.deepEqual(persisted(),before,'Reject before Mastra resume can poison the suspended snapshot');
    const suspended=h.cli(['status','--run',runId]);
    assert.equal(suspended.status,'suspended');assert.deepEqual(suspended.stepPath,['decision-1']);
    assert.equal(suspended.decisionVersion,2);assert.equal(suspended.acceptedDecisions,1);
    assert.deepEqual(h.resume(runId,decision),{receipt});
    const healed=h.cli(['pending','--run',runId]);
    assert.equal(healed.status,'suspended');assert.deepEqual(healed.pending.stepPath,['decision-2']);assert.equal(healed.pending.decisionVersion,2);
    assert.deepEqual(persisted().ledger,before.ledger,'Recovery must not duplicate ledger effects');
    h.resume(runId,fixture(2,'facilities-log'));
    assert.equal(h.cli(['status','--run',runId]).acceptedDecisions,2);
  }finally{h.cleanup();}
});

test('pure evaluation reports protocol stats, not a clinical or model score',()=>{
  const result=evaluate({decisions:[decisionSchema.parse(fixture(1))],revealed:['opening','room-timeline']});
  assert.equal(result.kind,'custom-app-assertions');assert.equal(result.schemaValidDecisions,1);assert.equal(result.invalidEvidenceReferences,0);assert.equal(result.modelApiCalls,0);
});
