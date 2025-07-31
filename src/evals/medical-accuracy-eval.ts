import { z } from 'zod';

// Medical Accuracy Evaluation for AI Diagnostic Workflow
// Validates the accuracy of AI-generated medical diagnoses against known correct diagnoses

// Evaluation criteria schema
const medicalAccuracySchema = z.object({
  patientId: z.string(),
  expectedDiagnosis: z.string().describe('The correct/gold standard diagnosis'),
  actualDiagnosis: z.string().describe('The AI-generated diagnosis from workflow'),
  severity: z.enum(['low', 'moderate', 'high', 'critical']).describe('Case severity level'),
  specialty: z.array(z.string()).describe('Medical specialties involved'),
  diagnosticCategory: z.enum(['infectious', 'cardiac', 'neurological', 'autoimmune', 'oncological', 'traumatic', 'metabolic', 'other']),
});

// Evaluation result schema
const evaluationResultSchema = z.object({
  patientId: z.string(),
  accuracyScore: z.number().min(0).max(1).describe('Overall accuracy score (0-1)'),
  diagnosisMatch: z.boolean().describe('Whether primary diagnosis matches expected'),
  partialCredit: z.number().min(0).max(1).describe('Partial credit for related/differential diagnoses'),
  reasoning: z.string().describe('Explanation of evaluation scoring'),
  criticalMiss: z.boolean().describe('Whether this was a dangerous misdiagnosis'),
  suggestions: z.array(z.string()).describe('Suggestions for improvement'),
  evaluationDetails: z.object({
    primaryDiagnosisAccuracy: z.number(),
    differentialConsideration: z.number(),
    riskAssessment: z.number(),
    treatmentAlignment: z.number(),
  }),
});

export class MedicalAccuracyEvaluator {
  private synonymMap: Record<string, string[]> = {
    'bacterial meningitis': ['meningitis', 'acute bacterial meningitis', 'bacterial meningeal infection'],
    'systemic lupus erythematosus': ['lupus', 'sle', 'systemic lupus'],
    'myocardial infarction': ['heart attack', 'mi', 'acute mi', 'stemi', 'nstemi'],
    'wilsons disease': ['wilson disease', 'hepatolenticular degeneration'],
    'lead poisoning': ['lead toxicity', 'heavy metal poisoning', 'lead intoxication'],
    'pneumonia': ['community acquired pneumonia', 'bacterial pneumonia', 'lung infection'],
  };

  private criticalDiagnoses: string[] = [
    'bacterial meningitis',
    'myocardial infarction',
    'stroke',
    'sepsis',
    'pulmonary embolism',
    'aortic dissection',
    'acute abdomen',
    'diabetic ketoacidosis',
  ];

  /**
   * Evaluates medical accuracy of AI diagnostic workflow output
   */
  async evaluate(input: z.infer<typeof medicalAccuracySchema>): Promise<z.infer<typeof evaluationResultSchema>> {
    const { patientId, expectedDiagnosis, actualDiagnosis, severity, specialty, diagnosticCategory } = input;

    // Normalize diagnoses for comparison
    const normalizedExpected = this.normalizeDiagnosis(expectedDiagnosis);
    const normalizedActual = this.normalizeDiagnosis(actualDiagnosis);

    // Check for exact or synonym match
    const exactMatch = normalizedExpected === normalizedActual;
    const synonymMatch = this.checkSynonymMatch(normalizedExpected, normalizedActual);
    const diagnosisMatch = exactMatch || synonymMatch;

    // Calculate partial credit for related diagnoses
    const partialCredit = this.calculatePartialCredit(normalizedExpected, normalizedActual, diagnosticCategory);

    // Check for critical misses
    const criticalMiss = this.isCriticalMiss(normalizedExpected, normalizedActual);

    // Calculate component scores
    const primaryDiagnosisAccuracy = diagnosisMatch ? 1.0 : partialCredit;
    const differentialConsideration = this.evaluateDifferentialConsideration(normalizedExpected, normalizedActual);
    const riskAssessment = this.evaluateRiskAssessment(severity, criticalMiss);
    const treatmentAlignment = this.evaluateTreatmentAlignment(normalizedExpected, normalizedActual);

    // Calculate overall accuracy score
    const accuracyScore = this.calculateOverallScore(
      primaryDiagnosisAccuracy,
      differentialConsideration,
      riskAssessment,
      treatmentAlignment,
      criticalMiss
    );

    // Generate reasoning and suggestions
    const reasoning = this.generateReasoning(
      diagnosisMatch,
      partialCredit,
      criticalMiss,
      normalizedExpected,
      normalizedActual
    );

    const suggestions = this.generateSuggestions(
      diagnosisMatch,
      partialCredit,
      criticalMiss,
      diagnosticCategory,
      normalizedExpected,
      normalizedActual
    );

    return {
      patientId,
      accuracyScore,
      diagnosisMatch,
      partialCredit,
      reasoning,
      criticalMiss,
      suggestions,
      evaluationDetails: {
        primaryDiagnosisAccuracy,
        differentialConsideration,
        riskAssessment,
        treatmentAlignment,
      },
    };
  }

  private normalizeDiagnosis(diagnosis: string): string {
    return diagnosis.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  private checkSynonymMatch(expected: string, actual: string): boolean {
    for (const [canonical, synonyms] of Object.entries(this.synonymMap)) {
      const allTerms = [canonical, ...synonyms];
      const expectedInTerms = allTerms.some(term => expected.includes(term) || term.includes(expected));
      const actualInTerms = allTerms.some(term => actual.includes(term) || term.includes(actual));
      
      if (expectedInTerms && actualInTerms) {
        return true;
      }
    }
    return false;
  }

  private calculatePartialCredit(expected: string, actual: string, category: string): number {
    // Same category bonus
    if (this.isSameCategory(expected, actual, category)) {
      return 0.3;
    }

    // Related condition bonus
    if (this.isRelatedCondition(expected, actual)) {
      return 0.5;
    }

    // System involvement bonus
    if (this.sharesMedicalSystem(expected, actual)) {
      return 0.2;
    }

    return 0.0;
  }

  private isSameCategory(expected: string, actual: string, category: string): boolean {
    const categoryKeywords: Record<string, string[]> = {
      infectious: ['infection', 'bacterial', 'viral', 'fungal', 'sepsis', 'meningitis', 'pneumonia'],
      cardiac: ['heart', 'cardiac', 'myocardial', 'coronary', 'arrhythmia', 'valve'],
      neurological: ['brain', 'neuro', 'seizure', 'stroke', 'headache', 'migraine'],
      autoimmune: ['lupus', 'rheumatoid', 'autoimmune', 'inflammatory', 'vasculitis'],
      oncological: ['cancer', 'tumor', 'malignant', 'neoplasm', 'metastatic'],
      traumatic: ['fracture', 'trauma', 'injury', 'contusion', 'laceration'],
    };

    const keywords = categoryKeywords[category] || [];
    const expectedHasKeyword = keywords.some(keyword => expected.includes(keyword));
    const actualHasKeyword = keywords.some(keyword => actual.includes(keyword));

    return expectedHasKeyword && actualHasKeyword;
  }

  private isRelatedCondition(expected: string, actual: string): boolean {
    const relationMap: Record<string, string[]> = {
      'meningitis': ['encephalitis', 'brain infection', 'intracranial infection'],
      'lupus': ['autoimmune disease', 'connective tissue disorder', 'vasculitis'],
      'heart attack': ['cardiac event', 'coronary syndrome', 'chest pain'],
      'pneumonia': ['lung infection', 'respiratory infection', 'bronchitis'],
    };

    for (const [condition, related] of Object.entries(relationMap)) {
      if (expected.includes(condition) && related.some(rel => actual.includes(rel))) {
        return true;
      }
      if (actual.includes(condition) && related.some(rel => expected.includes(rel))) {
        return true;
      }
    }

    return false;
  }

  private sharesMedicalSystem(expected: string, actual: string): boolean {
    const systemKeywords = {
      cardiovascular: ['heart', 'cardiac', 'vascular', 'blood'],
      respiratory: ['lung', 'pulmonary', 'respiratory', 'breathing'],
      neurological: ['brain', 'neuro', 'nervous', 'cognitive'],
      gastrointestinal: ['stomach', 'intestinal', 'digestive', 'bowel'],
      renal: ['kidney', 'renal', 'urinary'],
    };

    for (const keywords of Object.values(systemKeywords)) {
      const expectedInSystem = keywords.some(keyword => expected.includes(keyword));
      const actualInSystem = keywords.some(keyword => actual.includes(keyword));
      
      if (expectedInSystem && actualInSystem) {
        return true;
      }
    }

    return false;
  }

  private isCriticalMiss(expected: string, actual: string): boolean {
    const isCriticalExpected = this.criticalDiagnoses.some(critical => 
      expected.includes(critical.toLowerCase())
    );
    
    if (isCriticalExpected) {
      const isCorrectlyIdentified = this.criticalDiagnoses.some(critical =>
        actual.includes(critical.toLowerCase())
      );
      return !isCorrectlyIdentified;
    }

    return false;
  }

  private evaluateDifferentialConsideration(expected: string, actual: string): number {
    // This would ideally check if the expected diagnosis was mentioned in differentials
    // For now, we'll give partial credit based on category similarity
    if (this.isRelatedCondition(expected, actual)) {
      return 0.7;
    }
    if (this.sharesMedicalSystem(expected, actual)) {
      return 0.5;
    }
    return 0.3;
  }

  private evaluateRiskAssessment(severity: string, criticalMiss: boolean): number {
    if (criticalMiss) {
      return 0.0; // Critical miss = complete failure in risk assessment
    }
    
    // Score based on appropriate urgency recognition
    switch (severity) {
      case 'critical':
        return 0.9; // High score if appropriately identified as critical
      case 'high':
        return 0.8;
      case 'moderate':
        return 0.7;
      case 'low':
        return 0.6;
      default:
        return 0.5;
    }
  }

  private evaluateTreatmentAlignment(expected: string, actual: string): number {
    // Simplified treatment alignment based on diagnostic category
    if (this.sharesMedicalSystem(expected, actual)) {
      return 0.8; // Similar treatments likely
    }
    if (this.isRelatedCondition(expected, actual)) {
      return 0.6; // Some treatment overlap
    }
    return 0.4; // Different treatment approaches
  }

  private calculateOverallScore(
    primaryAccuracy: number,
    differential: number,
    risk: number,
    treatment: number,
    criticalMiss: boolean
  ): number {
    if (criticalMiss) {
      return Math.min(0.3, primaryAccuracy); // Cap score for critical misses
    }

    // Weighted average with emphasis on primary diagnosis
    const weights = {
      primary: 0.5,
      differential: 0.2,
      risk: 0.2,
      treatment: 0.1,
    };

    return (
      primaryAccuracy * weights.primary +
      differential * weights.differential +
      risk * weights.risk +
      treatment * weights.treatment
    );
  }

  private generateReasoning(
    diagnosisMatch: boolean,
    partialCredit: number,
    criticalMiss: boolean,
    expected: string,
    actual: string
  ): string {
    if (criticalMiss) {
      return `Critical diagnostic miss: Expected '${expected}' but got '${actual}'. This represents a potentially dangerous misdiagnosis that could lead to delayed treatment of a time-sensitive condition.`;
    }

    if (diagnosisMatch) {
      return `Accurate diagnosis: AI correctly identified '${expected}' as '${actual}'. This demonstrates proper pattern recognition and diagnostic reasoning.`;
    }

    if (partialCredit > 0.5) {
      return `Partially accurate: AI identified '${actual}' instead of '${expected}'. While not exact, this shows reasonable diagnostic thinking in the correct medical domain.`;
    }

    if (partialCredit > 0.2) {
      return `Related diagnosis: AI identified '${actual}' instead of '${expected}'. Some overlap in medical systems suggests partial understanding but needs improvement.`;
    }

    return `Inaccurate diagnosis: AI identified '${actual}' instead of '${expected}'. This represents a significant diagnostic error requiring review of symptom analysis and differential reasoning.`;
  }

  private generateSuggestions(
    diagnosisMatch: boolean,
    partialCredit: number,
    criticalMiss: boolean,
    category: string,
    expected: string,
    actual: string
  ): string[] {
    const suggestions: string[] = [];

    if (criticalMiss) {
      suggestions.push('Improve recognition of critical/emergent conditions');
      suggestions.push('Enhance red flag detection in symptom analysis');
      suggestions.push('Review time-sensitive diagnosis protocols');
    }

    if (!diagnosisMatch && partialCredit < 0.5) {
      suggestions.push(`Improve diagnostic accuracy for ${category} conditions`);
      suggestions.push('Review differential diagnosis reasoning');
      suggestions.push('Enhance pattern recognition for similar symptom clusters');
    }

    if (expected.includes('meningitis') && !actual.includes('meningitis')) {
      suggestions.push('Improve recognition of classic meningitis triad (fever, headache, neck stiffness)');
    }

    if (expected.includes('lupus') && !actual.includes('lupus')) {
      suggestions.push('Enhance autoimmune condition recognition and ANA correlation');
    }

    if (expected.includes('heart') && !actual.includes('heart')) {
      suggestions.push('Improve cardiac risk factor assessment and ECG interpretation');
    }

    if (suggestions.length === 0) {
      suggestions.push('Continue monitoring diagnostic performance');
      suggestions.push('Maintain current diagnostic accuracy standards');
    }

    return suggestions;
  }

  /**
   * Batch evaluation for multiple cases
   */
  async evaluateBatch(cases: z.infer<typeof medicalAccuracySchema>[]): Promise<{
    individual: z.infer<typeof evaluationResultSchema>[];
    summary: {
      overallAccuracy: number;
      criticalMissCount: number;
      averageScore: number;
      categoryBreakdown: Record<string, number>;
    };
  }> {
    const individual = await Promise.all(cases.map(case_ => this.evaluate(case_)));
    
    const overallAccuracy = individual.filter(result => result.diagnosisMatch).length / individual.length;
    const criticalMissCount = individual.filter(result => result.criticalMiss).length;
    const averageScore = individual.reduce((sum, result) => sum + result.accuracyScore, 0) / individual.length;
    
    const categoryBreakdown: Record<string, number> = {};
    for (const case_ of cases) {
      const result = individual.find(r => r.patientId === case_.patientId);
      if (result) {
        categoryBreakdown[case_.diagnosticCategory] = 
          (categoryBreakdown[case_.diagnosticCategory] || 0) + result.accuracyScore;
      }
    }

    // Average category scores
    for (const category in categoryBreakdown) {
      const categoryCount = cases.filter(c => c.diagnosticCategory === category).length;
      categoryBreakdown[category] /= categoryCount;
    }

    return {
      individual,
      summary: {
        overallAccuracy,
        criticalMissCount,
        averageScore,
        categoryBreakdown,
      },
    };
  }
}

// Export types and schemas for external usage
export { medicalAccuracySchema, evaluationResultSchema };
export type MedicalAccuracyInput = z.infer<typeof medicalAccuracySchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;