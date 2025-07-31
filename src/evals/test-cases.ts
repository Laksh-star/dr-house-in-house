import { MedicalAccuracyInput } from './medical-accuracy-eval';

// Test dataset with known correct diagnoses for evaluating the AI diagnostic workflow
// These cases map to the existing test cases in the project

export const medicalAccuracyTestCases: MedicalAccuracyInput[] = [
  {
    patientId: 'PATIENT-001',
    expectedDiagnosis: 'Bacterial Meningitis',
    actualDiagnosis: '', // To be filled by eval system
    severity: 'critical',
    specialty: ['Emergency Medicine', 'Infectious Disease', 'Neurology'],
    diagnosticCategory: 'infectious',
  },
  {
    patientId: 'PATIENT-002', 
    expectedDiagnosis: 'Systemic Lupus Erythematosus',
    actualDiagnosis: '', // To be filled by eval system
    severity: 'moderate',
    specialty: ['Rheumatology', 'Internal Medicine'],
    diagnosticCategory: 'autoimmune',
  },
  {
    patientId: 'PATIENT-003',
    expectedDiagnosis: 'ST-Elevation Myocardial Infarction',
    actualDiagnosis: '', // To be filled by eval system  
    severity: 'critical',
    specialty: ['Cardiology', 'Emergency Medicine'],
    diagnosticCategory: 'cardiac',
  },
  {
    patientId: 'PATIENT-004',
    expectedDiagnosis: 'Wilson\'s Disease',
    actualDiagnosis: '', // To be filled by eval system
    severity: 'high',
    specialty: ['Neurology', 'Hepatology', 'Genetics'],
    diagnosticCategory: 'metabolic',
  },
  {
    patientId: 'PATIENT-005',
    expectedDiagnosis: 'Lead Poisoning',
    actualDiagnosis: '', // To be filled by eval system
    severity: 'moderate',
    specialty: ['Toxicology', 'Occupational Medicine'],
    diagnosticCategory: 'other',
  },
  {
    patientId: 'PATIENT-006',
    expectedDiagnosis: 'Cryptococcal Meningitis',
    actualDiagnosis: '', // To be filled by eval system
    severity: 'critical',
    specialty: ['Infectious Disease', 'Neurology'],
    diagnosticCategory: 'infectious',
  },
];

// Mapping of patient IDs to their corresponding test case files
export const testCaseFileMapping: Record<string, string> = {
  'PATIENT-001': '01-meningitis-case.json',
  'PATIENT-002': '02-lupus-case.json', 
  'PATIENT-003': '03-heart-attack-case.json',
  'PATIENT-004': '04-mysterious-neurological.json',
  'PATIENT-005': '05-toxic-exposure.json',
  'PATIENT-006': '06-rare-infectious-disease.json',
};

// Expected diagnostic features for each case (for more detailed evaluation)
export const diagnosticFeatures: Record<string, {
  keySymptoms: string[];
  criticalFindings: string[];
  expectedTests: string[];
  treatmentUrgency: 'immediate' | 'urgent' | 'routine';
}> = {
  'PATIENT-001': {
    keySymptoms: ['severe headache', 'fever', 'neck stiffness', 'sensitivity to light'],
    criticalFindings: ['classic meningitis triad', 'photophobia'],
    expectedTests: ['lumbar puncture', 'blood cultures', 'ct head'],
    treatmentUrgency: 'immediate',
  },
  'PATIENT-002': {
    keySymptoms: ['joint pain', 'fatigue', 'butterfly rash', 'kidney involvement'],
    criticalFindings: ['malar rash', 'proteinuria', 'ana positive'],
    expectedTests: ['ana', 'anti-dsdna', 'complement levels', 'urinalysis'],
    treatmentUrgency: 'urgent',
  },
  'PATIENT-003': {
    keySymptoms: ['crushing chest pain', 'shortness of breath', 'sweating'],
    criticalFindings: ['st elevation', 'cardiac enzymes elevated'],
    expectedTests: ['ecg', 'cardiac enzymes', 'chest xray'],
    treatmentUrgency: 'immediate',
  },
  'PATIENT-004': {
    keySymptoms: ['tremor', 'dystonia', 'psychiatric symptoms', 'liver dysfunction'],
    criticalFindings: ['kayser-fleischer rings', 'low ceruloplasmin', 'copper accumulation'],
    expectedTests: ['serum ceruloplasmin', 'urinary copper', 'slit lamp exam', 'genetic testing'],
    treatmentUrgency: 'urgent',
  },
  'PATIENT-005': {
    keySymptoms: ['abdominal pain', 'anemia', 'cognitive impairment', 'occupational exposure'],
    criticalFindings: ['microcytic anemia', 'basophilic stippling', 'elevated lead level'],
    expectedTests: ['blood lead level', 'complete blood count', 'peripheral smear'],
    treatmentUrgency: 'urgent',
  },
  'PATIENT-006': {
    keySymptoms: ['headache', 'altered mental status', 'immunocompromised'],
    criticalFindings: ['fungal meningitis', 'cryptococcal antigen positive'],
    expectedTests: ['lumbar puncture', 'cryptococcal antigen', 'india ink stain'],
    treatmentUrgency: 'immediate',
  },
};