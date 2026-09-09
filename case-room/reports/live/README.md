# Actual Astra / Hyperagent investigation

Run `astra-nightshift-20260909` was driven by the assistant in its Hyperagent thread, after the engine tests completed. These five `decision-N.json` files were authored in sequence after reading each returned pending payload; they are not the synthetic fixtures in `tests/`.

- Actual Mastra outcome: `success`; application outcome: `resolved`.
- Five accepted decisions; four inspections; twelve recorded events.
- Sequence: room timeline → facilities log → meal log → maintenance report → resolve.
- Each CLI invocation was a separate Node process; Mastra restored a persisted run.
- `receipt-N.json` records each actual accepted submission; `night-shift.json` is the engine's public export.
- `browser-qa.json` describes actual-published-replay verification and its limits.
- Model-provider calls inside the engine: none. Astra reasoning occurred in Hyperagent using the external-decision interface.
- Role perspectives share a single assistant context. They are not independently isolated agents.
- The builder knows the authored case truth. This is not a blind reasoning benchmark, clinical evaluation, or medical advice.

## Recreate the replay

From `case-room/`:

```sh
node scripts/render-replay.mjs --input reports/live/night-shift.json --output /absolute/new-replay.html --actor "Astra in Hyperagent — captured investigation"
```

The output path must not already exist. The actor flag adds explicitly operator-supplied provenance; the engine does not attest to model identity. Inspect the HTML file in a browser. Three.js and fonts load from external CDNs; a functional 2D view remains if WebGL/CDN loading fails. The replay itself makes no model API calls.

## Run a new case

```sh
npm run cli -- start --case night-shift --run-id new-unique-id
npm run cli -- pending --run new-unique-id
```

Read the returned schema and evidence. Write a new decision JSON using the current version and permitted citations, then use `resume`. Do not simply claim these archived decisions are a newly reasoned run. The source and tests intentionally expose the authored solution; there is no secure hidden-answer game in a public source checkout.
