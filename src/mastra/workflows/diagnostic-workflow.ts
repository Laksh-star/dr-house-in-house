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

// Step 1: Initial Case Presentation
const casePresentation = createStep({
  id: 'case-presentation',
  description: 'Initial case presentation to the diagnostic team',
  inputSchema: patientCaseSchema,
  outputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    })
  }),
  execute: async ({ inputData }) => {
    const { patientId, age, sex, chiefComplaint, symptoms } = inputData;
    
    return {
      casePresentation: {
        patientId,
        age,
        sex: sex.toString(),
        chiefComplaint,
        symptoms,
        presentedBy: 'Team',
        timestamp: new Date().toISOString(),
      }
    };
  },
});

// Step 2: Initial Symptom Analysis
const symptomAnalysis = createStep({
  id: 'symptom-analysis',
  description: 'Automated analysis of patient symptoms',
  inputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    })
  }),
  outputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    })
  }),
  execute: async ({ inputData }) => {
    const { symptoms, age, sex } = inputData.casePresentation;
    const symptomText = symptoms.join(' ').toLowerCase();
    
    let possibleConditions = [];
    let redFlags = [];
    let recommendedSpecialty = ['Internal Medicine'];
    
    // Analyze symptoms for meningitis
    if (symptomText.includes('headache') && symptomText.includes('neck stiffness') && symptomText.includes('fever')) {
      possibleConditions.push({
        condition: 'Bacterial meningitis',
        probability: 'high',
        matchingSymptoms: symptoms.filter(s => 
          s.toLowerCase().includes('headache') || 
          s.toLowerCase().includes('neck stiffness') || 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('photophobia')
        ),
        additionalTests: ['Lumbar puncture', 'Blood cultures', 'CT head'],
        reasoning: 'Classic triad of fever, headache, and neck stiffness suggests bacterial meningitis',
      });
      redFlags.push('Potential neurological emergency requiring immediate intervention');
      recommendedSpecialty = ['Neurology', 'Infectious Disease', 'Emergency Medicine'];
    }
    
    // Default fallback
    if (possibleConditions.length === 0) {
      possibleConditions.push({
        condition: 'Viral Syndrome',
        probability: 'medium',
        matchingSymptoms: symptoms.slice(0, 2),
        additionalTests: ['Complete Blood Count', 'Viral PCR'],
        reasoning: 'Common presentation for viral illness',
      });
    }
    
    const analysis = {
      possibleConditions,
      redFlags,
      recommendedSpecialty,
    };

    // Pass through case presentation and add symptom analysis
    return {
      casePresentation: inputData.casePresentation,
      symptomAnalysis: analysis
    };
  },
});

// Step 3: Team Differential Diagnosis Round
const teamDifferentials = createStep({
  id: 'team-differentials',
  description: 'Each team member provides their differential diagnosis',
  inputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    })
  }),
  outputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    }),
    teamDifferentials: z.object({
      foreman: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      cameron: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      chase: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
    })
  }),
  execute: async ({ inputData }) => {
    const { symptomAnalysis } = inputData;
    const primaryCondition = symptomAnalysis.possibleConditions[0];
    
    let teamDifferentials;
    
    if (primaryCondition.condition === 'Bacterial meningitis') {
      teamDifferentials = {
        foreman: {
          primaryDx: 'Bacterial meningitis',
          reasoning: 'Classic presentation with fever, headache, neck stiffness, and photophobia',
          confidence: 'high',
          recommendedTests: ['Lumbar puncture', 'Blood cultures', 'CT head'],
        },
        cameron: {
          primaryDx: 'Infectious meningitis',
          reasoning: 'Acute onset with meningeal signs suggests bacterial etiology',
          confidence: 'high',
          recommendedTests: ['CSF analysis', 'Procalcitonin', 'Inflammatory markers'],
        },
        chase: {
          primaryDx: 'CNS infection',
          reasoning: 'Emergency presentation requiring immediate intervention',
          confidence: 'high',
          recommendedTests: ['Immediate LP', 'IV access', 'Blood pressure monitoring'],
        },
      };
    } else {
      // Default team analysis for other conditions
      teamDifferentials = {
        foreman: {
          primaryDx: 'Neurological disorder',
          reasoning: 'Following standard neurological protocols',
          confidence: 'medium',
          recommendedTests: ['MRI brain', 'Lumbar puncture'],
        },
        cameron: {
          primaryDx: 'Autoimmune condition',
          reasoning: 'Could be rare immunological disorder',
          confidence: 'low',
          recommendedTests: ['ANA panel', 'Rheumatoid factor'],
        },
        chase: {
          primaryDx: 'Surgical complication',
          reasoning: 'Consider post-procedural complications',
          confidence: 'medium',
          recommendedTests: ['CT scan', 'Surgical consultation'],
        },
      };
    }

    // Pass through all previous data plus team differentials
    return {
      casePresentation: inputData.casePresentation,
      symptomAnalysis: inputData.symptomAnalysis,
      teamDifferentials
    };
  },
});

// Step 4: House's Contrarian Analysis
const houseAnalysis = createStep({
  id: 'house-analysis',
  description: 'House challenges conventional thinking with contrarian diagnosis',
  inputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    }),
    teamDifferentials: z.object({
      foreman: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      cameron: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      chase: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
    })
  }),
  outputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    }),
    teamDifferentials: z.object({
      foreman: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      cameron: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      chase: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
    }),
    houseAnalysis: z.object({
      contrarian_diagnosis: z.string(),
      reasoning: z.string(),
      challenges: z.array(z.string()),
      unconventional_tests: z.array(z.string()),
      sarcastic_comment: z.string(),
    })
  }),
  execute: async ({ inputData }) => {
    const { teamDifferentials } = inputData;
    const foremanDx = teamDifferentials.foreman.primaryDx;
    
    let houseAnalysis;
    
    if (foremanDx === 'Bacterial meningitis') {
      houseAnalysis = {
        contrarian_diagnosis: 'Tuberculous meningitis or cryptococcal meningitis',
        reasoning: 'Everyone assumes bacterial, but what if it\'s atypical? College dormitories are breeding grounds for unusual pathogens.',
        challenges: [
          'Did anyone check if she\'s been traveling?',
          'What about her roommates? Any sick contacts?',
          'Birth control pills increase clotting risk - could this be venous sinus thrombosis?',
        ],
        unconventional_tests: [
          'Cryptococcal antigen',
          'TB culture and PCR',
          'MR venography',
          'Travel history investigation',
        ],
        sarcastic_comment: 'Sure, bacterial meningitis in a college student. How refreshingly... textbook.',
      };
    } else {
      houseAnalysis = {
        contrarian_diagnosis: 'Rare metabolic disorder',
        reasoning: 'Everyone is thinking horses when we should be looking for zebras',
        challenges: [
          'Why are we ignoring the patient\'s medication history?',
          'What if this isn\'t what it appears to be?',
          'Have we considered environmental toxins?',
        ],
        unconventional_tests: [
          'Heavy metal screening',
          'Exotic toxin panel',
          'Genetic testing for rare variants',
        ],
        sarcastic_comment: 'Because normal diseases are for normal doctors',
      };
    }

    // Pass through all previous data plus House's analysis
    return {
      casePresentation: inputData.casePresentation,
      symptomAnalysis: inputData.symptomAnalysis,
      teamDifferentials: inputData.teamDifferentials,
      houseAnalysis
    };
  },
});

// Step 5: Wilson's Ethics Review
const wilsonEthicsCheck = createStep({
  id: 'wilson-ethics-check',
  description: 'Wilson provides ethical oversight and patient advocacy',
  inputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    }),
    teamDifferentials: z.object({
      foreman: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      cameron: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      chase: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
    }),
    houseAnalysis: z.object({
      contrarian_diagnosis: z.string(),
      reasoning: z.string(),
      challenges: z.array(z.string()),
      unconventional_tests: z.array(z.string()),
      sarcastic_comment: z.string(),
    })
  }),
  outputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    }),
    teamDifferentials: z.object({
      foreman: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      cameron: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      chase: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
    }),
    houseAnalysis: z.object({
      contrarian_diagnosis: z.string(),
      reasoning: z.string(),
      challenges: z.array(z.string()),
      unconventional_tests: z.array(z.string()),
      sarcastic_comment: z.string(),
    }),
    wilsonReview: z.object({
      ethical_concerns: z.array(z.string()),
      patient_advocacy: z.string(),
      recommendations: z.array(z.string()),
    })
  }),
  execute: async ({ inputData }) => {
    const wilsonReview = {
      ethical_concerns: [
        'Ensure patient understands all risks',
        'Consider quality of life implications',
        'Verify informed consent for experimental procedures',
      ],
      patient_advocacy: 'Focus on what\'s best for the patient, not the puzzle',
      recommendations: [
        'Schedule family meeting to discuss options',
        'Consider palliative care consultation if appropriate',
        'Ensure patient psychological support',
      ],
    };

    // Pass through all previous data plus Wilson's review
    return {
      casePresentation: inputData.casePresentation,
      symptomAnalysis: inputData.symptomAnalysis,
      teamDifferentials: inputData.teamDifferentials,
      houseAnalysis: inputData.houseAnalysis,
      wilsonReview
    };
  },
});

// Step 6: Final Diagnosis
const finalDiagnosis = createStep({
  id: 'final-diagnosis',
  description: 'House makes his final diagnostic breakthrough',
  inputSchema: z.object({
    casePresentation: z.object({
      patientId: z.string(),
      age: z.number(),
      sex: z.string(),
      chiefComplaint: z.string(),
      symptoms: z.array(z.string()),
      presentedBy: z.string(),
      timestamp: z.string(),
    }),
    symptomAnalysis: z.object({
      possibleConditions: z.array(z.object({
        condition: z.string(),
        probability: z.string(),
        matchingSymptoms: z.array(z.string()),
        additionalTests: z.array(z.string()),
        reasoning: z.string(),
      })),
      redFlags: z.array(z.string()),
      recommendedSpecialty: z.array(z.string()),
    }),
    teamDifferentials: z.object({
      foreman: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      cameron: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
      chase: z.object({
        primaryDx: z.string(),
        reasoning: z.string(),
        confidence: z.string(),
        recommendedTests: z.array(z.string()),
      }),
    }),
    houseAnalysis: z.object({
      contrarian_diagnosis: z.string(),
      reasoning: z.string(),
      challenges: z.array(z.string()),
      unconventional_tests: z.array(z.string()),
      sarcastic_comment: z.string(),
    }),
    wilsonReview: z.object({
      ethical_concerns: z.array(z.string()),
      patient_advocacy: z.string(),
      recommendations: z.array(z.string()),
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
    })
  }),
  execute: async ({ inputData }) => {
    const { casePresentation, symptomAnalysis, teamDifferentials, houseAnalysis } = inputData;
    
    // Determine diagnosis based on symptom analysis and team consensus
    const primaryCondition = symptomAnalysis.possibleConditions[0];
    const foremanDx = teamDifferentials.foreman.primaryDx;
    const symptoms = casePresentation.symptoms.join(' ').toLowerCase();
    
    let finalDiagnosis;
    
    // Bacterial meningitis pattern
    if (primaryCondition.condition === 'Bacterial meningitis' || 
        foremanDx === 'Bacterial meningitis' ||
        (symptoms.includes('headache') && symptoms.includes('neck stiffness') && symptoms.includes('fever'))) {
      finalDiagnosis = {
        diagnosis: 'Bacterial Meningitis (Streptococcus pneumoniae)',
        confidence: 'high',
        reasoning: 'Classic presentation confirmed by CSF analysis. Young adult in dormitory setting with rapid onset of fever, headache, neck stiffness, and photophobia.',
        treatment: 'Immediate IV ceftriaxone + vancomycin, dexamethasone, supportive care',
        prognosis: 'Good with prompt treatment. Risk of complications if delayed.',
        house_comment: 'Sometimes a horse is just a horse. Boring, but at least she lives to fail another exam.',
      };
    }
    // Lupus pattern
    else if (symptoms.includes('rash') && symptoms.includes('joint')) {
      finalDiagnosis = {
        diagnosis: 'Systemic Lupus Erythematosus',
        confidence: 'high',
        reasoning: 'Multi-system involvement with classic malar rash, joint pain, and positive autoimmune markers.',
        treatment: 'Immunosuppressive therapy with hydroxychloroquine and methotrexate',
        prognosis: 'Chronic condition with good control possible with proper treatment',
        house_comment: 'Well, well, well... it actually IS lupus this time. I owe the writers an apology.',
      };
    }
    // Heart attack pattern
    else if (symptoms.includes('chest pain') && (symptoms.includes('crushing') || symptoms.includes('left arm'))) {
      finalDiagnosis = {
        diagnosis: 'ST-Elevation Myocardial Infarction (STEMI)',
        confidence: 'high',
        reasoning: 'Classic presentation with crushing chest pain, radiation to left arm, and elevated cardiac enzymes.',
        treatment: 'Emergency cardiac catheterization, dual antiplatelet therapy, beta-blockers',
        prognosis: 'Good if treated promptly with PCI, risk of heart failure if delayed',
        house_comment: 'Heart attack in a diabetic smoker. Shocking. Next you\'ll tell me water is wet.',
      };
    }
    // Wilson's Disease pattern (only for appropriate cases)
    else if (symptoms.includes('tremor') && symptoms.includes('weakness') && 
             (symptoms.includes('personality') || houseAnalysis.contrarian_diagnosis.includes('Wilson'))) {
      finalDiagnosis = {
        diagnosis: 'Wilson\'s Disease with Neurological Manifestations',
        confidence: 'high',
        reasoning: 'Neuropsychiatric symptoms with copper metabolism abnormalities. Rare genetic disorder affecting copper transport.',
        treatment: 'Chelation therapy with penicillamine, dietary copper restriction',
        prognosis: 'Good with early treatment, neurological symptoms may improve',
        house_comment: 'A real zebra! Copper poisoning the brain while everyone looks for horses. This is why I love my job.',
      };
    }
    // Lead poisoning pattern
    else if (symptoms.includes('abdominal') && symptoms.includes('weakness') && symptoms.includes('metallic')) {
      finalDiagnosis = {
        diagnosis: 'Lead Poisoning',
        confidence: 'high',
        reasoning: 'Occupational exposure to lead paint with classic symptoms of abdominal pain, weakness, and metallic taste.',
        treatment: 'Chelation therapy with EDTA, remove from exposure source',
        prognosis: 'Good with prompt treatment and exposure cessation',
        house_comment: 'Lead poisoning from vintage cars. Who could have predicted that lead paint might be... toxic?',
      };
    }
    // Default fallback
    else {
      finalDiagnosis = {
        diagnosis: 'Complex Multi-System Disorder',
        confidence: 'medium',
        reasoning: 'Atypical presentation requiring further investigation and specialized testing.',
        treatment: 'Supportive care while conducting additional diagnostic workup',
        prognosis: 'Depends on underlying condition once properly identified',
        house_comment: 'Sometimes even I need more than one episode to crack the case. Stay tuned.',
      };
    }

    return { finalDiagnosis };
  },
});

export const diagnosticWorkflow = createWorkflow({
  id: 'house-md-diagnostic',
  inputSchema: patientCaseSchema,
  outputSchema: z.object({
    finalDiagnosis: z.object({
      diagnosis: z.string(),
      confidence: z.string(),
      reasoning: z.string(),
      treatment: z.string(),
      prognosis: z.string(),
      house_comment: z.string(),
    })
  }),
})
  .then(casePresentation)
  .then(symptomAnalysis)
  .then(teamDifferentials)
  .then(houseAnalysis)
  .then(wilsonEthicsCheck)
  .then(finalDiagnosis);

diagnosticWorkflow.commit();