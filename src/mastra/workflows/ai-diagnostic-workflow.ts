import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { symptomChecker } from '../tools/symptom-checker';
import { labAnalyzer } from '../tools/lab-analyzer';
import { imagingInterpreter } from '../tools/imaging-interpreter';

// Helper functions for parsing AI agent responses
function parseStructuredResponse(response: string): {
  diagnosis?: string;
  confidence?: string;
  recommendedTests?: string[];
  concerns?: string;
} {
  const result: any = {};
  
  const diagnosisMatch = response.match(/DIAGNOSIS:\s*(.+?)(?:\n|$)/i);
  if (diagnosisMatch) result.diagnosis = diagnosisMatch[1].trim();
  
  const confidenceMatch = response.match(/CONFIDENCE:\s*(.+?)(?:\n|$)/i);
  if (confidenceMatch) result.confidence = confidenceMatch[1].trim().toLowerCase();
  
  const testsMatch = response.match(/RECOMMENDED_TESTS:\s*(.+?)(?:\n|$)/i);
  if (testsMatch) {
    result.recommendedTests = testsMatch[1].split(',').map(test => test.trim());
  }
  
  const concernsMatch = response.match(/CONCERNS:\s*(.+?)(?:\n|$)/i);
  if (concernsMatch) result.concerns = concernsMatch[1].trim();
  
  return result;
}

function extractDiagnosis(response: string): string | null {
  const patterns = [
    /(?:diagnosis|condition|suspect|likely):?\s*([^\n\r.]+)/i,
    /(?:patient has|diagnosed with|appears to have):?\s*([^\n\r.]+)/i,
    /(?:most likely|probable):?\s*([^\n\r.]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractConfidence(response: string): string | null {
  const confidenceMatch = response.match(/(?:confidence|certain|sure):?\s*(high|moderate|low)/i);
  return confidenceMatch ? confidenceMatch[1].toLowerCase() : null;
}

function extractTests(response: string): string[] {
  const testPatterns = [
    /(?:recommend|suggest|order):?\s*([^\n\r.]+(?:test|scan|examination|study)[^\n\r.]*)/gi,
    /(?:need|require):?\s*([^\n\r.]+(?:MRI|CT|X-ray|blood|urine|LP|lumbar)[^\n\r.]*)/gi,
  ];
  
  const tests: string[] = [];
  for (const pattern of testPatterns) {
    const matches = response.match(pattern);
    if (matches) {
      tests.push(...matches.map(match => match.trim()));
    }
  }
  return tests.length > 0 ? tests : [];
}

function extractConcerns(response: string): string | null {
  const concernMatch = response.match(/(?:concern|worry|alert|warning):?\s*([^\n\r.]+)/i);
  return concernMatch ? concernMatch[1].trim() : null;
}

function extractPatientCare(response: string): string | null {
  const careMatch = response.match(/PATIENT_CARE:\s*(.+?)(?:\n|$)/i);
  if (careMatch) return careMatch[1].trim();
  
  const advocacyMatch = response.match(/(?:patient|care|support):?\s*([^\n\r.]{20,})/i);
  return advocacyMatch ? advocacyMatch[1].trim() : null;
}

function extractUncommonTests(response: string): string[] {
  const testsMatch = response.match(/UNCOMMON_TESTS:\s*(.+?)(?:\n|$)/i);
  if (testsMatch) {
    return testsMatch[1].split(',').map(test => test.trim());
  }
  
  const unconventionalPatterns = [
    /(?:exotic|rare|unusual|unconventional).*?(?:test|panel|screening)/gi,
    /(?:heavy metal|genetic|pathogen|toxin).*?(?:test|panel|screening)/gi,
  ];
  
  const tests: string[] = [];
  for (const pattern of unconventionalPatterns) {
    const matches = response.match(pattern);
    if (matches) {
      tests.push(...matches.map(match => match.trim()));
    }
  }
  return tests.length > 0 ? tests : [];
}

function extractSarcasm(response: string): string | null {
  const sarcasticMatch = response.match(/SARCASTIC_COMMENT:\s*(.+?)(?:\n|$)/i);
  if (sarcasticMatch) return sarcasticMatch[1].trim();
  
  // Look for House-like sarcastic patterns
  const sarcasticPatterns = [
    /brilliant.*?wrong/i,
    /congratulations.*?missed/i,
    /amazing.*?three.*?doctors/i,
    /['""].*?['""](?:\s*-\s*House)?/i,
  ];
  
  for (const pattern of sarcasticPatterns) {
    const match = response.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

// Synthesis functions for final diagnosis
function synthesizeFinalDiagnosis(inputData: any, wilsonResponse: string): any {
  // Determine the most likely diagnosis based on team consensus and House's analysis
  const diagnoses = [
    inputData.foremanAssessment.diagnosis,
    inputData.cameronAssessment.diagnosis,
    inputData.chaseAssessment.diagnosis,
    inputData.houseAnalysis.contrarian_diagnosis
  ];
  
  // House usually wins, but consider team consensus
  const primaryDiagnosis = inputData.houseAnalysis.contrarian_diagnosis;
  
  // Extract confidence from the strongest assessment
  const confidence = inputData.houseAnalysis.confidence || "moderate";
  
  // Create comprehensive reasoning
  const reasoning = `Based on comprehensive team analysis: ${inputData.foremanAssessment.diagnosis} (Foreman), ${inputData.cameronAssessment.diagnosis} (Cameron), ${inputData.chaseAssessment.diagnosis} (Chase). House's contrarian analysis: ${inputData.houseAnalysis.contrarian_diagnosis}. Final determination considers all perspectives with emphasis on differential diagnosis.`;
  
  return {
    diagnosis: primaryDiagnosis,
    confidence: confidence,
    reasoning: reasoning,
    treatment: generateTreatmentPlan(primaryDiagnosis),
    prognosis: generatePrognosis(primaryDiagnosis, confidence),
    house_comment: inputData.houseAnalysis.sarcastic_comment
  };
}

function calculateConsensus(inputData: any): boolean {
  const diagnoses = [
    inputData.foremanAssessment.diagnosis.toLowerCase(),
    inputData.cameronAssessment.diagnosis.toLowerCase(),
    inputData.chaseAssessment.diagnosis.toLowerCase()
  ];
  
  // Check if at least 2 out of 3 team members agree
  const consensusCount = diagnoses.filter(diag => 
    diagnoses.filter(d => d.includes(diag.split(' ')[0]) || diag.includes(d.split(' ')[0])).length >= 2
  ).length;
  
  return consensusCount >= 2;
}

function synthesizeRecommendedActions(inputData: any): string[] {
  const actions = new Set<string>();
  
  // Add tests from all team members
  if (inputData.foremanAssessment.recommendedTests) {
    inputData.foremanAssessment.recommendedTests.forEach((test: string) => actions.add(test));
  }
  if (inputData.cameronAssessment.recommendedTests) {
    inputData.cameronAssessment.recommendedTests.forEach((test: string) => actions.add(test));
  }
  if (inputData.houseAnalysis.unconventional_tests) {
    inputData.houseAnalysis.unconventional_tests.forEach((test: string) => actions.add(test));
  }
  
  // Add standard recommendations
  actions.add("Specialist consultation");
  actions.add("Close monitoring");
  
  return Array.from(actions).slice(0, 6); // Limit to 6 actions
}

function generateTreatmentPlan(diagnosis: string): string {
  const treatmentMap: Record<string, string> = {
    'meningitis': 'Immediate IV antibiotics (ceftriaxone), corticosteroids, supportive care',
    'lupus': 'Hydroxychloroquine, NSAIDs, corticosteroids for flares, immunosuppressive therapy',
    'myocardial': 'Immediate reperfusion therapy, antiplatelet agents, beta-blockers, ACE inhibitors',
    'wilson': 'Copper chelation therapy (D-penicillamine), zinc supplementation, liver monitoring',
    'lead': 'Chelation therapy, removal from exposure source, supportive care',
    'infection': 'Targeted antimicrobial therapy based on pathogen identification'
  };
  
  const diagnosisLower = diagnosis.toLowerCase();
  for (const [condition, treatment] of Object.entries(treatmentMap)) {
    if (diagnosisLower.includes(condition)) {
      return treatment;
    }
  }
  
  return 'Evidence-based treatment plan tailored to specific diagnosis and patient factors';
}

function generatePrognosis(diagnosis: string, confidence: string): string {
  const prognosisMap: Record<string, string> = {
    'meningitis': 'Good with immediate treatment; neurological sequelae possible if delayed',
    'lupus': 'Variable; good with proper management and patient compliance',
    'myocardial': 'Depends on extent of damage; improved with rapid intervention',
    'wilson': 'Excellent with early treatment; progressive without copper chelation',
    'lead': 'Good with chelation and removal from exposure source',
    'infection': 'Generally good with appropriate antimicrobial therapy'
  };
  
  const diagnosisLower = diagnosis.toLowerCase();
  for (const [condition, prognosis] of Object.entries(prognosisMap)) {
    if (diagnosisLower.includes(condition)) {
      return `${prognosis} (${confidence} confidence)`;
    }
  }
  
  return `Prognosis depends on specific condition characteristics and treatment response (${confidence} confidence)`;
}

// Patient case schema - same as existing workflows for consistency
const patientCaseSchema = z.object({
  patientId: z.string(),
  age: z.number(),
  sex: z.enum(['male', 'female', 'other']),
  chiefComplaint: z.string(),
  symptoms: z.array(z.string()),
  medicalHistory: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  labResults: z.array(z.object({
    testName: z.string(),
    value: z.union([z.number(), z.string()]),
    unit: z.string().optional(),
    referenceRange: z.string().optional(),
  })).optional(),
  imagingResults: z.array(z.object({
    imagingType: z.enum(['xray', 'ct', 'mri', 'ultrasound', 'pet', 'mammography']),
    bodyRegion: z.string(),
    findings: z.array(z.string()),
  })).optional(),
});

// Step 1: AI-Powered Symptom Analysis
const aiSymptomAnalysis = createStep({
  id: 'ai-symptom-analysis',
  description: 'Analyze patient symptoms using AI-powered symptom checker tool',
  inputSchema: patientCaseSchema,
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    // Use the actual symptom-checker tool
    const symptomCheckerResult = await symptomChecker.execute({
      symptoms: inputData.symptoms,
      patientAge: inputData.age,
      patientSex: inputData.sex,
      duration: "chronic", // default value
      severity: "moderate", // default value
    });

    return {
      patientData: inputData,
      symptomAnalysis: {
        aiAssessment: JSON.stringify(symptomCheckerResult.possibleConditions),
        riskLevel: "moderate", // simplified for now
        urgency: "urgent", // simplified for now
        suggestedSpecialties: symptomCheckerResult.recommendedSpecialty,
        redFlags: symptomCheckerResult.redFlags,
      }
    };
  },
});

// Step 2: Lab Results Analysis (if available)
const aiLabAnalysis = createStep({
  id: 'ai-lab-analysis',
  description: 'Analyze lab results using AI-powered lab analyzer tool',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    })
  }),
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    const { patientData } = inputData;
    
    if (!patientData.labResults || patientData.labResults.length === 0) {
      return {
        ...inputData,
        labAnalysis: {
          hasLabs: false,
        }
      };
    }

    // Use the actual lab-analyzer tool
    const labAnalyzerResult = await labAnalyzer.execute({
      labResults: patientData.labResults,
      patientAge: patientData.age,
      patientSex: patientData.sex,
      symptoms: patientData.symptoms,
    });

    return {
      ...inputData,
      labAnalysis: {
        hasLabs: true,
        aiInterpretation: JSON.stringify(labAnalyzerResult.suggestedDiagnoses),
        criticalValues: labAnalyzerResult.criticalAlerts,
        diagnosticClues: labAnalyzerResult.recommendedFollowUp,
      }
    };
  },
});

// Step 3: Imaging Analysis (if available)
const aiImagingAnalysis = createStep({
  id: 'ai-imaging-analysis',
  description: 'Analyze imaging results using AI-powered imaging interpreter tool',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    })
  }),
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    const { patientData } = inputData;
    
    if (!patientData.imagingResults || patientData.imagingResults.length === 0) {
      return {
        ...inputData,
        imagingAnalysis: {
          hasImaging: false,
        }
      };
    }

    // Use the actual imaging-interpreter tool
    const imagingResult = await imagingInterpreter.execute({
      imagingType: patientData.imagingResults[0].imagingType,
      bodyRegion: patientData.imagingResults[0].bodyRegion,
      findings: patientData.imagingResults[0].findings,
      clinicalHistory: inputData.symptomAnalysis.aiAssessment,
    });

    return {
      ...inputData,
      imagingAnalysis: {
        hasImaging: true,
        aiInterpretation: JSON.stringify(imagingResult.possibleDiagnoses),
        keyFindings: imagingResult.primaryFindings.map(f => f.finding),
        clinicalSignificance: JSON.stringify(imagingResult.recommendedActions),
      }
    };
  },
});

// Step 4: Foreman's Neurological Assessment
const foremanAssessment = createStep({
  id: 'foreman-assessment',
  description: 'Get neurological perspective from Dr. Foreman using AI agent',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    })
  }),
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    // Prepare comprehensive case summary for Foreman with structured prompt
    const caseContext = `
Patient: ${inputData.patientData.age}-year-old ${inputData.patientData.sex}
Chief Complaint: ${inputData.patientData.chiefComplaint}
Symptoms: ${inputData.patientData.symptoms.join(', ')}
Medical History: ${inputData.patientData.medicalHistory?.join(', ') || 'None'}
Medications: ${inputData.patientData.medications?.join(', ') || 'None'}

Symptom Analysis: ${inputData.symptomAnalysis.aiAssessment}
Risk Level: ${inputData.symptomAnalysis.riskLevel}
Red Flags: ${inputData.symptomAnalysis.redFlags.join(', ')}

${inputData.labAnalysis.hasLabs ? `Lab Analysis: ${inputData.labAnalysis.aiInterpretation}` : 'No lab results available'}
${inputData.imagingAnalysis.hasImaging ? `Imaging Analysis: ${inputData.imagingAnalysis.aiInterpretation}` : 'No imaging results available'}

As Dr. Foreman, provide your neurological assessment in this format:

DIAGNOSIS: [Your primary diagnosis]
CONFIDENCE: [high/moderate/low]
REASONING: [Your medical reasoning focusing on neurological aspects]
RECOMMENDED_TESTS: [List 2-3 specific tests you recommend]
CONCERNS: [Any specific neurological concerns]

Focus on evidence-based medicine and neurological differential diagnosis.
    `;

    // Call the actual Foreman agent
    const agent = mastra?.getAgent('foremanAgent');
    if (!agent) {
      throw new Error('Foreman agent not found');
    }
    
    const response = await agent.stream([
      {
        role: 'user',
        content: caseContext,
      },
    ]);

    let foremanResponse = '';
    for await (const chunk of response.textStream) {
      foremanResponse += chunk;
    }

    // Parse Foreman's structured response
    const parsedResponse = parseStructuredResponse(foremanResponse);
    
    return {
      ...inputData,
      foremanAssessment: {
        diagnosis: parsedResponse.diagnosis || extractDiagnosis(foremanResponse) || "Neurological condition requiring further evaluation",
        confidence: parsedResponse.confidence || extractConfidence(foremanResponse) || "moderate",
        reasoning: foremanResponse, // Full AI response
        neurologicalFocus: "Neurological differential diagnosis considerations",
        recommendedTests: parsedResponse.recommendedTests || extractTests(foremanResponse) || ["MRI brain", "Neurological examination"],
        concerns: parsedResponse.concerns || extractConcerns(foremanResponse) || "Requires neurological follow-up"
      }
    };
  },
});

// Step 5: Cameron's Immunological Assessment
const cameronAssessment = createStep({
  id: 'cameron-assessment',
  description: 'Get immunological perspective from Dr. Cameron using AI agent',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    })
  }),
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    }),
    cameronAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      immunologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      patientAdvocacy: z.string(),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    const caseContext = `
Patient: ${inputData.patientData.age}-year-old ${inputData.patientData.sex}
Chief Complaint: ${inputData.patientData.chiefComplaint}
Symptoms: ${inputData.patientData.symptoms.join(', ')}

Foreman's Assessment: ${inputData.foremanAssessment.diagnosis}

${inputData.labAnalysis.hasLabs ? `Lab Results: ${inputData.labAnalysis.aiInterpretation}` : 'No lab results available'}

As Dr. Cameron, provide your immunological assessment in this format:

DIAGNOSIS: [Your primary diagnosis]
CONFIDENCE: [high/moderate/low]
REASONING: [Your medical reasoning focusing on immunological aspects]
RECOMMENDED_TESTS: [List 2-3 specific tests you recommend]
PATIENT_CARE: [Your patient advocacy perspective]

Focus on autoimmune conditions, genetic factors, and compassionate patient care.
    `;

    const cameronAgent = mastra?.getAgent('cameronAgent');
    if (!cameronAgent) {
      throw new Error('Cameron agent not found');
    }
    
    const cameronStream = await cameronAgent.stream([
      {
        role: 'user',
        content: caseContext,
      },
    ]);

    let cameronResponse = '';
    for await (const chunk of cameronStream.textStream) {
      cameronResponse += chunk;
    }

    // Parse Cameron's structured response
    const parsedCameron = parseStructuredResponse(cameronResponse);
    
    return {
      ...inputData,
      cameronAssessment: {
        diagnosis: parsedCameron.diagnosis || extractDiagnosis(cameronResponse) || "Immunological condition requiring evaluation",
        confidence: parsedCameron.confidence || extractConfidence(cameronResponse) || "moderate",
        reasoning: cameronResponse,
        immunologicalFocus: "Autoimmune and genetic factor considerations",
        recommendedTests: parsedCameron.recommendedTests || extractTests(cameronResponse) || ["ANA panel", "Complement levels"],
        patientAdvocacy: extractPatientCare(cameronResponse) || "Focusing on patient comfort and quality of life"
      }
    };
  },
});

// Step 6: Chase's Surgical Assessment
const chaseAssessment = createStep({
  id: 'chase-assessment', 
  description: 'Get surgical perspective from Dr. Chase using AI agent',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    }),
    cameronAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      immunologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      patientAdvocacy: z.string(),
    })
  }),
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    }),
    cameronAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      immunologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      patientAdvocacy: z.string(),
    }),
    chaseAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      surgicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      proceduralConsiderations: z.string(),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    const caseContext = `
Patient: ${inputData.patientData.age}-year-old ${inputData.patientData.sex}
Chief Complaint: ${inputData.patientData.chiefComplaint}
Symptoms: ${inputData.patientData.symptoms.join(', ')}

Foreman's Assessment: ${inputData.foremanAssessment.diagnosis}
Cameron's Assessment: ${inputData.cameronAssessment.diagnosis}

${inputData.imagingAnalysis.hasImaging ? `Imaging Findings: ${inputData.imagingAnalysis.aiInterpretation}` : 'No imaging available'}

Please provide your surgical assessment focusing on procedural interventions, cardiac causes, and surgical considerations.
    `;

    const chaseAgent = mastra?.getAgent('chaseAgent');
    if (!chaseAgent) {
      throw new Error('Chase agent not found');
    }
    
    const chaseStream = await chaseAgent.stream([
      {
        role: 'user',
        content: caseContext,
      },
    ]);

    let chaseResponse = '';
    for await (const chunk of chaseStream.textStream) {
      chaseResponse += chunk;
    }

    return {
      ...inputData,
      chaseAssessment: {
        diagnosis: "Surgical assessment based on AI analysis",
        confidence: "moderate",
        reasoning: chaseResponse,
        surgicalFocus: "Surgical and cardiac differential considerations",
        recommendedTests: ["CT angiography", "Echocardiogram", "Surgical consultation"],
        proceduralConsiderations: "Evaluating need for procedural intervention"
      }
    };
  },
});

// Step 7: House's Contrarian Analysis
const houseContrarian = createStep({
  id: 'house-contrarian',
  description: 'Get House\'s contrarian perspective using AI agent',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    }),
    cameronAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      immunologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      patientAdvocacy: z.string(),
    }),
    chaseAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      surgicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      proceduralConsiderations: z.string(),
    })
  }),
  outputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    }),
    cameronAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      immunologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      patientAdvocacy: z.string(),
    }),
    chaseAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      surgicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      proceduralConsiderations: z.string(),
    }),
    houseAnalysis: z.object({
      contrarian_diagnosis: z.string(),
      reasoning: z.string(),
      challenges: z.array(z.string()),
      unconventional_tests: z.array(z.string()),
      sarcastic_comment: z.string(),
      confidence: z.string(),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    const teamConsensus = `
Team Assessments:
- Foreman (Neurological): ${inputData.foremanAssessment.diagnosis}
- Cameron (Immunological): ${inputData.cameronAssessment.diagnosis}  
- Chase (Surgical): ${inputData.chaseAssessment.diagnosis}

Patient Details:
Age: ${inputData.patientData.age}, Sex: ${inputData.patientData.sex}
Symptoms: ${inputData.patientData.symptoms.join(', ')}
Medical History: ${inputData.patientData.medicalHistory?.join(', ') || 'None'}

As Dr. House, challenge the team's assumptions in this format:

DIAGNOSIS: [Your contrarian diagnosis - what they're all missing]
CONFIDENCE: [high/moderate/low]
REASONING: [Why the team is wrong and what they missed]
UNCOMMON_TESTS: [List 2-3 unconventional tests you want]
SARCASTIC_COMMENT: [Your signature wit about the team's performance]

Look for zebras, not horses. What rare condition explains everything better?
    `;

    const houseAgent = mastra?.getAgent('houseAgent');
    if (!houseAgent) {
      throw new Error('House agent not found');
    }
    
    const houseStream = await houseAgent.stream([
      {
        role: 'user',
        content: teamConsensus,
      },
    ]);

    let houseResponse = '';
    for await (const chunk of houseStream.textStream) {
      houseResponse += chunk;
    }

    // Parse House's structured response
    const parsedHouse = parseStructuredResponse(houseResponse);
    
    return {
      ...inputData,
      houseAnalysis: {
        contrarian_diagnosis: parsedHouse.diagnosis || extractDiagnosis(houseResponse) || "Rare condition requiring investigation",
        reasoning: houseResponse,
        challenges: ["Challenging conventional thinking"],
        unconventional_tests: extractUncommonTests(houseResponse) || ["Exotic pathogen panel", "Heavy metal screening"],
        sarcastic_comment: extractSarcasm(houseResponse) || "Brilliant. Three doctors, three diagnoses. Math checks out.",
        confidence: parsedHouse.confidence || extractConfidence(houseResponse) || "high"
      }
    };
  },
});

// Step 8: Wilson's Ethical Review
const wilsonEthics = createStep({
  id: 'wilson-ethics',
  description: 'Get Wilson\'s ethical perspective using AI agent',
  inputSchema: z.object({
    patientData: patientCaseSchema,
    symptomAnalysis: z.object({
      aiAssessment: z.string(),
      riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
      urgency: z.enum(['routine', 'urgent', 'emergent']),
      suggestedSpecialties: z.array(z.string()),
      redFlags: z.array(z.string()),
    }),
    labAnalysis: z.object({
      hasLabs: z.boolean(),
      aiInterpretation: z.string().optional(),
      criticalValues: z.array(z.string()).optional(),
      diagnosticClues: z.array(z.string()).optional(),
    }),
    imagingAnalysis: z.object({
      hasImaging: z.boolean(),
      aiInterpretation: z.string().optional(),
      keyFindings: z.array(z.string()).optional(),
      clinicalSignificance: z.string().optional(),
    }),
    foremanAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      neurologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      concerns: z.string(),
    }),
    cameronAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      immunologicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      patientAdvocacy: z.string(),
    }),
    chaseAssessment: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      surgicalFocus: z.string(),
      recommendedTests: z.array(z.string()),
      proceduralConsiderations: z.string(),
    }),
    houseAnalysis: z.object({
      contrarian_diagnosis: z.string(),
      reasoning: z.string(),
      challenges: z.array(z.string()),
      unconventional_tests: z.array(z.string()),
      sarcastic_comment: z.string(),
      confidence: z.string(),
    })
  }),
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    }),
    wilsonEthics: z.object({
      ethicalConcerns: z.array(z.string()),
      patientAdvocacy: z.string(),
      recommendations: z.array(z.string()),
      riskBenefit: z.string(),
    }),
    teamSummary: z.object({
      consensus: z.boolean(),
      primaryDiagnosis: z.string(),
      alternativeDiagnoses: z.array(z.string()),
      recommendedActions: z.array(z.string()),
    })
  }),
  execute: async ({ mastra, inputData }) => {
    const ethicalContext = `
Patient: ${inputData.patientData.age}-year-old ${inputData.patientData.sex}
Risk Level: ${inputData.symptomAnalysis.riskLevel}

Team Diagnoses:
- Foreman: ${inputData.foremanAssessment.diagnosis}
- Cameron: ${inputData.cameronAssessment.diagnosis}
- Chase: ${inputData.chaseAssessment.diagnosis}
- House: ${inputData.houseAnalysis.contrarian_diagnosis}

House's Unconventional Tests: ${inputData.houseAnalysis.unconventional_tests.join(', ')}

Please provide ethical guidance focusing on patient welfare, informed consent, and risk-benefit analysis.
    `;

    const wilsonAgent = mastra?.getAgent('wilsonAgent');
    if (!wilsonAgent) {
      throw new Error('Wilson agent not found');
    }
    
    const wilsonStream = await wilsonAgent.stream([
      {
        role: 'user',
        content: ethicalContext,
      },
    ]);

    let wilsonResponse = '';
    for await (const chunk of wilsonStream.textStream) {
      wilsonResponse += chunk;
    }

    // Generate final diagnosis based on all assessments - synthesize real AI responses
    const finalDiagnosis = synthesizeFinalDiagnosis(inputData, wilsonResponse);

    return {
      finalDiagnosis,
      wilsonEthics: {
        ethicalConcerns: ["Patient autonomy", "Informed consent", "Risk-benefit balance"],
        patientAdvocacy: wilsonResponse,
        recommendations: ["Multidisciplinary consultation", "Patient education", "Family involvement"],
        riskBenefit: "Carefully weighed considering all available evidence"
      },
      teamSummary: {
        consensus: calculateConsensus(inputData),
        primaryDiagnosis: inputData.houseAnalysis.contrarian_diagnosis,
        alternativeDiagnoses: [
          inputData.foremanAssessment.diagnosis,
          inputData.cameronAssessment.diagnosis,
          inputData.chaseAssessment.diagnosis
        ].filter(diag => diag !== inputData.houseAnalysis.contrarian_diagnosis),
        recommendedActions: synthesizeRecommendedActions(inputData)
      }
    };
  },
});

// Create the AI-powered workflow
export const aiDiagnosticWorkflow = createWorkflow({
  id: 'ai-diagnostic-workflow',
  inputSchema: patientCaseSchema,
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    }),
    wilsonEthics: z.object({
      ethicalConcerns: z.array(z.string()),
      patientAdvocacy: z.string(),
      recommendations: z.array(z.string()),
      riskBenefit: z.string(),
    }),
    teamSummary: z.object({
      consensus: z.boolean(),
      primaryDiagnosis: z.string(),
      alternativeDiagnoses: z.array(z.string()),
      recommendedActions: z.array(z.string()),
    })
  }),
})
  .then(aiSymptomAnalysis)
  .then(aiLabAnalysis)
  .then(aiImagingAnalysis)
  .then(foremanAssessment)
  .then(cameronAssessment)
  .then(chaseAssessment)
  .then(houseContrarian)
  .then(wilsonEthics);

aiDiagnosticWorkflow.commit();