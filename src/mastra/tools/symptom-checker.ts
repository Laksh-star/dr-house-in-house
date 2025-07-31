import { Tool } from '@mastra/core/tools';
import { z } from 'zod';

export const symptomChecker = new Tool({
  id: 'symptom-checker',
  description: 'Analyzes patient symptoms and suggests possible medical conditions based on symptom patterns and medical databases',
  inputSchema: z.object({
    symptoms: z.array(z.string()).describe('List of patient reported symptoms'),
    patientAge: z.number().optional().describe('Patient age in years'),
    patientSex: z.enum(['male', 'female', 'other']).optional().describe('Patient biological sex'),
    duration: z.string().optional().describe('Duration of symptoms (e.g., "3 days", "2 weeks", "chronic")'),
    severity: z.enum(['mild', 'moderate', 'severe']).optional().describe('Overall symptom severity'),
  }),
  outputSchema: z.object({
    possibleConditions: z.array(z.object({
      condition: z.string().describe('Medical condition name'),
      probability: z.enum(['high', 'medium', 'low']).describe('Likelihood based on symptoms'),
      matchingSymptoms: z.array(z.string()).describe('Which symptoms match this condition'),
      additionalTests: z.array(z.string()).describe('Recommended tests to confirm diagnosis'),
      reasoning: z.string().describe('Medical reasoning for considering this condition'),
    })),
    redFlags: z.array(z.string()).describe('Concerning symptoms that need immediate attention'),
    recommendedSpecialty: z.array(z.string()).describe('Medical specialties that should be consulted'),
  }),
  async execute({ symptoms, patientAge, patientSex, duration, severity }) {
    const possibleConditions = symptoms.map(symptom => {
      const lowerSymptom = symptom.toLowerCase();
      
      if (lowerSymptom.includes('fever') || lowerSymptom.includes('temperature')) {
        return {
          condition: 'Infectious Disease',
          probability: 'medium' as const,
          matchingSymptoms: [symptom],
          additionalTests: ['Complete Blood Count', 'Blood cultures', 'Inflammatory markers'],
          reasoning: 'Fever suggests possible bacterial or viral infection',
        };
      }
      
      if (lowerSymptom.includes('chest pain') || lowerSymptom.includes('heart')) {
        return {
          condition: 'Cardiac Event',
          probability: 'high' as const,
          matchingSymptoms: [symptom],
          additionalTests: ['ECG', 'Cardiac enzymes', 'Chest X-ray'],
          reasoning: 'Chest pain requires immediate cardiac evaluation',
        };
      }
      
      if (lowerSymptom.includes('headache') || lowerSymptom.includes('head pain')) {
        return {
          condition: 'Neurological Disorder',
          probability: 'medium' as const,
          matchingSymptoms: [symptom],
          additionalTests: ['CT scan', 'MRI', 'Neurological examination'],
          reasoning: 'Persistent headaches may indicate neurological issues',
        };
      }
      
      return {
        condition: 'General Medical Condition',
        probability: 'low' as const,
        matchingSymptoms: [symptom],
        additionalTests: ['Basic metabolic panel', 'Physical examination'],
        reasoning: 'Symptom requires further investigation',
      };
    });

    const redFlags = symptoms.filter(symptom => {
      const lower = symptom.toLowerCase();
      return lower.includes('chest pain') || 
             lower.includes('difficulty breathing') || 
             lower.includes('severe headache') ||
             lower.includes('loss of consciousness');
    });

    const specialties = ['Internal Medicine'];
    if (symptoms.some(s => s.toLowerCase().includes('chest'))) {
      specialties.push('Cardiology');
    }
    if (symptoms.some(s => s.toLowerCase().includes('head'))) {
      specialties.push('Neurology');
    }

    return {
      possibleConditions,
      redFlags,
      recommendedSpecialty: specialties,
    };
  },
});