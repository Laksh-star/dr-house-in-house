import { Tool } from '@mastra/core/tools';
import { z } from 'zod';

export const imagingInterpreter = new Tool({
  id: 'imaging-interpreter',
  description: 'Interprets medical imaging studies including X-rays, CT scans, MRIs, and ultrasounds for diagnostic purposes',
  inputSchema: z.object({
    imagingType: z.enum(['xray', 'ct', 'mri', 'ultrasound', 'pet', 'mammography']).describe('Type of imaging study'),
    bodyRegion: z.string().describe('Anatomical region imaged (e.g., chest, abdomen, brain, heart)'),
    findings: z.array(z.string()).describe('Radiological findings described by radiologist'),
    clinicalHistory: z.string().optional().describe('Relevant clinical history and symptoms'),
    contrast: z.boolean().optional().describe('Whether contrast was used'),
    urgency: z.enum(['routine', 'urgent', 'stat']).optional().describe('Study urgency level'),
  }),
  outputSchema: z.object({
    primaryFindings: z.array(z.object({
      finding: z.string().describe('Main radiological finding'),
      location: z.string().describe('Anatomical location'),
      severity: z.enum(['mild', 'moderate', 'severe']).describe('Severity assessment'),
      clinicalRelevance: z.string().describe('Clinical significance of this finding'),
    })),
    possibleDiagnoses: z.array(z.object({
      diagnosis: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      supportingFindings: z.array(z.string()),
      differentials: z.array(z.string()).describe('Alternative diagnoses to consider'),
    })),
    recommendedActions: z.array(z.string()).describe('Next steps based on imaging results'),
    criticalFindings: z.array(z.string()).describe('Findings requiring immediate attention'),
    followUpImaging: z.array(z.string()).describe('Additional imaging studies recommended'),
  }),
  async execute({ imagingType, bodyRegion, findings, clinicalHistory, contrast, urgency }) {
    const primaryFindings = findings.map(finding => {
      const lowerFinding = finding.toLowerCase();
      let severity: 'mild' | 'moderate' | 'severe' = 'mild';
      let clinicalRelevance = '';
      
      if (lowerFinding.includes('mass') || lowerFinding.includes('tumor')) {
        severity = 'severe';
        clinicalRelevance = 'Mass lesion requires immediate evaluation for malignancy';
      } else if (lowerFinding.includes('fracture')) {
        severity = 'moderate';
        clinicalRelevance = 'Bone fracture requires orthopedic evaluation and treatment';
      } else if (lowerFinding.includes('pneumonia') || lowerFinding.includes('consolidation')) {
        severity = 'moderate';
        clinicalRelevance = 'Pulmonary consolidation suggests pneumonia requiring antibiotic treatment';
      } else if (lowerFinding.includes('normal') || lowerFinding.includes('unremarkable')) {
        severity = 'mild';
        clinicalRelevance = 'Normal finding helps rule out structural abnormalities';
      } else {
        clinicalRelevance = 'Finding requires clinical correlation and further evaluation';
      }
      
      return {
        finding: finding,
        location: bodyRegion,
        severity,
        clinicalRelevance,
      };
    });

    const possibleDiagnoses = [];
    const hasMass = findings.some(f => f.toLowerCase().includes('mass') || f.toLowerCase().includes('tumor'));
    const hasPneumonia = findings.some(f => f.toLowerCase().includes('pneumonia') || f.toLowerCase().includes('consolidation'));
    const hasFracture = findings.some(f => f.toLowerCase().includes('fracture'));
    
    if (hasMass) {
      possibleDiagnoses.push({
        diagnosis: 'Malignant Neoplasm',
        confidence: 'medium' as const,
        supportingFindings: findings.filter(f => f.toLowerCase().includes('mass')),
        differentials: ['Benign tumor', 'Inflammatory mass', 'Abscess'],
      });
    }
    
    if (hasPneumonia) {
      possibleDiagnoses.push({
        diagnosis: 'Community-Acquired Pneumonia',
        confidence: 'high' as const,
        supportingFindings: findings.filter(f => f.toLowerCase().includes('consolidation')),
        differentials: ['Atypical pneumonia', 'Pulmonary edema', 'Lung contusion'],
      });
    }
    
    if (hasFracture) {
      possibleDiagnoses.push({
        diagnosis: 'Traumatic Fracture',
        confidence: 'high' as const,
        supportingFindings: findings.filter(f => f.toLowerCase().includes('fracture')),
        differentials: ['Pathologic fracture', 'Stress fracture', 'Old healed fracture'],
      });
    }

    const criticalFindings = findings.filter(finding => {
      const lower = finding.toLowerCase();
      return lower.includes('hemorrhage') || 
             lower.includes('mass') || 
             lower.includes('pneumothorax') ||
             lower.includes('aortic dissection') ||
             lower.includes('pulmonary embolism');
    });

    const recommendedActions = [];
    if (hasMass) {
      recommendedActions.push('Urgent oncology consultation');
      recommendedActions.push('Tissue biopsy for histological diagnosis');
    }
    if (hasPneumonia) {
      recommendedActions.push('Start appropriate antibiotic therapy');
      recommendedActions.push('Monitor oxygen saturation and respiratory status');
    }
    if (criticalFindings.length > 0) {
      recommendedActions.push('Immediate clinical notification');
      recommendedActions.push('Consider emergency intervention');
    }
    
    if (recommendedActions.length === 0) {
      recommendedActions.push('Clinical correlation with symptoms');
      recommendedActions.push('Follow-up imaging if symptoms persist');
    }

    const followUpImaging = [];
    if (imagingType === 'xray' && hasMass) {
      followUpImaging.push('CT scan with contrast for better characterization');
    }
    if (imagingType === 'ct' && hasMass) {
      followUpImaging.push('MRI for soft tissue evaluation');
      followUpImaging.push('PET scan for metabolic activity assessment');
    }

    return {
      primaryFindings,
      possibleDiagnoses,
      recommendedActions,
      criticalFindings,
      followUpImaging,
    };
  },
});