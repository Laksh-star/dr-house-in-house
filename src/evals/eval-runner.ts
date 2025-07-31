import { MedicalAccuracyEvaluator, MedicalAccuracyInput } from './medical-accuracy-eval';
import { medicalAccuracyTestCases, testCaseFileMapping, diagnosticFeatures } from './test-cases';

// Evaluation runner for testing the AI diagnostic workflow
// This script demonstrates how to use the Medical Accuracy Eval system

interface WorkflowResult {
  finalDiagnosis: {
    diagnosis: string;
    confidence: string;
    reasoning: string;
    treatment: string;
    prognosis: string;
    house_comment: string;
  };
  teamSummary: {
    consensus: boolean;
    primaryDiagnosis: string;
    alternativeDiagnoses: string[];
    recommendedActions: string[];
  };
}

export class EvaluationRunner {
  private evaluator: MedicalAccuracyEvaluator;

  constructor() {
    this.evaluator = new MedicalAccuracyEvaluator();
  }

  /**
   * Runs evaluation on a single workflow result
   */
  async evaluateSingleCase(
    patientId: string, 
    workflowResult: WorkflowResult
  ): Promise<void> {
    // Find the test case for this patient
    const testCase = medicalAccuracyTestCases.find(tc => tc.patientId === patientId);
    if (!testCase) {
      throw new Error(`No test case found for patient ${patientId}`);
    }

    // Extract the AI diagnosis from workflow result
    const aiDiagnosis = workflowResult.finalDiagnosis.diagnosis || 
                       workflowResult.teamSummary.primaryDiagnosis || 
                       'No diagnosis provided';

    // Update test case with actual diagnosis
    const evaluationInput: MedicalAccuracyInput = {
      ...testCase,
      actualDiagnosis: aiDiagnosis,
    };

    // Run evaluation
    const result = await this.evaluator.evaluate(evaluationInput);

    // Display results
    console.log(`\n🏥 MEDICAL ACCURACY EVALUATION - ${patientId}`);
    console.log('='.repeat(60));
    console.log(`Expected: ${testCase.expectedDiagnosis}`);
    console.log(`AI Result: ${aiDiagnosis}`);
    console.log(`Accuracy Score: ${(result.accuracyScore * 100).toFixed(1)}%`);
    console.log(`Diagnosis Match: ${result.diagnosisMatch ? '✅ Yes' : '❌ No'}`);
    console.log(`Critical Miss: ${result.criticalMiss ? '🚨 YES' : '✅ No'}`);
    console.log(`Partial Credit: ${(result.partialCredit * 100).toFixed(1)}%`);
    
    console.log('\n📊 DETAILED SCORES:');
    console.log(`  Primary Diagnosis: ${(result.evaluationDetails.primaryDiagnosisAccuracy * 100).toFixed(1)}%`);
    console.log(`  Differential Consideration: ${(result.evaluationDetails.differentialConsideration * 100).toFixed(1)}%`);
    console.log(`  Risk Assessment: ${(result.evaluationDetails.riskAssessment * 100).toFixed(1)}%`);
    console.log(`  Treatment Alignment: ${(result.evaluationDetails.treatmentAlignment * 100).toFixed(1)}%`);

    console.log(`\n💭 REASONING:`);
    console.log(`  ${result.reasoning}`);

    if (result.suggestions.length > 0) {
      console.log(`\n💡 SUGGESTIONS FOR IMPROVEMENT:`);
      result.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
    }

    console.log('\n' + '-'.repeat(60));
  }

  /**
   * Runs batch evaluation on multiple workflow results
   */
  async evaluateBatch(
    results: Record<string, WorkflowResult>
  ): Promise<void> {
    console.log('\n🔬 BATCH MEDICAL ACCURACY EVALUATION');
    console.log('='.repeat(80));

    // Prepare evaluation inputs
    const evaluationInputs: MedicalAccuracyInput[] = [];
    
    for (const [patientId, workflowResult] of Object.entries(results)) {
      const testCase = medicalAccuracyTestCases.find(tc => tc.patientId === patientId);
      if (testCase) {
        const aiDiagnosis = workflowResult.finalDiagnosis.diagnosis || 
                           workflowResult.teamSummary.primaryDiagnosis || 
                           'No diagnosis provided';
        
        evaluationInputs.push({
          ...testCase,
          actualDiagnosis: aiDiagnosis,
        });
      }
    }

    // Run batch evaluation
    const batchResult = await this.evaluator.evaluateBatch(evaluationInputs);

    // Display individual results
    for (const result of batchResult.individual) {
      const testCase = medicalAccuracyTestCases.find(tc => tc.patientId === result.patientId);
      console.log(`\n${result.patientId}: ${testCase?.expectedDiagnosis}`);
      console.log(`  Score: ${(result.accuracyScore * 100).toFixed(1)}% | Match: ${result.diagnosisMatch ? '✅' : '❌'} | Critical Miss: ${result.criticalMiss ? '🚨' : '✅'}`);
    }

    // Display summary
    console.log(`\n📈 BATCH EVALUATION SUMMARY`);
    console.log('='.repeat(50));
    console.log(`Overall Accuracy: ${(batchResult.summary.overallAccuracy * 100).toFixed(1)}%`);
    console.log(`Average Score: ${(batchResult.summary.averageScore * 100).toFixed(1)}%`);
    console.log(`Critical Misses: ${batchResult.summary.criticalMissCount}/${batchResult.individual.length}`);

    console.log(`\n📊 ACCURACY BY CATEGORY:`);
    for (const [category, score] of Object.entries(batchResult.summary.categoryBreakdown)) {
      console.log(`  ${category.toUpperCase()}: ${(score * 100).toFixed(1)}%`);
    }

    // Performance assessment
    console.log(`\n🎯 PERFORMANCE ASSESSMENT:`);
    if (batchResult.summary.averageScore >= 0.9) {
      console.log('  🏆 EXCELLENT - AI diagnostic performance is outstanding');
    } else if (batchResult.summary.averageScore >= 0.8) {
      console.log('  🥇 VERY GOOD - AI diagnostic performance is strong');
    } else if (batchResult.summary.averageScore >= 0.7) {
      console.log('  🥈 GOOD - AI diagnostic performance is acceptable');
    } else if (batchResult.summary.averageScore >= 0.6) {
      console.log('  🥉 FAIR - AI diagnostic performance needs improvement');
    } else {
      console.log('  ⚠️  POOR - AI diagnostic performance requires significant improvement');
    }

    if (batchResult.summary.criticalMissCount > 0) {
      console.log(`  🚨 WARNING: ${batchResult.summary.criticalMissCount} critical diagnostic miss(es) detected`);
      console.log('     This indicates potential patient safety concerns');
    }
  }

  /**
   * Demo evaluation with sample data
   */
  async runDemo(): Promise<void> {
    console.log('🧪 MEDICAL ACCURACY EVAL - DEMO MODE');
    console.log('='.repeat(50));

    // Simulate some workflow results for demonstration
    const demoResults: Record<string, WorkflowResult> = {
      'PATIENT-001': {
        finalDiagnosis: {
          diagnosis: 'Bacterial Meningitis',
          confidence: 'high',
          reasoning: 'Classic triad of fever, headache, and neck stiffness',
          treatment: 'Immediate antibiotics and supportive care',
          prognosis: 'Good with prompt treatment',
          house_comment: 'Sometimes the obvious answer is actually correct.',
        },
        teamSummary: {
          consensus: true,
          primaryDiagnosis: 'Bacterial Meningitis',
          alternativeDiagnoses: ['Viral meningitis', 'Subarachnoid hemorrhage'],
          recommendedActions: ['Lumbar puncture', 'Blood cultures', 'Immediate antibiotics'],
        },
      },
      'PATIENT-002': {
        finalDiagnosis: {
          diagnosis: 'Autoimmune condition - likely lupus',
          confidence: 'moderate',
          reasoning: 'Multiple system involvement with positive autoimmune markers',
          treatment: 'Immunosuppressive therapy',
          prognosis: 'Variable depending on organ involvement',
          house_comment: 'It\'s never lupus... except when it is.',
        },
        teamSummary: {
          consensus: false,
          primaryDiagnosis: 'Systemic Lupus Erythematosus',
          alternativeDiagnoses: ['Mixed connective tissue disease', 'Drug-induced lupus'],
          recommendedActions: ['ANA testing', 'Complement levels', 'Renal biopsy'],
        },
      },
    };

    await this.evaluateBatch(demoResults);
  }
}


// Demo runner - uncomment to run directly
// const runner = new EvaluationRunner();
// runner.runDemo().catch(console.error);