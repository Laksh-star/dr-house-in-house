import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

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

// Round 1: Initial Case Setup and Parallel Team Analysis
const round1Setup = createStep({
  id: 'round1-setup',
  description: 'Initial case presentation and setup for multi-round diagnosis',
  inputSchema: patientCaseSchema,
  outputSchema: z.object({
    round: z.number(),
    caseData: patientCaseSchema,
    originalSymptoms: z.array(z.string()),
    timeElapsed: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      round: 1,
      caseData: inputData,
      originalSymptoms: inputData.symptoms, // Store original symptoms for later use
      timeElapsed: '0 hours - Initial presentation',
    };
  },
});

const round1TeamAnalysis = createStep({
  id: 'round1-team-analysis',
  description: 'Parallel analysis by Foreman, Cameron, and Chase',
  inputSchema: z.object({
    round: z.number(),
    caseData: patientCaseSchema,
    originalSymptoms: z.array(z.string()),
    timeElapsed: z.string(),
  }),
  outputSchema: z.object({
    round: z.number(),
    caseData: patientCaseSchema,
    originalSymptoms: z.array(z.string()),
    timeElapsed: z.string(),
    round1Results: z.object({
      foreman: z.object({
        diagnosis: z.string(),
        confidence: z.number(),
        reasoning: z.string(),
        recommendedTests: z.array(z.string()),
        concerns: z.string(),
      }),
      cameron: z.object({
        diagnosis: z.string(),
        confidence: z.number(),
        reasoning: z.string(),
        recommendedTests: z.array(z.string()),
        patientCareNotes: z.string(),
      }),
      chase: z.object({
        diagnosis: z.string(),
        confidence: z.number(),
        reasoning: z.string(),
        recommendedTests: z.array(z.string()),
        surgicalConsiderations: z.string(),
      }),
      consensusReached: z.boolean(),
      averageConfidence: z.number(),
    })
  }),
  execute: async ({ inputData }) => {
    const { caseData } = inputData;
    
    // Simulate each doctor's analysis based on their specialty
    const foremanDiagnosis = getForemanDiagnosis(caseData.symptoms);
    const foremanAnalysis = {
      diagnosis: foremanDiagnosis,
      confidence: foremanDiagnosis === 'Bacterial meningitis' ? Math.floor(Math.random() * 20) + 70 : Math.floor(Math.random() * 30) + 40, // Higher confidence for clear meningitis
      reasoning: foremanDiagnosis === 'Bacterial meningitis' ? 'Classic presentation of fever, headache, neck stiffness, and photophobia in young adult' : 'Following standard neurological protocols, symptoms suggest possible CNS involvement',
      recommendedTests: foremanDiagnosis === 'Bacterial meningitis' ? ['Immediate lumbar puncture', 'Blood cultures', 'CT head'] : ['MRI brain', 'Lumbar puncture', 'EEG'],
      concerns: foremanDiagnosis === 'Bacterial meningitis' ? 'Medical emergency requiring immediate intervention' : 'Need to rule out serious neurological conditions first',
    };

    const cameronDiagnosis = getCameronDiagnosis(caseData.symptoms);
    const cameronAnalysis = {
      diagnosis: cameronDiagnosis,
      confidence: cameronDiagnosis.includes('meningitis') ? Math.floor(Math.random() * 20) + 65 : Math.floor(Math.random() * 35) + 35, // Higher confidence for meningitis
      reasoning: cameronDiagnosis.includes('meningitis') ? 'Acute infectious presentation with classic meningeal signs' : 'Considering autoimmune and rare disease possibilities based on symptom constellation',
      recommendedTests: cameronDiagnosis.includes('meningitis') ? ['CSF analysis', 'Blood cultures', 'Inflammatory markers'] : ['ANA panel', 'Complement levels', 'Rheumatoid factor'],
      patientCareNotes: cameronDiagnosis.includes('meningitis') ? 'Patient requires immediate treatment and close monitoring' : 'Patient comfort is priority while investigating underlying cause',
    };

    const chaseDiagnosis = getChaseDiagnosis(caseData.symptoms);
    const chaseAnalysis = {
      diagnosis: chaseDiagnosis,
      confidence: chaseDiagnosis.includes('meningitis') ? Math.floor(Math.random() * 20) + 60 : Math.floor(Math.random() * 40) + 30, // Higher confidence for meningitis
      reasoning: chaseDiagnosis.includes('meningitis') ? 'Neurosurgical emergency with potential for increased intracranial pressure' : 'Evaluating surgical and cardiac causes, considering procedural interventions',
      recommendedTests: chaseDiagnosis.includes('meningitis') ? ['Immediate CT head', 'Neurosurgical consult', 'ICP monitoring'] : ['ECG', 'Echocardiogram', 'CT angiography'],
      surgicalConsiderations: chaseDiagnosis.includes('meningitis') ? 'Monitor for complications requiring surgical intervention' : 'May need invasive procedures if conservative management fails',
    };

    const avgConfidence = Math.round((foremanAnalysis.confidence + cameronAnalysis.confidence + chaseAnalysis.confidence) / 3);
    
    // Weighted scoring system for early exit eligibility
    const confidenceScore = avgConfidence > 75 ? 3 : avgConfidence > 65 ? 2 : avgConfidence > 55 ? 1 : 0;
    const consensusScore = Math.abs(foremanAnalysis.confidence - cameronAnalysis.confidence) < 20 &&
                          Math.abs(cameronAnalysis.confidence - chaseAnalysis.confidence) < 20 ? 2 : 0;
    const presentationScore = checkClassicPresentation(caseData.symptoms) ? 3 : 0;
    const safetyScore = !checkRedFlags(caseData.symptoms, caseData.medicalHistory || []) ? 2 : 0;
    const evidenceScore = !!(caseData.labResults?.length || caseData.imagingResults?.length) ? 1 : 0;
    
    const totalScore = confidenceScore + consensusScore + presentationScore + safetyScore + evidenceScore;
    const earlyExitEligible = totalScore >= 7; // out of 11 possible points
    
    // Legacy consensus check for backward compatibility
    const consensusReached = avgConfidence > 75 && 
      Math.abs(foremanAnalysis.confidence - cameronAnalysis.confidence) < 20 &&
      Math.abs(cameronAnalysis.confidence - chaseAnalysis.confidence) < 20;

    // Pass through all data plus round1 results
    return {
      round: inputData.round,
      caseData: inputData.caseData,
      originalSymptoms: inputData.originalSymptoms,
      timeElapsed: inputData.timeElapsed,
      round1Results: {
        foreman: foremanAnalysis,
        cameron: cameronAnalysis,
        chase: chaseAnalysis,
        consensusReached,
        averageConfidence: avgConfidence,
        earlyExitEligible,
        exitReason: earlyExitEligible ? 'High confidence with team consensus on classic presentation' : 'Requires further investigation',
      }
    };
  },
});

// Round 2: House's Challenge and Investigation
const round2HouseChallenge = createStep({
  id: 'round2-house-challenge',
  description: 'House challenges team assumptions and triggers deeper investigation',
  inputSchema: z.object({
    routeDecision: z.any(),
    round1Results: z.any(),
    originalSymptoms: z.array(z.string()).optional(),
    caseData: patientCaseSchema.optional(),
  }),
  outputSchema: z.object({
    houseChallenge: z.object({
      sarcasticComment: z.string(),
      challenges: z.array(z.string()),
      contrariaDiagnosis: z.string(),
      reasoning: z.string(),
      demandedTests: z.array(z.string()),
      houseConfidence: z.number(),
    }),
    symptomEvolution: z.object({
      newSymptoms: z.array(z.string()),
      progressedSymptoms: z.array(z.string()),
      timeElapsed: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { routeDecision, round1Results } = inputData;
    
    // Skip this step if early exit was chosen
    if (routeDecision?.takeEarlyExit) {
      return {
        houseChallenge: { skipped: true, reason: 'Early exit taken' },
        symptomEvolution: { skipped: true, reason: 'Early exit taken' },
      };
    }
    
    // House's characteristic challenges (pass symptoms for context)
    const originalSymptoms = inputData.originalSymptoms || [];
    const houseChallenge = {
      sarcasticComment: getHouseSarcasticComment(round1Results),
      challenges: [
        'Why are you all thinking horses when this could be a zebra?',
        'Did anyone bother to ask about the patient\'s occupation?',
        'What if the obvious symptoms are masking something else?',
        'Everyone lies - what aren\'t they telling us?'
      ],
      contrariaDiagnosis: getHouseContrariaDiagnosis(round1Results, originalSymptoms),
      reasoning: 'The team is focusing on common diagnoses. This presentation is too clean - there\'s something we\'re missing.',
      demandedTests: [
        'Heavy metal screening',
        'Exotic toxin panel', 
        'Occupational exposure history',
        'Genetic testing for rare variants'
      ],
      houseConfidence: Math.floor(Math.random() * 25) + 60, // 60-85% House is usually confident
    };

    // Simulate symptom evolution (6-12 hours later)
    const symptomEvolution = {
      newSymptoms: generateNewSymptoms(),
      progressedSymptoms: ['symptoms have worsened', 'patient more confused'],
      timeElapsed: '8 hours - Symptoms evolving',
    };

    return {
      houseChallenge,
      symptomEvolution,
    };
  },
});

const round2AutoGenTests = createStep({
  id: 'round2-auto-gen-tests',
  description: 'Auto-generate realistic lab results based on diagnostic theories',
  inputSchema: z.object({
    houseChallenge: z.any(),
    symptomEvolution: z.any(),
    originalSymptoms: z.array(z.string()).optional(),
    routeDecision: z.any().optional(),
  }),
  outputSchema: z.object({
    newLabResults: z.array(z.object({
      testName: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string(),
      referenceRange: z.string(),
      significance: z.string(),
    })),
    teamReactions: z.object({
      foreman: z.string(),
      cameron: z.string(), 
      chase: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { houseChallenge, routeDecision } = inputData;
    
    // Skip this step if early exit was chosen
    if (routeDecision?.takeEarlyExit || houseChallenge?.skipped) {
      return {
        newLabResults: [],
        teamReactions: { skipped: true, reason: 'Early exit taken' },
      };
    }
    
    // Auto-generate lab results that support or refute theories
    const originalSymptoms = inputData.originalSymptoms || [];
    const newLabResults = generateLabResults(houseChallenge.contrariaDiagnosis, originalSymptoms);
    
    const teamReactions = {
      foreman: 'These results don\'t fit my initial diagnosis. Need to reconsider neurological causes.',
      cameron: 'The autoimmune markers are interesting. Could support rare disease theory.',
      chase: 'Cardiac markers are normal, but these other values are concerning.',
    };

    return {
      newLabResults,
      teamReactions,
    };
  },
});

// Round 3: Final Breakthrough
const round3Wilson = createStep({
  id: 'round3-wilson',
  description: 'Wilson provides ethical review and patient advocacy',
  inputSchema: z.object({
    newLabResults: z.any(),
    teamReactions: z.any(),
    routeDecision: z.any().optional(),
  }),
  outputSchema: z.object({
    wilsonEthicsReview: z.object({
      patientWelfare: z.string(),
      ethicalConcerns: z.array(z.string()),
      recommendations: z.array(z.string()),
      supportForHouse: z.string(),
    }),
    timeElapsed: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { routeDecision, teamReactions } = inputData;
    
    // Skip this step if early exit was chosen
    if (routeDecision?.takeEarlyExit || teamReactions?.skipped) {
      return {
        wilsonEthicsReview: { skipped: true, reason: 'Early exit taken' },
        timeElapsed: '2 hours - Early diagnosis',
      };
    }
    
    const wilsonEthicsReview = {
      patientWelfare: 'Patient condition is deteriorating. We need definitive diagnosis soon.',
      ethicalConcerns: [
        'Experimental treatments carry significant risks',
        'Patient family needs to be informed of uncertainty',
        'Consider quality of life implications'
      ],
      recommendations: [
        'Multidisciplinary team consultation',
        'Patient and family meeting',
        'Consider palliative care consultation if prognosis poor'
      ],
      supportForHouse: 'House\'s unconventional approach may be necessary at this point.',
    };

    return {
      wilsonEthicsReview,
      timeElapsed: '18 hours - Critical decision point',
    };
  },
});

const round3HouseBreakthrough = createStep({
  id: 'round3-house-breakthrough',
  description: 'House makes final diagnostic breakthrough',
  inputSchema: z.object({
    wilsonEthicsReview: z.any(),
    timeElapsed: z.string(),
    houseChallenge: z.any().optional(),
    newLabResults: z.any().optional(),
    originalSymptoms: z.array(z.string()).optional(),
    routeDecision: z.any().optional(),
  }),
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      breakthrough: z.string(),
      evidence: z.array(z.string()),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    }),
    roundSummary: z.object({
      totalTime: z.string(),
      roundsCompleted: z.number(),
      keyTurningPoint: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { originalSymptoms = [], houseChallenge, newLabResults, routeDecision, wilsonEthicsReview } = inputData;
    
    // Skip this step if early exit was chosen
    if (routeDecision?.takeEarlyExit || wilsonEthicsReview?.skipped) {
      return {
        finalDiagnosis: { skipped: true, reason: 'Early exit taken' },
        roundSummary: { skipped: true, reason: 'Early exit taken' },
      };
    }
    
    const finalDiagnosis = generateFinalDiagnosis(originalSymptoms, houseChallenge, newLabResults);

    const roundSummary = {
      totalTime: '18 hours from presentation to diagnosis',
      roundsCompleted: 3,
      keyTurningPoint: generateKeyTurningPoint(originalSymptoms, finalDiagnosis.diagnosis),
    };

    return {
      finalDiagnosis,
      roundSummary,
    };
  },
});

// Early Exit Step - High Confidence Final Diagnosis
const earlyExitDiagnosis = createStep({
  id: 'early-exit-diagnosis',
  description: 'Quick diagnosis for obvious cases with high team confidence',
  inputSchema: z.object({
    round1Results: z.any(),
    originalSymptoms: z.array(z.string()).optional(),
    caseData: patientCaseSchema.optional(),
  }),
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      breakthrough: z.string(),
      evidence: z.array(z.string()),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    }),
    roundSummary: z.object({
      totalTime: z.string(),
      roundsCompleted: z.number(),
      keyTurningPoint: z.string(),
      earlyExit: z.boolean(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { originalSymptoms = [], round1Results, caseData } = inputData;
    
    // Generate diagnosis based on team analysis
    const finalDiagnosis = generateFinalDiagnosis(originalSymptoms, null, caseData?.labResults);
    
    // Early exit always shows high confidence
    finalDiagnosis.confidence = 'high';
    finalDiagnosis.breakthrough = `Team reached immediate consensus: ${finalDiagnosis.breakthrough}`;
    
    // Add early exit evidence
    finalDiagnosis.evidence.unshift('Immediate team consensus on classic presentation');
    
    // House comment for early exits (less dramatic)
    const earlyExitComments = {
      'Bacterial Meningitis': 'Even I can\'t argue with a textbook case. Boring, but at least no one dies.',
      'ST-Elevation Myocardial Infarction': 'Heart attack in a high-risk patient. Shocking. Wake me when you find something interesting.',
      'Systemic Lupus Erythematosus': 'Lupus with classic presentation. I\'m as surprised as you are that it\'s actually lupus.',
      'Lead Poisoning': 'Lead paint plus symptoms equals lead poisoning. Even first-year med students could figure this out.',
    };
    
    const diagnosisKey = Object.keys(earlyExitComments).find(key => finalDiagnosis.diagnosis.includes(key));
    if (diagnosisKey) {
      finalDiagnosis.house_comment = earlyExitComments[diagnosisKey];
    } else {
      finalDiagnosis.house_comment = 'Obvious diagnosis is obvious. Not exactly my most challenging case.';
    }
    
    const roundSummary = {
      totalTime: '2 hours from presentation to diagnosis',
      roundsCompleted: 1,
      keyTurningPoint: 'Team reached immediate consensus on classic presentation',
      earlyExit: true,
    };

    return {
      finalDiagnosis,
      roundSummary,
    };
  },
});

// Decision Step - Routes to either early exit or full investigation
const routingDecision = createStep({
  id: 'routing-decision',
  description: 'Decides whether to exit early or continue full investigation',
  inputSchema: z.object({
    round: z.number(),
    caseData: patientCaseSchema,
    originalSymptoms: z.array(z.string()),
    timeElapsed: z.string(),
    round1Results: z.any(),
  }),
  outputSchema: z.object({
    routeDecision: z.object({
      takeEarlyExit: z.boolean(),
      reason: z.string(),
      confidenceLevel: z.number(),
      safetyChecks: z.object({
        highConfidence: z.boolean(),
        teamConsensus: z.boolean(),
        classicPresentation: z.boolean(),
        noRedFlags: z.boolean(),
        supportingEvidence: z.boolean(),
      }),
    }),
    // Pass through data for next steps
    round: z.number(),
    caseData: patientCaseSchema,
    originalSymptoms: z.array(z.string()),
    timeElapsed: z.string(),
    round1Results: z.any(),
  }),
  execute: async ({ inputData }) => {
    const { round1Results, originalSymptoms = [], caseData } = inputData;
    
    // Use same weighted scoring system as in round1TeamAnalysis
    const confidenceScore = round1Results.averageConfidence > 75 ? 3 : round1Results.averageConfidence > 65 ? 2 : round1Results.averageConfidence > 55 ? 1 : 0;
    const consensusScore = Math.abs(round1Results.foreman.confidence - round1Results.cameron.confidence) < 20 &&
                          Math.abs(round1Results.cameron.confidence - round1Results.chase.confidence) < 20 ? 2 : 0;
    const presentationScore = checkClassicPresentation(originalSymptoms) ? 3 : 0;
    const safetyScore = !checkRedFlags(originalSymptoms, caseData?.medicalHistory || []) ? 2 : 0;
    const evidenceScore = !!(caseData?.labResults?.length || caseData?.imagingResults?.length) ? 1 : 0;
    
    const totalScore = confidenceScore + consensusScore + presentationScore + safetyScore + evidenceScore;
    const allChecksPassed = totalScore >= 7;
    
    const safetyChecks = {
      highConfidence: round1Results.averageConfidence > 65,
      teamConsensus: Math.abs(round1Results.foreman.confidence - round1Results.cameron.confidence) < 20 &&
                    Math.abs(round1Results.cameron.confidence - round1Results.chase.confidence) < 20,
      classicPresentation: checkClassicPresentation(originalSymptoms),
      noRedFlags: !checkRedFlags(originalSymptoms, caseData?.medicalHistory || []),
      supportingEvidence: !!(caseData?.labResults?.length || caseData?.imagingResults?.length),
    };
    
    let reason = '';
    if (!safetyChecks.highConfidence) reason += 'Low confidence. ';
    if (!safetyChecks.teamConsensus) reason += 'Team disagreement. ';
    if (!safetyChecks.classicPresentation) reason += 'Atypical presentation. ';
    if (safetyChecks.noRedFlags === false) reason += 'Red flags present. ';
    if (!safetyChecks.supportingEvidence) reason += 'Insufficient evidence. ';
    
    if (allChecksPassed) {
      reason = 'All safety criteria met for early diagnosis';
    } else {
      reason = reason.trim() + ' Full investigation required.';
    }
    
    return {
      routeDecision: {
        takeEarlyExit: allChecksPassed,
        reason,
        confidenceLevel: round1Results.averageConfidence,
        safetyChecks,
      },
      // Pass through for next steps
      round: inputData.round,
      caseData: inputData.caseData,
      originalSymptoms: inputData.originalSymptoms,
      timeElapsed: inputData.timeElapsed,
      round1Results: inputData.round1Results,
    };
  },
});

// Helper functions for generating realistic medical responses
function getForemanDiagnosis(symptoms: string[]): string {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Neurological emergency patterns
  if (symptomText.includes('headache') && symptomText.includes('neck stiffness') && symptomText.includes('fever')) {
    return 'Bacterial meningitis';
  }
  if (symptomText.includes('headache') && symptomText.includes('photophobia') && symptomText.includes('fever')) {
    return 'Meningitis or encephalitis';
  }
  if (symptomText.includes('weakness') && symptomText.includes('tremor')) {
    return 'Neurodegenerative disorder';
  }
  if (symptomText.includes('headache') && symptomText.includes('confusion')) {
    return 'Intracranial pathology';
  }
  if (symptomText.includes('seizure')) {
    return 'Epilepsy or structural brain lesion';
  }
  return 'Central nervous system disorder';
}

function getCameronDiagnosis(symptoms: string[]): string {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Autoimmune and inflammatory patterns
  if (symptomText.includes('rash') && symptomText.includes('joint')) {
    return 'Systemic lupus erythematosus';
  }
  if (symptomText.includes('butterfly rash') || symptomText.includes('malar rash')) {
    return 'Systemic lupus erythematosus';
  }
  if (symptomText.includes('fever') && symptomText.includes('headache') && symptomText.includes('neck stiffness')) {
    return 'Infectious meningitis vs autoimmune encephalitis';
  }
  if (symptomText.includes('joint pain') && symptomText.includes('fatigue')) {
    return 'Rheumatoid arthritis or connective tissue disorder';
  }
  if (symptomText.includes('fever') && symptomText.includes('weight loss')) {
    return 'Inflammatory condition or malignancy';
  }
  return 'Inflammatory or autoimmune disorder';
}

function getChaseDiagnosis(symptoms: string[]): string {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Surgical and cardiac patterns
  if (symptomText.includes('chest pain') && (symptomText.includes('shortness of breath') || symptomText.includes('sweating'))) {
    return 'Acute coronary syndrome';
  }
  if (symptomText.includes('crushing chest pain') || symptomText.includes('left arm pain')) {
    return 'ST-elevation myocardial infarction';
  }
  if (symptomText.includes('abdominal pain') && symptomText.includes('nausea')) {
    return 'Surgical abdomen';
  }
  if (symptomText.includes('headache') && symptomText.includes('neck stiffness')) {
    return 'Possible subarachnoid hemorrhage vs meningitis';
  }
  if (symptomText.includes('weakness') && symptomText.includes('tremor')) {
    return 'Consider structural brain lesion';
  }
  return 'May require procedural intervention';
}

function getHouseSarcasticComment(teamResults: any): string {
  const comments = [
    'Wow, three doctors, three boring diagnoses. Did you all go to the same medical school?',
    'Let me guess - you all want to order the same textbook tests and hope for the best?',
    'Congratulations, you\'ve managed to think exactly like every other doctor in this hospital.',
    'I\'m sure the patient will be thrilled to know you\'re playing it safe while they\'re dying.',
  ];
  return comments[Math.floor(Math.random() * comments.length)];
}

function getHouseContrariaDiagnosis(teamResults: any, originalSymptoms: string[]): string {
  const symptomText = originalSymptoms.join(' ').toLowerCase();
  
  // House looks for zebras based on actual symptoms
  if (symptomText.includes('headache') && symptomText.includes('neck stiffness')) {
    return 'Cryptococcal meningitis or tuberculous meningitis';
  }
  if (symptomText.includes('weakness') && symptomText.includes('tremor')) {
    return 'Wilson\'s Disease';
  }
  if (symptomText.includes('chest pain') && symptomText.includes('heart')) {
    return 'Cocaine-induced cardiomyopathy';
  }
  if (symptomText.includes('rash') && symptomText.includes('joint')) {
    return 'Behçet\'s disease';
  }
  if (symptomText.includes('fever') && symptomText.includes('cough')) {
    return 'Histoplasmosis or atypical pneumonia';
  }
  if (symptomText.includes('abdominal') && symptomText.includes('weakness')) {
    return 'Lead poisoning';
  }
  
  // Default rare diagnoses
  const rareDiagnoses = [
    'Fabry Disease', 
    'Hereditary Hemochromatosis',
    'Porphyria',
    'Heavy metal poisoning',
    'Paraneoplastic syndrome'
  ];
  return rareDiagnoses[Math.floor(Math.random() * rareDiagnoses.length)];
}

function generateNewSymptoms(): string[] {
  const possibleNewSymptoms = [
    'tremor in hands',
    'behavioral changes',
    'difficulty swallowing',
    'slurred speech',
    'liver tenderness',
    'jaundice',
    'Kayser-Fleischer rings in eyes'
  ];
  
  // Return 2-3 random new symptoms
  const shuffled = possibleNewSymptoms.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
}

function generateLabResults(suspectedDiagnosis: string, originalSymptoms: string[]) {
  const symptomText = originalSymptoms.join(' ').toLowerCase();
  
  // Generate results based on suspected diagnosis and symptoms
  if (suspectedDiagnosis.includes('meningitis') || (symptomText.includes('headache') && symptomText.includes('fever'))) {
    return [
      {
        testName: 'Lumbar Puncture Opening Pressure',
        value: 280,
        unit: 'mm H2O',
        referenceRange: '70-180',
        significance: 'Elevated - consistent with bacterial meningitis'
      },
      {
        testName: 'CSF White Blood Cells',
        value: 2400,
        unit: 'cells/μL',
        referenceRange: '<5',
        significance: 'Markedly elevated with neutrophilic predominance - bacterial meningitis'
      },
      {
        testName: 'CSF Protein',
        value: 180,
        unit: 'mg/dL',
        referenceRange: '15-45',
        significance: 'Elevated - supports bacterial meningitis'
      },
      {
        testName: 'CSF Glucose',
        value: 25,
        unit: 'mg/dL',
        referenceRange: '50-80',
        significance: 'Low - characteristic of bacterial meningitis'
      }
    ];
  }
  
  if (suspectedDiagnosis.includes('Wilson')) {
    return [
      {
        testName: 'Serum Copper',
        value: 180,
        unit: 'μg/dL',
        referenceRange: '70-140',
        significance: 'Elevated - supports copper metabolism disorder'
      },
      {
        testName: 'Ceruloplasmin',
        value: 8,
        unit: 'mg/dL', 
        referenceRange: '20-50',
        significance: 'Low - characteristic of Wilson\'s Disease'
      },
      {
        testName: '24-hour Urine Copper',
        value: 250,
        unit: 'μg/24hr',
        referenceRange: '<40',
        significance: 'Markedly elevated - diagnostic for Wilson\'s Disease'
      }
    ];
  }
  
  if (suspectedDiagnosis.includes('lupus') || suspectedDiagnosis.includes('autoimmune')) {
    return [
      {
        testName: 'ANA (Antinuclear Antibodies)',
        value: '1:320',
        unit: 'titer',
        referenceRange: '<1:80',
        significance: 'Positive - supports autoimmune condition'
      },
      {
        testName: 'Anti-dsDNA',
        value: 85,
        unit: 'IU/mL',
        referenceRange: '<30',
        significance: 'Elevated - highly specific for lupus'
      }
    ];
  }
  
  if (suspectedDiagnosis.includes('coronary') || symptomText.includes('chest pain')) {
    return [
      {
        testName: 'Troponin I',
        value: 12.5,
        unit: 'ng/mL',
        referenceRange: '<0.04',
        significance: 'Markedly elevated - indicates myocardial infarction'
      },
      {
        testName: 'CK-MB',
        value: 38,
        unit: 'ng/mL',
        referenceRange: '<6.3',
        significance: 'Elevated - supports heart attack diagnosis'
      }
    ];
  }
  
  // Default follow-up tests
  return [
    {
      testName: 'Follow-up Blood Culture',
      value: 'pending',
      unit: '',
      referenceRange: 'negative',
      significance: 'May identify causative organism'
    },
    {
      testName: 'Additional Imaging',
      value: 'ordered',
      unit: '',
      referenceRange: 'normal',
      significance: 'Further evaluation needed'
    }
  ];
}

function generateFinalDiagnosis(symptoms: string[], houseChallenge: any, labResults: any) {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Determine most likely diagnosis based on symptoms and evidence
  let diagnosis = 'Undetermined condition';
  let confidence = 'medium';
  let breakthrough = 'Based on clinical presentation and diagnostic evolution.';
  let evidence = ['Clinical symptoms', 'Laboratory findings', 'Patient history'];
  let treatment = 'Supportive care and monitoring';
  let prognosis = 'Depends on underlying condition';
  let house_comment = 'Sometimes the obvious answer is the right answer... who knew?';
  
  // Meningitis pattern
  if (symptomText.includes('headache') && symptomText.includes('neck stiffness') && symptomText.includes('fever')) {
    diagnosis = 'Bacterial Meningitis';
    confidence = 'high';
    breakthrough = 'Classic triad of fever, headache, and neck stiffness, confirmed by lumbar puncture findings.';
    evidence = [
      'Classic meningeal signs (neck stiffness, photophobia)',
      'High fever and altered mental status',
      'Elevated CSF white cells with neutrophilic predominance',
      'Low CSF glucose and high protein'
    ];
    treatment = 'Immediate IV antibiotics (ceftriaxone + vancomycin), corticosteroids';
    prognosis = 'Good with prompt treatment, risk of complications if delayed';
    house_comment = 'Congratulations, you found a horse. Sometimes a horse is just a horse... boring but life-saving.';
  }
  
  // Lupus pattern
  else if (symptomText.includes('rash') && symptomText.includes('joint')) {
    diagnosis = 'Systemic Lupus Erythematosus';
    confidence = 'high';
    breakthrough = 'Multi-system involvement with positive autoimmune markers confirms lupus diagnosis.';
    evidence = [
      'Malar rash and photosensitivity',
      'Arthralgia and joint involvement',
      'Positive ANA and anti-dsDNA antibodies',
      'Multi-organ system involvement'
    ];
    treatment = 'Immunosuppressive therapy (hydroxychloroquine, methotrexate)';
    prognosis = 'Chronic condition with good control possible with treatment';
    house_comment = 'Well, well, well... it actually IS lupus this time. I owe the writers an apology.';
  }
  
  // Heart attack pattern
  else if (symptomText.includes('chest pain') && (symptomText.includes('crushing') || symptomText.includes('left arm'))) {
    diagnosis = 'ST-Elevation Myocardial Infarction (STEMI)';
    confidence = 'high';
    breakthrough = 'Classic presentation with elevated cardiac enzymes confirms massive heart attack.';
    evidence = [
      'Crushing chest pain with radiation to left arm',
      'Markedly elevated troponin and CK-MB',
      'ECG changes consistent with STEMI',
      'Risk factors: diabetes, hypertension, smoking'
    ];
    treatment = 'Emergency cardiac catheterization, dual antiplatelet therapy, beta-blockers';
    prognosis = 'Good if treated promptly with PCI, risk of heart failure if delayed';
    house_comment = 'Heart attack in a diabetic smoker. Shocking. Next you\'ll tell me water is wet.';
  }
  
  // Wilson's Disease pattern (for cases that actually fit)
  else if (symptomText.includes('tremor') && symptomText.includes('weakness') && symptomText.includes('personality')) {
    diagnosis = 'Wilson\'s Disease with Neuropsychiatric Manifestations';
    confidence = 'high';
    breakthrough = 'Neuropsychiatric symptoms with family history and copper studies confirm Wilson\'s disease.';
    evidence = [
      'Progressive neurological deterioration',
      'Psychiatric symptoms and personality changes',
      'Family history of early liver disease',
      'Abnormal copper metabolism studies'
    ];
    treatment = 'Chelation therapy with penicillamine, dietary copper restriction';
    prognosis = 'Good with early treatment, neurological improvement possible';
    house_comment = 'A real zebra! Copper poisoning the brain while everyone looks for horses. This is why I love my job.';
  }
  
  // Lead poisoning pattern
  else if (symptomText.includes('abdominal') && symptomText.includes('weakness') && symptomText.includes('metallic')) {
    diagnosis = 'Lead Poisoning';
    confidence = 'high';
    breakthrough = 'Occupational exposure history and classic symptoms with elevated blood lead confirm toxicity.';
    evidence = [
      'Classic lead poisoning symptoms',
      'Occupational exposure to lead paint',
      'Elevated blood lead levels',
      'Basophilic stippling on blood smear'
    ];
    treatment = 'Chelation therapy with EDTA, remove from exposure source';
    prognosis = 'Good with prompt treatment and exposure cessation';
    house_comment = 'Lead poisoning from vintage cars. Who could have predicted that lead paint might be... toxic?';
  }
  
  return {
    diagnosis,
    confidence,
    breakthrough,
    evidence,
    treatment,
    prognosis,
    house_comment,
  };
}

function generateKeyTurningPoint(symptoms: string[], finalDiagnosis: string): string {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  if (finalDiagnosis.includes('Meningitis')) {
    return 'Lumbar puncture results confirmed bacterial etiology requiring immediate antibiotics';
  }
  if (finalDiagnosis.includes('Lupus')) {
    return 'Positive autoimmune markers combined with clinical presentation confirmed systemic lupus';
  }
  if (finalDiagnosis.includes('Myocardial')) {
    return 'Cardiac enzyme elevation confirmed acute myocardial infarction';
  }
  if (finalDiagnosis.includes('Wilson')) {
    return 'Copper studies and family history revealed rare genetic disorder';
  }
  if (finalDiagnosis.includes('Lead')) {
    return 'Occupational history and blood lead levels identified toxic exposure';
  }
  
  return 'House\'s insistence on rare disease testing revealed the true diagnosis';
}

// Safety check functions for early exit logic
function checkClassicPresentation(symptoms: string[]): boolean {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Classic presentations that can safely exit early - STRICT criteria
  const classicPatterns = [
    // Bacterial meningitis: fever + headache + neck stiffness (classic triad)
    () => symptomText.includes('fever') && symptomText.includes('headache') && 
          symptomText.includes('neck stiffness') && 
          (symptomText.includes('photophobia') || symptomText.includes('light')),
    
    // STEMI: crushing chest pain + left arm pain or jaw pain
    () => (symptomText.includes('crushing chest pain') || symptomText.includes('chest pressure')) && 
          (symptomText.includes('left arm') || symptomText.includes('jaw pain')),
    
    // Clear lupus: malar/butterfly rash + joint pain + fever
    () => (symptomText.includes('butterfly rash') || symptomText.includes('malar rash')) && 
          symptomText.includes('joint pain') && symptomText.includes('fever'),
    
    // Obvious lead poisoning: abdominal pain + metallic taste + neurological symptoms
    () => symptomText.includes('abdominal pain') && symptomText.includes('metallic taste') && 
          (symptomText.includes('weakness') || symptomText.includes('confusion')),
  ];
  
  return classicPatterns.some(pattern => pattern());
}

function checkRedFlags(symptoms: string[], medicalHistory: string[]): boolean {
  const symptomText = symptoms.join(' ').toLowerCase();
  const historyText = medicalHistory.join(' ').toLowerCase();
  
  // Red flags that require full House investigation - STRICT criteria
  const redFlags = [
    // Unusual age for condition (young stroke patients need investigation)
    () => symptomText.includes('headache') && symptomText.includes('stroke') && 
          (historyText.includes('young') || historyText.includes('under 30')),
    
    // Multiple system involvement without clear cause (rare diseases)
    () => (symptomText.includes('neurological') || symptomText.includes('weakness') || symptomText.includes('tremor')) && 
          (symptomText.includes('cardiac') || symptomText.includes('heart') || symptomText.includes('chest')) &&
          (symptomText.includes('kidney') || symptomText.includes('liver') || symptomText.includes('abdominal')),
    
    // Psychiatric symptoms with physical complaints (Wilson's, metabolic disorders)
    () => (symptomText.includes('personality') || symptomText.includes('depression') || symptomText.includes('mood')) &&
          (symptomText.includes('tremor') || symptomText.includes('weakness') || symptomText.includes('motor')),
    
    // Occupational/environmental exposure hints (toxic exposures)
    () => historyText.includes('mine') || historyText.includes('factory') || historyText.includes('chemicals') ||
          historyText.includes('paint') || historyText.includes('metal') || historyText.includes('industrial'),
    
    // Travel history with unusual fever patterns (exotic infections)
    () => historyText.includes('travel') && symptomText.includes('fever') && 
          (symptomText.includes('rash') || symptomText.includes('joint') || symptomText.includes('cough')),
    
    // Family history of rare genetic diseases
    () => (historyText.includes('family history') || historyText.includes('father') || historyText.includes('mother')) && 
          (historyText.includes('liver disease') || historyText.includes('died young') || historyText.includes('genetic')),
    
    // Drug abuse or unusual medication history
    () => historyText.includes('drug') || historyText.includes('cocaine') || historyText.includes('heroin') ||
          historyText.includes('addiction') || symptomText.includes('track marks'),
    
    // Immunocompromised patients with common symptoms (need deeper investigation)
    () => (historyText.includes('hiv') || historyText.includes('transplant') || historyText.includes('chemotherapy')) &&
          (symptomText.includes('fever') || symptomText.includes('headache')),
  ];
  
  return redFlags.some(flag => flag());
}

// Smart Final Step - Handles both early exit and full investigation results
const smartFinalDiagnosis = createStep({
  id: 'smart-final-diagnosis',
  description: 'Intelligently handles both early exit and full investigation paths',
  inputSchema: z.object({
    // Early exit path data
    routeDecision: z.any().optional(),
    round1Results: z.any().optional(),
    originalSymptoms: z.array(z.string()).optional(),
    caseData: patientCaseSchema.optional(),
    
    // Full investigation path data (from round3HouseBreakthrough)
    finalDiagnosis: z.any().optional(),
    roundSummary: z.any().optional(),
    
    // Additional context
    wilsonEthicsReview: z.any().optional(),
    newLabResults: z.any().optional(),
    houseChallenge: z.any().optional(),
  }),
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      breakthrough: z.string(),
      evidence: z.array(z.string()),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    }),
    roundSummary: z.object({
      totalTime: z.string(),
      roundsCompleted: z.number(),
      keyTurningPoint: z.string(),
      earlyExit: z.boolean().optional(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { routeDecision, originalSymptoms = [], caseData, finalDiagnosis: existingDiagnosis, roundSummary: existingRoundSummary } = inputData;
    
    // If we have a route decision and it says early exit, do early exit
    if (routeDecision?.takeEarlyExit) {
      const finalDiagnosis = generateFinalDiagnosis(originalSymptoms, null, caseData?.labResults);
      
      // Early exit customizations
      finalDiagnosis.confidence = 'high';
      finalDiagnosis.breakthrough = `Team reached immediate consensus: ${finalDiagnosis.breakthrough}`;
      finalDiagnosis.evidence.unshift('Immediate team consensus on classic presentation');
      
      // House comment for early exits
      const earlyExitComments = {
        'Bacterial Meningitis': 'Even I can\'t argue with a textbook case. Boring, but at least no one dies.',
        'ST-Elevation Myocardial Infarction': 'Heart attack in a high-risk patient. Shocking. Wake me when you find something interesting.',
        'Systemic Lupus Erythematosus': 'Lupus with classic presentation. I\'m as surprised as you are that it\'s actually lupus.',
        'Lead Poisoning': 'Lead paint plus symptoms equals lead poisoning. Even first-year med students could figure this out.',
      };
      
      const diagnosisKey = Object.keys(earlyExitComments).find(key => finalDiagnosis.diagnosis.includes(key));
      if (diagnosisKey) {
        finalDiagnosis.house_comment = earlyExitComments[diagnosisKey];
      } else {
        finalDiagnosis.house_comment = 'Obvious diagnosis is obvious. Not exactly my most challenging case.';
      }
      
      const roundSummary = {
        totalTime: '2 hours from presentation to diagnosis',
        roundsCompleted: 1,
        keyTurningPoint: 'Team reached immediate consensus on classic presentation',
        earlyExit: true,
      };

      return { finalDiagnosis, roundSummary };
    }
    
    // Otherwise, we went through full investigation - return those results
    if (existingDiagnosis && existingRoundSummary) {
      return {
        finalDiagnosis: existingDiagnosis,
        roundSummary: {
          ...existingRoundSummary,
          earlyExit: false,
        },
      };
    }
    
    // Fallback - generate diagnosis from available data
    const finalDiagnosis = generateFinalDiagnosis(originalSymptoms, inputData.houseChallenge, inputData.newLabResults);
    const roundSummary = {
      totalTime: '18 hours from presentation to diagnosis',
      roundsCompleted: 3,
      keyTurningPoint: generateKeyTurningPoint(originalSymptoms, finalDiagnosis.diagnosis),
      earlyExit: false,
    };

    return { finalDiagnosis, roundSummary };
  },
});

// Create the multi-round workflow with conditional logic
export const multiRoundDiagnosticWorkflow = createWorkflow({
  id: 'house-md-diagnostic-multiround',
  inputSchema: patientCaseSchema,
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      breakthrough: z.string(),
      evidence: z.array(z.string()),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    }),
    roundSummary: z.object({
      totalTime: z.string(),
      roundsCompleted: z.number(),
      keyTurningPoint: z.string(),
      earlyExit: z.boolean().optional(),
    }),
  }),
})
  .then(round1Setup)
  .then(round1TeamAnalysis)
  .then(routingDecision)
  .then(round2HouseChallenge)
  .then(round2AutoGenTests)
  .then(round3Wilson)
  .then(round3HouseBreakthrough)
  .then(smartFinalDiagnosis);

multiRoundDiagnosticWorkflow.commit();