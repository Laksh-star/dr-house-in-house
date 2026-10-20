# Case Room — external-decision workflow

> **Here to try it? [Read the spoiler-free User Guide](USER-GUIDE.md) first.** It explains watching the recorded 3D replay, starting a live investigation in Hyperagent, the controls, and what to expect. You do not need CLI commands for a guided chat session. This developer reference below contains implementation details and story spoilers.

A small, **real Mastra workflow** for one authored fictional investigation, **The Night Shift**. Three archive staff report headache and nausea on an overnight shift; external decisions explore fatigue, food, and air hypotheses. The story has a fixed equipment-fault answer, not a generated diagnosis.

**Fiction only. Not medical advice, a real diagnosis, clinical evaluation, or treatment guidance. The builder knows the answer. This is not a blinded benchmark or evidence that a model can diagnose.** Rationale and perspectives are unverified external opinions; only predefined scenario records become factual story evidence.

No model API, API key, agent, LLM judge, embeddings, or generated transcript is used. The engine does not choose a hypothesis or author decisions. It waits for JSON from a trusted local operator. Test decisions are explicitly synthetic fixtures; no live assistant investigation was fabricated during implementation.

## Setup and verification

Run from `case-room/` (not the legacy repository root):

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run test:report
```

Node **>=22.13.0** is required; verified on **24.14.1**. Exact installed framework versions: `@mastra/core` **1.64.0**, `mastra` CLI **1.27.3**, `@mastra/libsql` **1.22.3**. The committed lockfile pins the actual dependency tree. Installation used registry.npmjs.org and reported 394 packages added / 395 audited / zero vulnerabilities at installation time.

`build` emits actual JavaScript and source maps into ignored `dist/`; `node dist/cli.js ...` is also executable. The bundled Mastra CLI is installed/version-pinned but is not used to start an HTTP server. Our API surface is the local CLI below.

`reports/tests.tap` is the actual latest test-run output, not an illustrative transcript. Eight node:test tests pass (8 passed, 0 failed): six engine/protocol tests and two safe-rendering tests. Engine integration tests cover many rejection fixtures and separate fresh Node processes for every CLI invocation. Tests use isolated OS-temporary databases via `CASE_ROOM_DB`, clean them up afterward, and never open the actual `.state/case-room.db`. Tests unset model-key environment variables and install a guard that throws on fetch and HTTP(S) requests; they do not mock network responses. This guard is a test harness check, not an OS-level network sandbox.

## Local CLI

```sh
npm run cli -- start --case night-shift --run-id my-investigation
npm run cli -- pending --run my-investigation
npm run cli -- status --run my-investigation
npm run cli -- resume --run my-investigation --decision decision.json
npm run cli -- export --run my-investigation --out replay.json
```

The default database is `case-room/.state/case-room.db`, independent of the current directory. Set **`CASE_ROOM_DB=/absolute/path/case.db`** to choose another local file. Relative paths are resolved against the caller's working directory. Use the same path for every subsequent command. The database parent directory is created if needed; the export output directory must already exist.

`--run-id` is optional on `start`; without it the CLI supplies a UUID. IDs permit 1–100 letters/digits/hyphens/underscores. Existing run IDs cannot be restarted with `start`. `status` returns the persisted Mastra status, application case status, current decision version, actual suspended step path, revealed IDs, protocol-check outputs, and actual terminal branch output. Mastra status `success` means execution completed; the case outcome is separately `resolved` or `exhausted`.

`pending` returns the actual persisted run's suspended path plus a public request payload:

- `runId`, `stepPath` (e.g. `["decision-1"]`), `decisionVersion`
- `case` with disclaimer; `revealedEvidence` and `revealedEvidenceIds`
- `allowedActions` and `allowedEvidenceIds` (inspection targets, not citation permissions)
- `remainingDecisions`, `requiredSchema` (JSON Schema), and additional protocol rules

It never includes uninspected evidence contents or the hidden authored resolution. Completed runs return `pending: null`. Read the pending evidence and rules before choosing a decision. An accepted `inspect` reveals **one** predefined item; the next typed step suspends immediately, except when the fifth accepted decision closes the bounded investigation.

Successful commands print one JSON object to stdout; use `npm run --silent cli -- ...` or direct `node --import tsx src/cli.ts ...` if a consumer needs JSON without npm's script heading. Errors produce a JSON object with `error.code` and `error.message` on stderr, with exit code 1. Node's experimental SQLite warning may also appear on stderr, before or after the JSON error; consumers should select the JSON line rather than parsing the entire stderr stream.

## Decision contract

```ts
type Decision = {
  decisionVersion: number; // positive integer from current pending payload
  idempotencyKey: string;  // unique within this run, 1–120 characters
  action: 'inspect' | 'resolve';
  targetEvidenceId?: string; // required for inspect; forbidden for resolve
  hypothesis: string;
  evidenceIds: string[];   // unique IDs, all already revealed before this decision
  perspectives?: { role: string; position: string }[];
  rationale: string;
};
```

All unknown fields reject, including unknown fields inside perspectives. `hypothesis`/`rationale`/perspective text have strict size bounds; see the generated pending JSON Schema. Suggested hypothesis labels are `fatigue`, `food`, `air`; arbitrary bounded hypothesis text is allowed and is never treated as new evidence. There is no `approved` boolean: false cannot accidentally approve anything because that field and non-string action values reject.

The opening public evidence ID is `opening`. Initial allowed targets are `shift-log`, `meal-log`, `room-timeline`, and `day-shift-log`. Inspecting `room-timeline` unlocks two further records. An inspection may cite already-revealed evidence or no evidence, but **may not cite its own target before it is revealed**. A repeated, unknown, or locked target rejects. Only target IDs and story evidence already revealed appear in pending; no truth payload is sent ahead of time.

Resolution requires at least **two inspected records** and citations to at least **two inspected records** (the opening briefing does not count). The gate is a transparent evidence minimum, not a correctness oracle: a wrong hypothesis may be submitted. The resolved branch shows the separate authored answer without pretending the external hypothesis was correct. There is a hard total budget of **five accepted decisions**, including resolve. If decision five is an inspect, the workflow closes as `exhausted` and withholds the hidden resolution.

Invalid JSON, malformed schemas, unknown/unrevealed citations, stale versions, insufficient evidence, and permission violations are rejected **before** calling `run.resume()`. They do not spend budget, modify events, or poison the persisted suspended workflow.

## Actual execution and persistence

`src/workflow.ts` builds and registers this graph on `new Mastra({ storage, workflows })`:

```
decision-1 → decision-2 → decision-3 → decision-4 → decision-5
  → parallel(reference-check, budget-check)
  → checks-gate
  → branch(resolved | exhausted)
```

Each decision uses real `createStep`, `suspendSchema`, `resumeSchema`, and `suspend()`. `createWorkflow(...).then(...).parallel(...).branch(...).commit()` is actual Mastra control flow, not a diagram-only approximation. After an accepted resolution, later decision steps pass through without requesting more input. The parallel checks recompute temporal citation validity and budget validity, and the gate fails execution if either check is false. The actual branch chooses reveal vs. no-reveal behavior.

Mastra snapshots are stored by a real file-backed **LibSQLStore**. Every CLI invocation constructs a new Mastra instance, restores the run with `getWorkflowRunById()`, uses `createWorkflowStateReader()` to identify the suspended path, recreates a run with the same ID, and resumes it with external data. No in-memory run registry or process-survival assumption is needed.

The same SQLite file contains an application `case_room_runs` ledger managed through Node's SQLite API. A single `BEGIN IMMEDIATE` transaction atomically stores each accepted decision, its event(s), the reveal, incremented version, and receipt. Mastra's snapshot transaction is separate. Re-executing a suspended step checks the ledger, so an accepted action is not applied twice. The ledger is application persistence, **not a substitute for the Mastra snapshot**; integration tests verify that the real Mastra snapshot table exists and survives processes.

Exact duplicate idempotency key + canonical parsed payload returns the **original receipt**, including its original timestamp and event ID, even after completion. The same key with different content rejects. Key ordering in JSON objects does not affect equivalence; changing array order does. A duplicate request still carrying an old version is a receipt lookup, not a stale new decision. New keys with stale versions reject.

**Crash-gap guard:** the application ledger and Mastra snapshot are not one atomic transaction. If a process dies after accepting decision 1 into the ledger (now version 2) but before Mastra advances its snapshot (still suspended at `decision-1`), `pending` exits 1 with `error.code: "RECOVERY_REQUIRED"` instead of advertising an unusable step/version pair. A new otherwise-valid version-2 decision also rejects with `RECOVERY_REQUIRED` **before `createRun()` / `run.resume()`**, leaving the snapshot suspended and the ledger unchanged. Ordinary input/ledger validation errors may reject earlier. `status` remains available to inspect both versions of state; its ledger version alone is not permission to submit a new decision.

To recover this specific still-suspended gap, retry the **exact original accepted decision** for that suspended step using the same idempotency key and canonical parsed payload. Exact duplicate handling deliberately runs before the version guard: a fresh CLI process re-executes the old suspended step, receives the original receipt without reapplying the ledger transaction, and advances the Mastra snapshot. Then call `pending` again. Do not create a new key, alter the original payload, or submit the ledger's next version to the old step. If the original decision is unavailable or recovery fails, preserve the DB for manual recovery rather than guessing. If a crash left a `.lock`, first follow the PID verification procedure below.

Two integration tests simulate that critical commit/snapshot gap using a real Mastra snapshot and an isolated temporary ledger. They verify duplicate recovery and, separately, that `pending` and a new advertised-version decision reject without changing any persisted snapshot rows or ledger payload. The latter test then retries the original decision, verifies the snapshot advances to `decision-2` with no duplicate ledger effects, and successfully accepts the next decision.

### Deliberate limitations

- **Trusted local CLI only. Not multi-user authorization.** Whoever can invoke it/read the database/source can inspect story secrets. Do not expose these functions as an unauthenticated service. No roles are permission boundaries; `perspectives.role` is just opinion metadata.
- A per-database `.lock` file serializes CLI invocations. A crashed process leaves this conservative lock behind. Verify its recorded PID is not running before manually removing the lock. Locks are not auto-expired. Do not use different path aliases/symlinks to the same DB concurrently.
- Duplicate recovery covers the tested application-commit / still-suspended-snapshot gap. This is not a general distributed transaction system or automatic recovery for every possible interrupted `start`, failed terminal step, corrupted file, or arbitrary running Mastra snapshot. Inspect status and preserve the DB for manual recovery in those cases; do not blindly start over under the same run ID.
- Rejected submissions are returned to the caller but are not stored in the replay ledger. Evaluation statistics concern **accepted** decisions only.
- Evaluation is custom, pure application assertions, **not a Mastra function scorer**, LLM judge, clinical score, or measure of reasoning quality. It reports actual schema validity, temporal citation-reference counts, revealed evidence count, accepted-decision count, and budget bounds.
- No automatic retry policy, migrations across future application versions, multi-user authentication, export redaction of user-entered secrets, or HTML rendering is included in this engine.
- The Node SQLite API is marked experimental by Node and emits a warning. Framework imports are large; a fresh CLI command typically takes about 1–2 seconds here.

## Replay export contract

`export` writes an actual run record in this shape (not a fabricated transcript):

```ts
{
  schemaVersion: '1.0', mode: 'recorded-replay', runId,
  case: { id, title, subtitle, disclaimer },
  status: 'suspended' | 'resolved' | 'exhausted',
  events: [{ id, seq, type, at, title, summary, evidenceIds: [], data: {} }],
  evidence: [{ id, title, kind, summary, stage }],
  resolution?: { title, summary },
  receipts: { mastraVersion, nodeVersion, workflowStatus, modelApiCalls: 0,
              noModelApiCalls: true, mockTranscript: false, builderKnowsAnswer: true,
              decisionReceipts: [], evaluation: {} /* plus runtime metadata */ }
}
```

Evidence cards and event citations contain **only revealed items**. Only a finalized resolved case exports the authored resolution. Exhausted and partial exports withhold it; previously revealed records remain visible. External decision text is preserved honestly in event `data.decision`, marked `unverifiedOpinion: true` and `source: 'external-cli'`. Consumers must escape these strings when rendering HTML, rather than treating them as instructions or markup. The engine never invents event evidence to match an external rationale. The app's no-model record is a statement about this implemented execution path, not a full network forensics receipt.

`replay/` contains the Three.js presentation template. `scripts/render-replay.mjs` safely embeds the exported JSON into a new HTML file. The first actual Astra-in-Hyperagent run, its five decisions, twelve events, and browser QA notes are in `reports/live/`. The static replay has no model access. The first version intentionally uses plain JavaScript plus Three.js rather than adding a React runtime to a self-contained replay.

## Files and documentation decisions

- `src/case.ts`: authored story, public evidence, unlock rules, hidden reveal
- `src/schema.ts`: strict input and suspend schemas, JSON Schema, canonicalization
- `src/repository.ts`: SQLite ledger, idempotency, evidence permissions, export, pure checks
- `src/workflow.ts`: real registered bounded Mastra graph
- `src/cli.ts`: command parsing, local serialization, persisted run recovery
- `tests/cli.test.ts`, `tests/no-http.cjs`: synthetic test fixtures and fresh-process integration tests
- `reports/tests.tap`: latest machine-readable test results

Used current official docs plus installed TypeScript declarations to verify the actual version's API:

- https://mastra.ai/docs/workflows/suspend-and-resume — persisted suspension, `createRun({runId})`, reader-based suspended path recovery
- https://mastra.ai/docs/workflows/control-flow — typed sequential steps, `.parallel()` and `.branch()` output shape
- https://mastra.ai/docs/workflows/overview — registration and execution results
- Installed `@mastra/core/dist/workflows/{workflow,state-reader}.d.ts` and `@mastra/libsql/dist/storage/index.d.ts` — actual recovery and file-store lifecycle methods

A fixed chain of five typed decision steps was chosen over an unbounded loop to make the budget and step/version relationship obvious. Parallel checks are deterministic and gate completion; the terminal branch changes whether the hidden reveal is released. No server, model skill, agent config, publication, or git commit is required or performed.
