# Mastra external-decision workflows

## Purpose
Build and operate real Mastra workflows while the reasoning assistant runs in its existing Hyperagent thread. Mastra does NOT call an Astra/model-provider API. Use typed external decisions and durable suspend/resume, then export public events to an explicitly recorded replay.

This skill includes tested operating patterns and two Python helper scripts. Its first application is the fictional Case Room in Laksh-star/dr-house-in-house; arbitrary new applications need their own adapters and tests. It is not a generic instant workflow generator.

## Requirements
Python 3.9+, Git, npm, Node >=22.13.0. Application pins @mastra/core 1.64.0, CLI mastra 1.27.3, @mastra/libsql 1.22.3 in case-room/package.json plus a dependency lockfile. No model API keys or credential fields are required. Normal Hyperagent reasoning/tool usage still applies.

## Loading and setup
Fetch this skill's registered scripts using the platform's supported skill-file tool and use the exact returned paths. Helper paths may move; never assume the skill lives beside the source repository.

For an existing trusted checkout:

```sh
python3 <script-path>/case_room.py --repo <absolute-repo-root> status --run <run-id>
```

The wrapper validates case-room/package.json and Node. It does not silently install dependencies or update an explicit checkout.

For a new sandbox, invoke explicit setup with a reviewed full 40-character commit SHA from this repository. Never substitute an arbitrary latest branch:

```sh
python3 <script-path>/case_room.py setup --ref <reviewed-full-commit-sha>
```

Setup clones only the authorized public repository into its own commit-specific cache, verifies origin and HEAD, and runs npm ci. It requires network access to GitHub and npm. On a firewall denial request access through supported tools; do not switch registries or repos silently. Existing managed checkouts are verified and reused rather than overwritten. Setup's full clone/install path should be verified for the chosen commit; wrapper setup logic has unit coverage, but that is not a substitute for a successful real installation.

Resolution order: explicit --repo, non-secret CASE_ROOM_CHECKOUT, then the helper's managed current.json. Put --repo BEFORE the command. Use absolute paths for decision/input/output files because commands run in the package directory.

## Case operations

```sh
python3 <script>/case_room.py --repo <repo> start --case night-shift --run-id <unique-id>
python3 <script>/case_room.py --repo <repo> pending --run <id>
python3 <script>/case_room.py --repo <repo> resume --run <id> --decision <absolute-json-path>
python3 <script>/case_room.py --repo <repo> status --run <id>
python3 <script>/case_room.py --repo <repo> export --run <id> --out <absolute-json-path>
python3 <script>/case_room.py --repo <repo> render --input <absolute-json-path> --output <new-absolute-html-path>
```

`pending` supplies actual run/step/version, revealed evidence, allowed actions/targets and strict resume JSON Schema. Reason from that payload in the thread; write a structured decision file; submit it. Do not generate decisions inside an application model SDK. Role perspectives share the current model context and are not isolated agents. Do not present assistant approval as user approval.

Decision shape: decisionVersion, idempotencyKey, action inspect|resolve, targetEvidenceId for inspect only, hypothesis, evidenceIds, optional perspectives[{role,position}], rationale. Read the current generated schema for bounds. Cite only evidence already revealed BEFORE the decision, not the item being requested. No unknown fields. Resolve requires two inspected records and citations to two inspected records. Five accepted decisions total; exhausting the budget by inspection withholds the authored resolution.

## Persistence and error handling
Mastra owns genuine workflow snapshots through file-backed LibSQLStore. Application SQLite ledger stores accepted events and receipts separately. CASE_ROOM_DB selects a database file; default package .state/case-room.db. Preserve/back up the file; a completed source install does not recreate old runs. Export important public event bundles with platform file-saving tools.

Exact duplicate key plus identical canonical decision returns the original receipt, not a new action. Same key with changed payload rejects; new key with stale version rejects. A ledger/snapshot mismatch returns RECOVERY_REQUIRED before advertising pending or resuming a new decision. Use status to inspect and retry the EXACT original committed submission if available; do not invent a repair or mutate DB tables. The tested recovery path is narrower than universal crash recovery.

A per-database lock serializes CLI access. If a process crashes, confirm its recorded PID is dead before manually removing its stale lock; otherwise stop and ask. Never remove an active lock or access one DB through competing path aliases. CLI is trusted-local only, not a multi-user authorization service.

## Validate before claiming success

```sh
python3 <script>/case_room.py --repo <repo> typecheck
python3 <script>/case_room.py --repo <repo> build
python3 <script>/case_room.py --repo <repo> test
```

Tests cover fresh-process persistence, strict/rejected inputs, temporal evidence references, idempotency/crash-gap handling, budget routing, and safe replay embedding. Test fixtures are synthetic and distinct from actual assistant-authored run decisions. Evaluation is pure application protocol checks, NOT clinical scoring or Mastra model-based judging. Mastra does not expose this Hyperagent session's internal tokens or costs. Do not invent telemetry.

## Replay and attribution
Renderer fills a single template token using JSON escaped for less-than/U+2028/U+2029 and a replacement function. It refuses to overwrite existing output. Model/user strings render with textContent. Decisions are labeled unverified opinions; protocol acceptance is not truth validation. Optional --actor is explicitly operator-supplied attribution, not engine attestation.

The Three.js page is a static interactive replay: frame navigation, evidence inspection, recorded perspectives and resolution. Fresh reasoning happens in the Hyperagent thread, not in the artifact. Do not claim a click invokes Astra. The completed JSON contains the resolution, so the exported page is not a secure hidden-answer game. CDN/WebGL failure falls back to a 2D room. Verify the actual populated published version and inspect screenshots, not just a mock template.

## Updates

```sh
python3 <script-path>/check_mastra_release.py --current @mastra/core@1.64.0
```

This read-only helper checks GitHub's latest release metadata. It does not install, edit the repo, or update the registered skill. GitHub metadata does not establish npm availability or compatibility. Review release notes and dependencies, migrate on a branch, run tests, then propose updates to both repository and existing skill docs/scripts. Pin tested versions. Do not create duplicate skills or promise unattended syncing. A recurring update schedule must be configured separately.

## Scope
Fictional investigation and engineering showcase only. No real patient intake, treatment advice, clinical reliability claim, or blind benchmark: the builder knows the authored truth. Main source remains in the user's repo; no separate model credential is needed. Prior legacy workflows in the repo may still require keys: do not run them when using this skill.

## References
- https://github.com/Laksh-star/dr-house-in-house
- https://mastra.ai/docs/workflows/suspend-and-resume
- https://mastra.ai/docs/workflows/control-flow
- https://github.com/mastra-ai/mastra/releases/tag/%40mastra/core%401.64.0
