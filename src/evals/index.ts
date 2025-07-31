// Medical Accuracy Evaluation System for Dr. House AI Diagnostic Workflow
// 
// This evaluation system validates the accuracy of AI-generated medical diagnoses
// without affecting the existing workflow, agents, or tools.

export { MedicalAccuracyEvaluator, medicalAccuracySchema, evaluationResultSchema } from './medical-accuracy-eval';
export type { MedicalAccuracyInput, EvaluationResult } from './medical-accuracy-eval';

export { EvaluationRunner } from './eval-runner';
export { medicalAccuracyTestCases, testCaseFileMapping, diagnosticFeatures } from './test-cases';

// Mastra integration exports
export { MedicalAccuracyMetric, MedicalAccuracyJudge } from './mastra-integration';

// Quick start usage example:
//
// import { MedicalAccuracyEvaluator, EvaluationRunner } from './src/evals';
//
// const evaluator = new MedicalAccuracyEvaluator();
// const runner = new EvaluationRunner();
//
// // Single case evaluation
// await runner.evaluateSingleCase('PATIENT-001', workflowResult);
//
// // Batch evaluation  
// await runner.evaluateBatch(allWorkflowResults);
//
// // Demo mode
// await runner.runDemo();