import { DatabaseSync } from 'node:sqlite';
import { caseInfo, evidence, availableEvidence, MAX_DECISIONS, resolution } from './case.js';
import { canonical, decisionSchema, DecisionError, requiredDecisionSchema, type Decision } from './schema.js';

export type CaseEvent = {id:string; seq:number; type:string; at:string; title:string; summary:string; evidenceIds:string[]; data:Record<string,unknown>};
export type Receipt = {runId:string; idempotencyKey:string; decisionVersion:number; action:string; accepted:true; at:string; eventId:string; revealedEvidenceId?:string};
export type RecordState = {runId:string; version:number; status:'investigating'|'resolved'|'exhausted'; revealed:string[]; events:CaseEvent[]; decisions:Decision[]; receipts:Record<string,{canonical:string;receipt:Receipt}>; evaluation?:ReturnType<typeof evaluate>; resolution?:typeof resolution; finalized:boolean};
export function evaluate(s: Pick<RecordState,'decisions'|'revealed'>) {
  // Custom deterministic app assertions, not a Mastra scorer and not clinical scoring.
  const references = s.decisions.flatMap(d => d.evidenceIds);
  const seen=new Set(['opening']); let invalidReferences=0;
  for(const decision of s.decisions) {
    invalidReferences+=decision.evidenceIds.filter(id=>!seen.has(id)||!evidence.some(e=>e.id===id)||!s.revealed.includes(id)).length;
    if(decision.action==='inspect'&&decision.targetEvidenceId) seen.add(decision.targetEvidenceId);
  }
  return {kind:'custom-app-assertions', schemaValidDecisions:s.decisions.filter(d=>decisionSchema.safeParse(d).success).length, acceptedDecisions:s.decisions.length,
    evidenceReferenceCount:references.length, invalidEvidenceReferences:invalidReferences,
    revealedEvidenceCount:s.revealed.length, maxDecisions:MAX_DECISIONS, remainingDecisions:MAX_DECISIONS-s.decisions.length,
    budgetWithinBound:s.decisions.length<=MAX_DECISIONS, modelApiCalls:0};
}
export class Repository {
  db:DatabaseSync;
  constructor(path:string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS case_room_runs (run_id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
  }
  close() { this.db.close(); }
  get(runId:string):RecordState {
    const row = this.db.prepare('SELECT payload FROM case_room_runs WHERE run_id=?').get(runId);
    if (!row) throw new DecisionError('RUN_NOT_FOUND','Unknown run ID');
    return JSON.parse(String(row.payload));
  }
  save(s:RecordState) { this.db.prepare('UPDATE case_room_runs SET payload=? WHERE run_id=?').run(JSON.stringify(s),s.runId); }
  event(s:RecordState, type:string,title:string,summary:string,evidenceIds:string[]=[],data:Record<string,unknown>={}) {
    const seq=s.events.length+1;
    const event={id:`${s.runId}:${seq}`,seq,type,at:new Date().toISOString(),title,summary,evidenceIds,data};
    s.events.push(event); return event;
  }
  create(runId:string) {
    const s:RecordState={runId,version:1,status:'investigating',revealed:['opening'],events:[],decisions:[],receipts:{},finalized:false};
    this.event(s,'case_started',caseInfo.title,evidence[0].summary,['opening'],{mode:'external-decision',modelApiCalls:0});
    try { this.db.prepare('INSERT INTO case_room_runs(run_id,payload) VALUES(?,?)').run(runId,JSON.stringify(s)); }
    catch { throw new DecisionError('RUN_EXISTS','Run ID already exists; use status or pending'); }
    return s;
  }
  duplicate(s:RecordState,d:Decision):Receipt|undefined {
    const found=Object.hasOwn(s.receipts,d.idempotencyKey)?s.receipts[d.idempotencyKey]:undefined;
    if (!found) return;
    if (found.canonical!==canonical(d)) throw new DecisionError('IDEMPOTENCY_CONFLICT','Key already used with a different decision payload');
    return found.receipt;
  }
  validate(s:RecordState,d:Decision) {
    const duplicate=this.duplicate(s,d); if (duplicate) return duplicate;
    if (d.decisionVersion!==s.version) throw new DecisionError('STALE_VERSION',`Expected decisionVersion ${s.version}`);
    if (s.status!=='investigating') throw new DecisionError('RUN_CLOSED','No decisions accepted after closure');
    if (s.decisions.length>=MAX_DECISIONS) throw new DecisionError('BUDGET_EXHAUSTED','Decision budget exhausted');
    for(const id of d.evidenceIds) {
      if (!evidence.some(e=>e.id===id)) throw new DecisionError('UNKNOWN_EVIDENCE',`Unknown evidence: ${id}`);
      if (!s.revealed.includes(id)) throw new DecisionError('UNREVEALED_EVIDENCE',`Cannot cite unrevealed evidence: ${id}`);
    }
    if(d.action==='inspect') {
      if(!evidence.some(e=>e.id===d.targetEvidenceId)) throw new DecisionError('UNKNOWN_EVIDENCE','Unknown inspection target');
      if(!availableEvidence(s.revealed).includes(d.targetEvidenceId!)) throw new DecisionError('INSPECT_NOT_ALLOWED','Target already revealed or prerequisite not met');
    } else if(s.revealed.length<3 || d.evidenceIds.filter(id=>id!=='opening').length<2) {
      throw new DecisionError('PREMATURE_RESOLVE','Resolve requires at least two inspected evidence items and citations to at least two of them');
    }
  }
  assertPendingVersion(s:RecordState,stepPath:string[]) {
    // The ledger and Mastra snapshot commit separately. Never combine an old step with a new version.
    if(stepPath.at(-1)!==`decision-${s.version}`) throw new DecisionError('RECOVERY_REQUIRED',
      `Persisted snapshot step ${stepPath.join('/')} does not match ledger decisionVersion ${s.version}. Retry the exact original decision (same idempotencyKey and payload) for the suspended step to recover a ledger-commit/snapshot gap; do not submit a new decision. If unavailable or recovery fails, preserve the database for manual recovery.`);
  }
  pending(runId:string,stepPath:string[]) {
    const s=this.get(runId);
    this.assertPendingVersion(s,stepPath);
    return {runId,stepPath,decisionVersion:s.version,allowedActions:s.status==='investigating' ? (s.revealed.length>=3?['inspect','resolve']:['inspect']):[],
      allowedEvidenceIds:availableEvidence(s.revealed),revealedEvidenceIds:s.revealed,
      case:caseInfo,revealedEvidence:evidence.filter(e=>s.revealed.includes(e.id)),remainingDecisions:MAX_DECISIONS-s.decisions.length,
      requiredSchema:requiredDecisionSchema,rules:['Only predefined inspection targets may be revealed.','Cite only already revealed evidence, not the target you are about to inspect.','Resolve requires two inspected items and citations to two inspected items.','Stage-2 records unlock after room-timeline.','Hypothesis, rationale, and perspectives are unverified external opinions, never new evidence.','Use the current decisionVersion and a unique idempotencyKey.','Hypothesis labels fatigue, food, air are suggested; this is fictional, not clinical.']};
  }
  apply(runId:string,d:Decision):Receipt {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const s=this.get(runId); const old=this.validate(s,d);
      if(old) {this.db.exec('COMMIT');return old;}
      s.decisions.push(d);
      const ev=this.event(s,'decision_accepted',`${d.action==='inspect'?'Inspection':'Resolution'} decision accepted`,d.rationale,d.evidenceIds,{decision:d,source:'external-cli',unverifiedOpinion:true});
      if(d.action==='inspect') {
        s.revealed.push(d.targetEvidenceId!);
        const e=evidence.find(e=>e.id===d.targetEvidenceId)!;
        this.event(s,'evidence_revealed',e.title,e.summary,[e.id],{kind:e.kind,stage:e.stage});
      } else s.status='resolved';
      s.version++;
      if(s.status==='investigating' && s.decisions.length===MAX_DECISIONS) s.status='exhausted';
      const receipt:Receipt={runId,idempotencyKey:d.idempotencyKey,decisionVersion:d.decisionVersion,action:d.action,accepted:true,at:ev.at,eventId:ev.id,...(d.action==='inspect'?{revealedEvidenceId:d.targetEvidenceId}:{})};
      Object.defineProperty(s.receipts,d.idempotencyKey,{value:{canonical:canonical(d),receipt},enumerable:true,configurable:true,writable:true});
      this.save(s);this.db.exec('COMMIT');return receipt;
    } catch(e) {this.db.exec('ROLLBACK');throw e;}
  }
  finish(runId:string,kind:'resolved'|'exhausted') {
    const s=this.get(runId); if(s.finalized) return;
    s.evaluation=evaluate(s); s.finalized=true;
    if(kind==='resolved') {s.resolution=resolution;this.event(s,'resolution',resolution.title,resolution.summary,[],{externalHypothesis:s.decisions.at(-1)?.hypothesis,builderKnowsAnswer:true});}
    else this.event(s,'budget_exhausted','Investigation closed at the decision limit','No external resolution was submitted within five accepted decisions. Hidden story resolution remains withheld.');
    this.event(s,'evaluation','Deterministic protocol checks','Evidence-reference and decision-budget checks only; not a medical or reasoning-quality score.',[],s.evaluation);
    this.save(s);
  }
  bundle(runId:string,workflowStatus:string) {
    const s=this.get(runId);
    return {schemaVersion:'1.0',mode:'recorded-replay',runId,case:caseInfo,status:s.finalized?s.status:'suspended',events:s.events,
      evidence:evidence.filter(e=>s.revealed.includes(e.id)),...(s.finalized&&s.resolution?{resolution:s.resolution}:{}),
      receipts:{mastraVersion:'1.64.0',mastraCliVersion:'1.27.3',libsqlVersion:'1.22.3',nodeVersion:process.version,workflowStatus,
        modelApiCalls:0,noModelApiCalls:true,decisionSource:'external local CLI',mockTranscript:false,builderKnowsAnswer:true,
        authBoundary:'local trusted CLI; not multi-user authorization',decisionReceipts:Object.values(s.receipts).map(r=>r.receipt),evaluation:evaluate(s)}};
  }
}
