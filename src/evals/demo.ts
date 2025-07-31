import { EvaluationRunner } from './eval-runner';

// Demo script for the Medical Accuracy Evaluation system
async function runDemo() {
  const runner = new EvaluationRunner();
  await runner.runDemo();
}

runDemo().catch(console.error);