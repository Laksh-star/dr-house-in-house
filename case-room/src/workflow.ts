import { Mastra } from '@mastra/core/mastra';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { LibSQLStore } from '@mastra/libsql';
import { z } from 'zod';
import { contextSchema, decisionSchema, pendingSchema, DecisionError } from './schema.js';
import { MAX_DECISIONS } from './case.js';
import { Repository, evaluate } from './repository.js';

export function buildEngine(dbPath:string,repo:Repository) {
  const storage=new LibSQLStore({id:'case-room-storage',url:`file:${dbPath}`});
  const decisionStep=(index:number)=>createStep({
    id:`decision-${index}`,inputSchema:contextSchema,outputSchema:contextSchema,
    suspendSchema:pendingSchema,resumeSchema:decisionSchema,
    execute:async({inputData,resumeData,suspend})=>{
      // Mastra restarts this execute function on resume. The ledger's atomic receipt makes replay safe.
      if(resumeData) {
        if(resumeData.decisionVersion!==index) throw new DecisionError('STEP_VERSION_MISMATCH','Decision does not match suspended step');
        repo.apply(inputData.runId,resumeData);
        return inputData;
      }
      const state=repo.get(inputData.runId);
      if(state.status!=='investigating' || state.version>index) return inputData;
      return await suspend(pendingSchema.parse(repo.pending(inputData.runId,[`decision-${index}`])));
    },
  });
  const checkSchema=z.object({runId:z.string(),valid:z.boolean()});
  const referenceCheck=createStep({id:'reference-check',inputSchema:contextSchema,outputSchema:checkSchema,execute:async({inputData})=>({runId:inputData.runId,valid:evaluate(repo.get(inputData.runId)).invalidEvidenceReferences===0})});
  const budgetCheck=createStep({id:'budget-check',inputSchema:contextSchema,outputSchema:checkSchema,execute:async({inputData})=>({runId:inputData.runId,valid:evaluate(repo.get(inputData.runId)).budgetWithinBound})});
  const checksGate=createStep({id:'checks-gate',inputSchema:z.object({'reference-check':checkSchema,'budget-check':checkSchema}),outputSchema:contextSchema,execute:async({inputData})=>{
    if(!inputData['reference-check'].valid||!inputData['budget-check'].valid) throw new Error('Deterministic protocol checks failed');
    return {runId:inputData['reference-check'].runId};
  }});
  const terminal=(kind:'resolved'|'exhausted')=>createStep({id:kind,inputSchema:contextSchema,outputSchema:contextSchema,execute:async({inputData})=>{repo.finish(inputData.runId,kind);return inputData;}});
  const workflow=createWorkflow({id:'night-shift-investigation',inputSchema:contextSchema,outputSchema:z.object({resolved:contextSchema.optional(),exhausted:contextSchema.optional()})})
    .then(decisionStep(1)).then(decisionStep(2)).then(decisionStep(3)).then(decisionStep(4)).then(decisionStep(MAX_DECISIONS))
    .parallel([referenceCheck,budgetCheck]).then(checksGate)
    .branch([
      [async({inputData})=>repo.get(inputData.runId).status==='resolved',terminal('resolved')],
      [async({inputData})=>repo.get(inputData.runId).status==='exhausted',terminal('exhausted')],
    ]).commit();
  const mastra=new Mastra({storage,workflows:{investigation:workflow},logger:false});
  return {mastra,workflow:mastra.getWorkflow('investigation'),storage};
}
