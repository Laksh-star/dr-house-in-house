import { z } from 'zod';
export const decisionSchema = z.strictObject({
  decisionVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(120),
  action: z.enum(['inspect', 'resolve']),
  targetEvidenceId: z.string().min(1).max(80).optional(),
  hypothesis: z.string().min(1).max(300),
  evidenceIds: z.array(z.string().min(1).max(80)).max(12),
  perspectives: z.array(z.strictObject({ role: z.string().min(1).max(100), position: z.string().min(1).max(1000) })).max(6).optional(),
  rationale: z.string().min(1).max(4000),
}).superRefine((d, ctx) => {
  if (d.action === 'inspect' && !d.targetEvidenceId) ctx.addIssue({code: 'custom', message: 'inspect requires targetEvidenceId'});
  if (d.action === 'resolve' && d.targetEvidenceId) ctx.addIssue({code: 'custom', message: 'resolve forbids targetEvidenceId'});
  if (new Set(d.evidenceIds).size !== d.evidenceIds.length) ctx.addIssue({code: 'custom', message: 'evidenceIds must be unique'});
});
export type Decision = z.infer<typeof decisionSchema>;
export const requiredDecisionSchema = {
  ...z.toJSONSchema(decisionSchema),
  allOf: [
    {if:{properties:{action:{const:'inspect'}}},then:{required:['targetEvidenceId']}},
    {if:{properties:{action:{const:'resolve'}}},then:{not:{required:['targetEvidenceId']}}},
    {properties:{evidenceIds:{uniqueItems:true}}},
  ],
};
export const contextSchema = z.strictObject({runId: z.string()});
export const pendingSchema = z.strictObject({
  runId: z.string(), stepPath: z.array(z.string()), decisionVersion: z.number().int(),
  allowedActions: z.array(z.enum(['inspect', 'resolve'])), allowedEvidenceIds: z.array(z.string()),
  revealedEvidenceIds: z.array(z.string()),
  case: z.object({id:z.string(),title:z.string(),subtitle:z.string(),disclaimer:z.string()}),
  revealedEvidence: z.array(z.object({id:z.string(),title:z.string(),kind:z.string(),summary:z.string(),stage:z.number()})),
  requiredSchema: z.unknown(),
  remainingDecisions: z.number().int(), rules: z.array(z.string()),
});
export class DecisionError extends Error { constructor(public code: string, message: string) { super(message); } }
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
