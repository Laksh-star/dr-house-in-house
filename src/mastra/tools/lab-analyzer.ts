import { Tool } from '@mastra/core/tools';
import { z } from 'zod';

export const labAnalyzer = new Tool({
  id: 'lab-analyzer',
  description: 'Analyzes laboratory test results and provides clinical interpretation for diagnostic purposes',
  inputSchema: z.object({
    labResults: z.array(z.object({
      testName: z.string().describe('Name of the laboratory test'),
      value: z.union([z.number(), z.string()]).describe('Test result value'),
      unit: z.string().optional().describe('Unit of measurement'),
      referenceRange: z.string().optional().describe('Normal reference range'),
    })),
    patientAge: z.number().optional().describe('Patient age in years'),
    patientSex: z.enum(['male', 'female', 'other']).optional().describe('Patient biological sex'),
    clinicalContext: z.string().optional().describe('Clinical context or suspected conditions'),
  }),
  outputSchema: z.object({
    abnormalResults: z.array(z.object({
      testName: z.string(),
      value: z.union([z.number(), z.string()]),
      interpretation: z.enum(['critically_high', 'high', 'low', 'critically_low']),
      clinicalSignificance: z.string().describe('What this abnormal result might indicate'),
      urgency: z.enum(['immediate', 'urgent', 'routine']).describe('How quickly this needs attention'),
    })),
    suggestedDiagnoses: z.array(z.object({
      condition: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      supportingTests: z.array(z.string()),
      reasoning: z.string(),
    })),
    recommendedFollowUp: z.array(z.string()).describe('Additional tests or monitoring recommended'),
    criticalAlerts: z.array(z.string()).describe('Values requiring immediate medical attention'),
  }),
  async execute({ labResults, patientAge, patientSex, clinicalContext }) {
    const abnormalResults = labResults
      .filter(result => {
        if (typeof result.value === 'string') return false;
        
        const testName = result.testName.toLowerCase();
        const value = result.value as number;
        
        if (testName.includes('white blood cell') || testName.includes('wbc')) {
          return value < 4000 || value > 11000;
        }
        if (testName.includes('hemoglobin') || testName.includes('hgb')) {
          return value < 12 || value > 16;
        }
        if (testName.includes('glucose')) {
          return value < 70 || value > 140;
        }
        if (testName.includes('creatinine')) {
          return value > 1.2;
        }
        
        return false;
      })
      .map(result => {
        const testName = result.testName.toLowerCase();
        const value = result.value as number;
        
        let interpretation: 'critically_high' | 'high' | 'low' | 'critically_low' = 'high';
        let clinicalSignificance = '';
        let urgency: 'immediate' | 'urgent' | 'routine' = 'routine';
        
        if (testName.includes('white blood cell') || testName.includes('wbc')) {
          if (value < 4000) {
            interpretation = value < 2000 ? 'critically_low' : 'low';
            clinicalSignificance = 'Low white blood cell count may indicate immune suppression, bone marrow disorder, or severe infection';
            urgency = value < 2000 ? 'immediate' : 'urgent';
          } else {
            interpretation = value > 20000 ? 'critically_high' : 'high';
            clinicalSignificance = 'Elevated white blood cell count suggests infection, inflammation, or hematologic malignancy';
            urgency = value > 20000 ? 'immediate' : 'urgent';
          }
        }
        
        if (testName.includes('glucose')) {
          if (value < 70) {
            interpretation = value < 54 ? 'critically_low' : 'low';
            clinicalSignificance = 'Low blood glucose may cause confusion, seizures, or loss of consciousness';
            urgency = value < 54 ? 'immediate' : 'urgent';
          } else {
            interpretation = value > 400 ? 'critically_high' : 'high';
            clinicalSignificance = 'High blood glucose indicates diabetes or diabetic emergency';
            urgency = value > 400 ? 'immediate' : 'routine';
          }
        }
        
        return {
          testName: result.testName,
          value: result.value,
          interpretation,
          clinicalSignificance,
          urgency,
        };
      });

    const suggestedDiagnoses = [];
    const hasHighWBC = abnormalResults.some(r => r.testName.toLowerCase().includes('wbc') && r.interpretation.includes('high'));
    const hasHighGlucose = abnormalResults.some(r => r.testName.toLowerCase().includes('glucose') && r.interpretation.includes('high'));
    
    if (hasHighWBC) {
      suggestedDiagnoses.push({
        condition: 'Bacterial Infection',
        confidence: 'medium' as const,
        supportingTests: ['Blood cultures', 'Inflammatory markers'],
        reasoning: 'Elevated white blood cell count commonly indicates bacterial infection',
      });
    }
    
    if (hasHighGlucose) {
      suggestedDiagnoses.push({
        condition: 'Diabetes Mellitus',
        confidence: 'high' as const,
        supportingTests: ['HbA1c', 'Oral glucose tolerance test'],
        reasoning: 'Elevated glucose levels are diagnostic for diabetes',
      });
    }

    const criticalAlerts = abnormalResults
      .filter(result => result.urgency === 'immediate')
      .map(result => `CRITICAL: ${result.testName} is ${result.interpretation} - ${result.clinicalSignificance}`);

    const recommendedFollowUp = [
      'Repeat abnormal tests to confirm results',
      'Clinical correlation with patient symptoms',
      'Consider specialist consultation if indicated',
    ];

    return {
      abnormalResults,
      suggestedDiagnoses,
      recommendedFollowUp,
      criticalAlerts,
    };
  },
});