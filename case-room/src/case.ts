export const MAX_DECISIONS = 5;
export const caseInfo = {
  id: 'night-shift', title: 'The Night Shift',
  subtitle: 'An authored fictional archive mystery: fatigue, food, or air?',
  disclaimer: 'Fictional investigation exercise only. Not a real medical case, diagnosis, clinical evaluation, or treatment advice. The builder knows the fixed answer; this is not a blinded reasoning benchmark.',
};
export type Evidence = { id: string; title: string; kind: string; summary: string; stage: number };
export const evidence: Evidence[] = [
  { id: 'opening', title: 'Three accounts at the archive', kind: 'briefing', stage: 0, summary: 'In this fictional story, archivists Mara, Leon, and Priya report headache and nausea during the same overnight cataloguing shift. The opening possibilities are fatigue, food, and something about the archive air. No cause has been established.' },
  { id: 'shift-log', title: 'Shift and rest log', kind: 'record', stage: 1, summary: 'Mara and Leon worked extra hours; Priya began after a full day off. Their accounts place the onset in the same basement archive room, despite different sleep schedules.' },
  { id: 'meal-log', title: 'Break-room meal log', kind: 'record', stage: 1, summary: 'Mara and Leon shared a takeaway meal. Priya ate a meal from home and did not share their food. A day-shift colleague ate the same takeaway leftovers but reported no problem in this story.' },
  { id: 'room-timeline', title: 'Room-by-room timeline', kind: 'timeline', stage: 1, summary: 'All three accounts describe feeling worse after working in the basement and better while sorting boxes outside. Those changes line up with location rather than a shared meal or length of shift.' },
  { id: 'facilities-log', title: 'Facilities service log', kind: 'record', stage: 2, summary: 'The archive heating system was restarted at 22:10. A pending work order mentions an intermittently sticking exhaust damper. The basement work period began shortly after the restart.' },
  { id: 'maintenance-report', title: 'Sealed maintenance report', kind: 'inspection', stage: 2, summary: 'A fictional facilities inspection records a stuck heating-system exhaust damper and a failed exhaust connection adjoining the basement. The report attributes the room incident to that equipment fault, not to the meals.' },
  { id: 'day-shift-log', title: 'Day-shift comparison', kind: 'record', stage: 1, summary: 'The day shift used the same boxes and workstations with the heating system off. Their incident log contains no similar reports. This is a story clue, not a clinical control group.' },
];
export const resolution = {
  title: 'Authored reveal: the heating-system fault',
  summary: 'The fixed fictional answer is the air hypothesis: a faulty archive heating system with a stuck damper and failed exhaust connection. The differing meals and rest histories are distractors; the shared room and heating timeline are the intended connecting clues. This reveal makes no real-world medical diagnosis.',
};
export function availableEvidence(revealed: string[]): string[] {
  return evidence.filter(e => !revealed.includes(e.id) && (e.stage < 2 || revealed.includes('room-timeline'))).map(e => e.id);
}
