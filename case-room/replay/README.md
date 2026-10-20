# The Night Shift — captured replay template

> **Using the replay rather than building it? [Start with the User Guide](../USER-GUIDE.md).** The 3D page plays recorded events; fresh investigation choices happen in Hyperagent, not in this page.

`replay-template.html` is a standalone, vanilla HTML/CSS/JavaScript presentation. It has no app dependencies and makes no agent, model, or application API calls. Its only network resources are pinned Three.js 0.160.0 and Google Fonts; blocked resources leave a usable 2D replay with system-font fallbacks.

## Export contract

Replace the **single** `__CASE_ROOM_DATA__` token in the HTML with the exported run JSON. The assignment is intentionally `const RUN = __CASE_ROOM_DATA__;`. The raw template is not an executable replay until that token is replaced. Do not insert sample/fabricated events to make it look populated.

Example exporter snippet (not engine implementation):

```js
const token = '__CASE_ROOM_DATA__';
if (template.split(token).length !== 2) throw new Error('Expected exactly one data token');
const json = JSON.stringify(bundle)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');
const html = template.replace(token, () => json);
```

Use the replacement **function**, not a raw replacement string: captured values may contain `$&`, `$'`, or other JavaScript replacement-string metacharacters. Escaping `<` prevents a captured `</script>` from terminating the data script. Do not HTML-entity-encode the whole JSON.

Expected common schema:

- `schemaVersion`, `mode`, `runId`, `status`
- `case: { id, title, subtitle, disclaimer }`
- `events: [{ id, seq, type, at, title, summary, evidenceIds, data }]`
- `evidence: [{ id, title, kind, summary, stage }]`
- optional `resolution: { title, summary }`
- `receipts: { mastraVersion, nodeVersion, ... }`
- optional `provenance: { actorLabel, ... }`: an explicit nonempty string `actorLabel` appends attribution to the neutral “Recorded investigation” header; a string `actor` is also supported when `actorLabel` is absent/empty. Structured actors are not guessed or coerced into labels. The supplied provenance object is included in the receipt. The exporter, not this view, must supply actual attribution; never infer an actor from the case, CLI source, or engine.

The array order is the playback order. `seq` and `at` are shown as captured, not interpreted as durations. The visual headline stays “The Night Shift”; the bundle's case title appears in the document title and receipt. Common fields are rendered with `textContent` / text nodes. The footer is neutral “THE CASE ROOM”. Context explicitly distinguishes fresh reasoning in Hyperagent from this static exported replay; it does not claim a run is currently active.

### Captured external decisions

For an event with an object at `event.data.decision`, a collapsed **External hypothesis — not validated fact** disclosure renders the captured `hypothesis`, `perspectives: [{ role, position }]`, `rationale`, and `evidenceIds`. This matches engine `decision_accepted` events, whose data also supplies `source: "external-cli"` and `unverifiedOpinion: true`. The panel always treats a decision as opinion, even if a partial bundle omits the unverified flag; it never interprets absence as verification. Source is shown only when explicitly supplied.

Protocol acceptance is **not** truth validation. The panel says this explicitly, and cited evidence is not presented as proof of the opinion. Citation IDs are shown with titles only for evidence already available in the current frame; missing or later-frame evidence is marked unavailable without exposing its title. This does not change evidence-exposure authority. All payload values use `textContent`, never HTML. Missing fields get neutral absence messages. Other event-specific `data` remains uninterpreted.

Every event selection collapses and clears the panel before rendering the current decision. Non-decision events leave it hidden and empty. Its focusable inner body is scrollable and capped at `min(280px, 45vh)` to avoid excessive growth on mobile; standard event controls remain unchanged.

## Exposure and honest replay behavior

- Evidence appears starting at its first matching `evidenceIds` event; rewinding removes later evidence from the visible DOM.
- An unreferenced evidence item's `stage` is deliberately **not** guessed to be a sequence index: the schema does not guarantee that relationship. It stays hidden until the final captured frame. Partial exports must omit evidence that was never available to that run.
- Resolution is populated only on the last frame and cleared on rewind.
- The complete exported JSON remains inspectable in the HTML source. This is **not** a secure hidden-answer game. Future event titles are intentionally available on the event rail.
- The receipt shows actual supplied identifiers/status/version fields and actual valid-event count; missing fields are not invented. No QA, diagnostic accuracy, or live-execution metrics are fabricated.
- Playback is manual by default. Explicit Play advances captured events every 4.2 seconds, not according to original wall-clock timing. Changing frames manually pauses Play. Backgrounding the page also pauses it.
- Left/right arrow keys step the replay except in form fields/editable inputs. The native range input keeps its own keyboard behavior.

## Visual implementation

A real Three.js perspective scene uses an architectural open-front room, solid wood desk, drawer pedestal, articulated warm spotlight lamp, open dossier, paper stack, ceramic cup, chair, archive cabinet, cool glazed window with blinds, and back-wall evidence timeline. The scene is illustrative; abstract marks on paper do not invent captured text. Up to six physical board cards mirror the count of exposed evidence as a decorative cue, while all available evidence remains accessible in the reading panel.

The desktop split allocates approximately 58% to the scene. Mobile stacks the room and panel. The interface includes focus indicators, a skip link, screen-reader announcements, scrollable/focusable summaries, native buttons and receipt disclosure, selectable event cards, a scrubber, Play/Pause, previous/next, Reset view and a 2D/3D toggle.

Rendering is on demand, with no ambient loop. Frame changes use at most a 620ms camera move; reduced-motion preferences eliminate camera interpolation. Pixel ratio is capped at 1.6; one shadow-casting spotlight uses a 1024px map. ResizeObserver updates camera aspect and renderer dimensions. Missing Three.js, WebGL construction errors, or graphics-context loss keep the CSS 2D room and functional event/evidence controls. The main exporter may inline the pinned Three.js distribution in place of its external script if desired.

## Validation

Review-fix validation: headless Chromium (Playwright) passed with **temporary in-memory fixtures, not an actual engine export**. No actual export was available in `reports/live` at the time (only decision/receipt files); no database was accessed and no decision files were modified. Tests covered the single exporter sentinel, neutral/explicit actor attribution (including refusing structured-actor inference), all decision fields/source/citations, inert HTML/script-like payloads, withholding future evidence titles, collapse/clear on navigation and rewind, previous/next/arrows/scrubber/event rail/Play-Pause, empty decisions and empty bundles, and blocked-CDN fallback. At 390px viewport width the expanded body was 280px high with 2115px scroll content; document width remained 390px. Final suite: zero JavaScript page errors. Fixtures and test pages were memory-only, not added to the deliverable. Actual-export integration was subsequently completed by the main assistant: `reports/live/night-shift.json` contains the actual 12-event run; `scripts/render-replay.mjs` safely populated the published Three.js artifact. The actual-export QA receipt is `reports/live/browser-qa.json`. Desktop next-event/disclosure controls, final resolution rendering, live-data evidence counts, and 390px mobile layout were checked. This later verification is separate from the synthetic tests described above.

Tested with headless Chromium via an isolated Playwright install and mock bundle under `/tmp/case-replay-test` (not part of this deliverable). Validation covered a functioning WebGL scene, desktop and 390px mobile screenshots, initial exposure, no autoplay, progressive evidence, rewind, inert HTML-like evidence values, last-frame resolution, scrubber keyboard behavior, Play/Pause, the 2D toggle, blocked CDN fallback, reduced-motion fallback, and an empty bundle. The tested populated replay had zero JavaScript page errors. Fixtures are explicitly local test data and are not embedded in the deliverable.
