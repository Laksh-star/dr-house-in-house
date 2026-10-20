# The Case Room — User Guide

**Start here if you want to experience the project, not install or develop it.** This guide is spoiler-free.

> **The most important distinction:** the 3D page is a **recorded replay**. A **live investigation happens in a Hyperagent conversation**. Pressing Play on the page does not start Astra or run Mastra.

## 1. What you are getting

The Case Room is a fictional investigation and engineering showcase. You explore a mystery with Astra, while Mastra keeps the investigation state, checks permitted actions, and records what happened. A 3D room presents the recorded events afterward.

The first version contains **one authored story: The Night Shift**. Starting another run resets that story; it does not generate a new mystery or hide the ending from someone who already knows it.

This is not a medical service, a validated medical teaching tool, or a test proving that AI can diagnose people. Please do not enter personal symptoms, patient records, or other sensitive information.

### Choose your experience

| If you want to… | Go here | What you should expect |
|---|---|---|
| Look around the finished demonstration | The published Case Room replay shared by the project owner | Recorded events, evidence cards, perspectives, and a final reveal if that run resolved |
| Make choices and see the engine respond now | A Hyperagent conversation with the Case Room skill and project source available | A fresh run; your choices are submitted to the real Mastra workflow |
| Change the code or run it on your own machine | [Developer setup and CLI reference](README.md) | A Node/TypeScript project, not an install-free public chatbot |

A public replay link does not grant access to the owner's Hyperagent account, skill, or live runner. If you only have the link, you can watch the recorded experience. To run it live yourself, you need your own compatible setup or a guided session with the owner.

## 2. Your first two minutes: watch the replay

Open the published **The Night Shift** replay shared with you. No local installation or model API key is needed to view it.

1. **Read the opening event.** Look at the right-hand reading panel on desktop, or below the room on mobile.
2. **Select an evidence card.** Its captured summary appears in the evidence detail area.
3. **Press Next (→).** You move to the next recorded event, not to a new AI response.
4. On a decision event, open **External hypothesis — not validated fact**. This shows the captured hypothesis, rationale, role perspectives, and citations.
5. Move forward to an evidence-reveal event. Notice that more evidence becomes available.
6. Reach the final event to see the captured resolution, if the recorded run resolved. Rewind to compare earlier interpretations with what was known then.

**The 3D room is the setting, not the main control surface.** Use the timeline, buttons, and evidence cards in the reading panel. Do not expect every object on the desk to be clickable, or a first-person game you can walk through.

### Replay controls

| Control | What it does | What it does not do |
|---|---|---|
| **Play / Pause** | Advances or pauses the recorded event sequence | Does not invoke Astra, spend investigation decisions, or recreate the original waiting time |
| **Previous / Next** | Moves one recorded event backward or forward | Does not undo or change the actual saved investigation |
| **Timeline slider** | Jumps to a recorded event | Does not submit an investigation action |
| **Event cards below the slider** | Select a specific recorded event | Do not branch into an unrecorded storyline |
| **Available evidence cards** | Show evidence exposed by that point in the recording | Do not order a new investigation or create a new finding |
| **External hypothesis disclosure** | Shows captured external opinion for decision events | Does not certify that the hypothesis is true |
| **Reset view** | Resets the 3D camera | Does not reset the case or timeline |
| **2D view / 3D view** | Switches the visual presentation | Does not change evidence or outcomes |
| **Run receipt** | Shows supplied run identifiers, state, versions, and recorded metadata | Does not independently certify the named model or clinical accuracy |

Playback starts paused. Explicit Play advances events approximately every 4.2 seconds; that timing is for presentation. A manual frame change or switching away from the page pauses playback. Left/right arrow keys step through events when focus is not in an input or editable field.

The supplied demonstration has **12 events**. Another run may have a different number. Future event titles on the timeline and the completed data inside the page can contain spoilers; this is not a secure hidden-answer game.

## 3. Start a live investigation in Hyperagent

In the project conversation—or a conversation where the saved skill and source are available—send:

> Start a fresh Night Shift investigation using the Mastra external-decision skill. Show me the new run ID. Pause after the opening and after every revealed clue so I can choose the next action. Do not replay the archived run or make choices for me.

**You do not need to type CLI commands, edit JSON, or provide an Astra API key.** The assistant handles the local workflow commands. Initial setup may require installing project dependencies or granting network access; the assistant should tell you if that blocks execution.

A genuine live start should return:

- A **new run ID**, not the ID from the archived demonstration.
- The opening fictional briefing.
- Evidence currently revealed.
- The actions currently allowed by the workflow.
- The remaining decision budget.
- A pause for your choice.

If no engine tool has run, the assistant should not call a generated story a live Mastra investigation.

### Make a choice in ordinary language

Examples you can type, subject to the actions offered at that point:

> Inspect the room timeline.

> Check the meal record before we settle on a theory.

> Explain what supports each hypothesis, but don't advance the workflow yet.

> Show me what evidence is actually known versus what the team is assuming.

> Resolve the case using the evidence we've already inspected, if the workflow allows it.

The assistant translates an allowed choice into a structured decision and submits it. After the tool finishes, expect a clear distinction between:

1. **What the engine revealed:** fixed, authored case evidence.
2. **What Astra thinks:** an interpretation that can be challenged.
3. **What you can do next:** permitted actions and remaining budget.

A request to explain or discuss evidence does not itself consume a workflow decision. An accepted **inspect** or **resolve** submission does. If you asked to control each step, the assistant should not submit an action merely because it discussed one.

## 4. How the investigation rules work

- The engine has a fixed fictional case and predefined records. It does not invent new evidence to support a preferred theory.
- An **inspect** action reveals one permitted record. Some records unlock only after earlier evidence is inspected.
- An external hypothesis may cite only evidence already revealed before that submission.
- **Resolve** requires at least two inspected records and citations to at least two inspected records. The opening briefing does not count toward that minimum.
- Each run permits **five accepted decisions total**, including resolution.
- If the fifth accepted decision is another inspection, the run ends **exhausted** and withholds the authored resolution. Reserve a decision for resolve if that is your goal.
- Rejected invalid or stale submissions do not spend the budget. Retrying the identical accepted submission returns its original receipt rather than executing it twice.
- Permission to resolve does not mean a hypothesis is correct. The authored answer and the assistant's hypothesis remain distinct.

The Pattern Finder, Skeptic, Evidence Analyst, Alternatives Explorer, and Moderator are **perspectives from one assistant context**, not five independent medical experts. The builder knows the authored answer; this is not a blinded intelligence benchmark.

## 5. Pause, resume, and finish

### Pause

Say:

> Pause here. Tell me the run ID and how many decisions remain. Do not advance the case.

The workflow waits at a persisted checkpoint; there is no need to leave a browser tab playing. It is not autonomously investigating while you are away.

### Resume

Return to the same project conversation and say:

> Resume run [your run ID]. Check its actual saved status first, then show me the pending choices without starting over.

Resume needs the original database or a valid backup—not just the run ID. The implementation has been tested across process restarts, but workspace retention and arbitrary crash recovery are not guaranteed. If the saved state is unavailable or inconsistent, the assistant should explain that rather than silently create a replacement run.

### Finish and get a visual record

After resolution or exhaustion, say:

> Export this run's actual events and create its Case Room replay. Label it recorded, and keep hypotheses separate from authored evidence.

You should receive a replay based on **your run**, its outcome, and a run receipt. The old published replay does not automatically synchronize with the chat. Exporting/publishing creates a new or updated version that the assistant must identify.

## 6. What the labels mean

| Label | Meaning |
|---|---|
| **Recorded / replay** | You are exploring previously captured events; no fresh reasoning is occurring in the page |
| **Suspended / pending** | The real workflow is waiting for an external decision |
| **Decision accepted** | The submitted action passed protocol checks—not a declaration that its reasoning is true |
| **Evidence revealed** | A permitted authored record became available |
| **External hypothesis — not validated fact** | An assistant/operator interpretation, not a new observation or certified conclusion |
| **Resolved** | The run submitted a permitted resolution and can display the authored case reveal |
| **Exhausted** | The allowed decision budget was used without resolution; the authored answer remains withheld by the engine |
| **Workflow success** | The workflow completed execution; check the separate case outcome to distinguish resolved from exhausted |

## 7. When something looks wrong

| What you notice | What to do |
|---|---|
| “Play isn't generating new answers.” | Expected: it plays a recording. Use the live-start prompt in Hyperagent for fresh decisions. |
| “I can't ask a question in the 3D page.” | Expected: this version has no chat input or connection back to Astra. Ask in the project conversation. |
| “A new clue in chat hasn't appeared on the page.” | Ask the assistant to export and publish the latest run. The page is not live-synced. |
| “The hypothesis panel disappeared.” | It appears only on decision events and collapses when you change frames. Select a decision event and open it again. |
| “Some evidence disappeared when I rewound.” | Expected: the replay shows only evidence available at that recorded point. |
| “I can't see the resolution.” | Move to the last event. Partial or exhausted exports may have no resolution. |
| “The room looks flat or 3D won't load.” | Use 2D view and the reading panel. Graphics/CDN failure should not prevent reading the recorded evidence. |
| “Nothing moves when I open the page.” | Playback is paused by default. Press Play or Next; reduced-motion settings can also suppress camera motion. |
| “The engine reports stale input or recovery required.” | Ask the assistant to inspect the real run status. Do not keep resubmitting, invent a new version number, or reset the run without understanding the issue. |
| “The source checkout still looks like the old Dr. House app.” | Use the Case Room feature branch/PR while it is unmerged, and the `case-room` package—not the legacy root app. |

If reporting a problem, include the run ID, replay event number, control used, what you expected, and what happened. A screenshot helps. Do not include credentials or personal medical information.

## 8. What is and isn't shipped

**Included in the first milestone:** one fictional case; a real typed Mastra workflow; saved checkpoints; a Hyperagent-driven investigation; recorded Three.js replay; protocol/rendering tests; reusable helper scripts; and documentation.

**Not included:** a continuously live public AI game, automatic replay synchronization, new-story generation, real-patient diagnosis, treatment advice, independent medical experts, multiplayer, voice acting, or an always-on service.

No separate Astra API is required for this execution path. Hyperagent usage still applies. The replay itself makes no model calls.

As of this guide's addition, the implementation is in [pull request #1](https://github.com/Laksh-star/dr-house-in-house/pull/1), not merged into `master`. Automatic GitHub Actions testing is deferred; runnable tests and the local test report are included. A repository branch, an installed skill, a workflow database, and a published replay are different things—having one does not automatically create the others.

## 9. If you only remember three things

1. **Watch on the 3D page. Investigate live in the Hyperagent conversation.**
2. **Evidence is authored; hypotheses are interpretations. Acceptance is not proof.**
3. **Ask for a fresh run, a visible run ID, and a pause after each clue if you want to participate.**

---

For implementation details: [developer README](README.md) · [replay/export reference](replay/README.md) · [captured demonstration records](reports/live/README.md). The developer files may reveal the solution; read them after the spoiler-free experience.
