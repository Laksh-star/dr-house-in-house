import { type LanguageModel } from '@mastra/core/llm';
import { MastraAgentJudge } from '@mastra/evals/judge';
import { ContentSimilarityMetric } from '@mastra/evals/nlp';
import { z } from 'zod';
import { MedicalAccuracyEvaluator, MedicalAccuracyInput } from './medical-accuracy-eval';
import { medicalAccuracyTestCases } from './test-cases';

// Mastra-compatible Medical Accuracy Evaluation
// Integrates our standalone evaluation system with Mastra's eval framework

export const MEDICAL_ACCURACY_INSTRUCTIONS = `You are a medical evaluation expert that assesses the accuracy of AI diagnostic outputs against known correct diagnoses. You evaluate diagnostic reasoning, critical miss detection, and provide detailed medical accuracy scoring.`;

export const generateMedicalAccuracyPrompt = ({ 
  input, 
  output 
}: { 
  input: string; 
  output: string; 
}) => `
Evaluate this medical diagnostic output for accuracy:

PATIENT CASE INPUT:
${input}

AI DIAGNOSTIC OUTPUT:
${output}

Assess the diagnostic accuracy, identify any critical misses, and provide a comprehensive medical evaluation score with reasoning.
`;

// Medical Accuracy Judge for Mastra's eval system
export class MedicalAccuracyJudge extends MastraAgentJudge {
  private evaluator: MedicalAccuracyEvaluator;

  constructor(model: LanguageModel) {
    super('Medical Accuracy Judge', MEDICAL_ACCURACY_INSTRUCTIONS, model);
    this.evaluator = new MedicalAccuracyEvaluator();
  }

  async evaluate(input: string, output: string): Promise<{
    accuracyScore: number;
    diagnosisMatch: boolean;
    criticalMiss: boolean;
    reasoning: string;
    suggestions: string[];
    category: string;
  }> {
    // Try to match input to known test cases
    const testCase = this.findMatchingTestCase(input);
    
    if (testCase) {
      // Use our medical accuracy evaluator for known cases
      const evaluation = await this.evaluator.evaluate({
        ...testCase,
        actualDiagnosis: this.extractDiagnosis(output),
      });

      return {
        accuracyScore: evaluation.accuracyScore,
        diagnosisMatch: evaluation.diagnosisMatch,
        criticalMiss: evaluation.criticalMiss,
        reasoning: evaluation.reasoning,
        suggestions: evaluation.suggestions,
        category: testCase.diagnosticCategory,
      };
    } else {
      // Fall back to LLM-based evaluation for unknown cases
      const prompt = generateMedicalAccuracyPrompt({ input, output });
      const result = await this.agent.generate(prompt, {
        output: z.object({
          accuracyScore: z.number().min(0).max(1),
          diagnosisMatch: z.boolean(),
          criticalMiss: z.boolean(),
          reasoning: z.string(),
          suggestions: z.array(z.string()),
          category: z.string(),
        }),
      });

      return result.object;
    }
  }

  private findMatchingTestCase(input: string): MedicalAccuracyInput | null {
    // Simple matching based on key symptoms or patient ID
    const inputLower = input.toLowerCase();
    
    for (const testCase of medicalAccuracyTestCases) {
      // Match by patient ID if present
      if (inputLower.includes(testCase.patientId.toLowerCase())) {
        return testCase;
      }
      
      // Match by key symptoms for the expected diagnosis
      const expectedLower = testCase.expectedDiagnosis.toLowerCase();
      if (expectedLower.includes('meningitis') && 
          inputLower.includes('headache') && 
          inputLower.includes('fever') && 
          inputLower.includes('neck stiffness')) {
        return testCase;
      }
      
      if (expectedLower.includes('lupus') && 
          inputLower.includes('joint pain') && 
          inputLower.includes('rash')) {
        return testCase;
      }
      
      if (expectedLower.includes('myocardial') && 
          inputLower.includes('chest pain')) {
        return testCase;
      }
      
      if (expectedLower.includes('wilson') && 
          inputLower.includes('tremor') && 
          inputLower.includes('liver')) {
        return testCase;
      }
    }
    
    return null;
  }

  private extractDiagnosis(output: string): string {
    // Extract diagnosis from various output formats
    const outputLower = output.toLowerCase();
    
    // Try to parse JSON output first
    try {
      const parsed = JSON.parse(output);
      if (parsed.finalDiagnosis?.diagnosis) {
        return parsed.finalDiagnosis.diagnosis;
      }
      if (parsed.teamSummary?.primaryDiagnosis) {
        return parsed.teamSummary.primaryDiagnosis;
      }
      if (parsed.diagnosis) {
        return parsed.diagnosis;
      }
    } catch {
      // Not JSON, continue with text parsing
    }
    
    // Look for diagnosis patterns in text
    const diagnosisPatterns = [
      /(?:final |primary )?diagnosis:?\s*([^\n\r.]+)/i,
      /(?:the patient has|diagnosed with|condition is):?\s*([^\n\r.]+)/i,
      /(?:most likely|probable) diagnosis:?\s*([^\n\r.]+)/i,
    ];
    
    for (const pattern of diagnosisPatterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback: return first few words if no pattern matches
    const words = output.trim().split(/\s+/);
    return words.slice(0, 10).join(' ');
  }
}

// Medical Accuracy Metric for Mastra's eval system
export class MedicalAccuracyMetric {
  private judge: MedicalAccuracyJudge;

  constructor(model: LanguageModel) {
    this.judge = new MedicalAccuracyJudge(model);
  }

  async measure(input: string, output: string): Promise<{
    score: number;
    details: {
      accuracyScore: number;
      diagnosisMatch: boolean;
      criticalMiss: boolean;
      reasoning: string;
      suggestions: string[];
      category: string;
    };
  }> {
    const evaluation = await this.judge.evaluate(input, output);
    
    return {
      score: evaluation.accuracyScore, // Normalized 0-1 score for Mastra
      details: evaluation,
    };
  }
}

