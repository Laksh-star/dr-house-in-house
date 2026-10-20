import { readFileSync,writeFileSync,mkdirSync,openSync,closeSync,unlinkSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createWorkflowStateReader } from '@mastra/core/workflows';
import { Repository } from './repository.js';
import { buildEngine } from './workflow.js';
import { decisionSchema, DecisionError } from './schema.js';

const home=fileURLToPath(new URL('../',import.meta.url));
const dbPath=resolve(process.env.CASE_ROOM_DB || resolve(home,'.state/case-room.db'));
function args() {
  const [command,...rest]=process.argv.slice(2); const values:Record<string,string>={};
  for(let i=0;i<rest.length;i+=2) {
    if(!rest[i]?.startsWith('--')||!rest[i+1]||rest[i+1].startsWith('--')||Object.hasOwn(values,rest[i].slice(2))) throw new DecisionError('CLI_ARGUMENTS','Use named --flag value pairs without duplicates');
    values[rest[i].slice(2)]=rest[i+1];
  }
  const allowed:Record<string,string[]>={start:['case','run-id'],pending:['run'],status:['run'],resume:['run','decision'],export:['run','out']};
  if(!command||!allowed[command]||Object.keys(values).some(k=>!allowed[command].includes(k))) throw new DecisionError('CLI_ARGUMENTS','Commands: start --case night-shift [--run-id ID]; pending/status --run ID; resume --run ID --decision path.json; export --run ID --out path.json');
  return {command,values};
}
function lock() {
  // Local process serialization prevents two CLI invocations racing the Mastra snapshot.
  mkdirSync(dirname(dbPath),{recursive:true}); const path=dbPath+'.lock';
  try { const fd=openSync(path,'wx');writeFileSync(fd,String(process.pid));closeSync(fd); }
  catch {throw new DecisionError('DB_LOCKED',`Another command holds ${path}. If it crashed, verify its PID is not running before removing that lock.`);}
  return ()=>unlinkSync(path);
}
async function main() {
  const {command,values}=args();
  if(command==='start'&&values.case!=='night-shift') throw new DecisionError('UNKNOWN_CASE','Only night-shift exists');
  const runId=command==='start'?(values['run-id']||randomUUID()):values.run;
  if(!runId || !/^[a-zA-Z0-9_-]{1,100}$/.test(runId)) throw new DecisionError('RUN_ID','A run ID of 1–100 letters, digits, hyphens or underscores is required');
  if(command==='resume'&&!values.decision || command==='export'&&!values.out) throw new DecisionError('CLI_ARGUMENTS','Missing decision or out path');
  const release=lock(); const repo=new Repository(dbPath); const engine=buildEngine(dbPath,repo);
  try {
    await engine.storage.init();
    const view=async()=> {
      const state=await engine.workflow.getWorkflowRunById(runId);
      if(!state) throw new DecisionError('WORKFLOW_NOT_FOUND','No persisted Mastra workflow snapshot for this run');
      const reader=createWorkflowStateReader(state); const paused=reader.getSuspendedStep();
      return {status:reader.getStatus(),stepPath:paused?.path,reader};
    };
    if(command==='start') {
      repo.create(runId);
      const run=await engine.workflow.createRun({runId});
      const result=await run.start({inputData:{runId}});
      if(result.status==='failed') throw result.error;
      const v=await view();
      return {runId,status:v.status,pending:v.stepPath?repo.pending(runId,v.stepPath):null};
    }
    const record=repo.get(runId);
    if(command==='status') { const v=await view();return {runId,status:v.status,caseStatus:record.status,decisionVersion:record.version,acceptedDecisions:record.decisions.length,revealedEvidenceIds:record.revealed,stepPath:v.stepPath??null,finalized:record.finalized,protocolChecks:{references:v.reader.getStepOutput('reference-check')??null,budget:v.reader.getStepOutput('budget-check')??null},terminalTransition:{resolved:v.reader.getStepOutput('resolved')??null,exhausted:v.reader.getStepOutput('exhausted')??null}}; }
    if(command==='pending') {const v=await view();return {runId,status:v.status,pending:v.stepPath?repo.pending(runId,v.stepPath):null};}
    if(command==='export') {
      const v=await view(); const bundle=repo.bundle(runId,v.status);
      writeFileSync(resolve(values.out),JSON.stringify(bundle,null,2)+'\n');return {runId,out:resolve(values.out),status:bundle.status,events:bundle.events.length};
    }
    let raw:unknown;
    try {raw=JSON.parse(readFileSync(resolve(values.decision),'utf8'));}catch {throw new DecisionError('MALFORMED_JSON','Decision file must contain valid JSON');}
    const parsed=decisionSchema.safeParse(raw);
    if(!parsed.success) throw new DecisionError('SCHEMA_INVALID',parsed.error.message);
    const decision=parsed.data;
    const old=repo.validate(record,decision); // Reject before touching the durable workflow snapshot.
    const v=await view();
    if(old) {
      // A process can die after the ledger transaction but before Mastra persists its next snapshot.
      // If the old step is still suspended, re-execute it; apply() returns the original receipt.
      if(v.stepPath?.at(-1)===`decision-${decision.decisionVersion}`) {
        const run=await engine.workflow.createRun({runId});
        const result=await run.resume({step:v.stepPath,resumeData:decision});
        if(result.status==='failed') throw result.error;
      }
      return {receipt:old};
    }
    if(v.status!=='suspended'||!v.stepPath) throw new DecisionError('NOT_SUSPENDED','Run is not suspended awaiting an external decision');
    // Keep exact duplicate recovery above this guard; block new decisions before Mastra can mutate its snapshot.
    repo.assertPendingVersion(record,v.stepPath);
    const run=await engine.workflow.createRun({runId});
    const result=await run.resume({step:v.stepPath,resumeData:decision});
    if(result.status==='failed') throw result.error;
    return {receipt:repo.duplicate(repo.get(runId),decision)};
  } finally {await engine.storage.close();repo.close();release();}
}
main().then(value=>{process.stdout.write(JSON.stringify(value)+'\n');}).catch(error=>{
  process.stderr.write(JSON.stringify({error:{code:error instanceof DecisionError?error.code:'INTERNAL_ERROR',message:error instanceof Error?error.message:String(error)}})+'\n');process.exitCode=1;
});
