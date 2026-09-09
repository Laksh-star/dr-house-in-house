# The Case Room — Astra × Mastra workflow showcase

The new **[Case Room package](case-room/README.md)** implements a fictional investigation using Mastra **1.64.0**, typed external decisions, durable suspend/resume, and a Three.js replay. Astra reasons through the existing Hyperagent session; **no separate model API key is required for this new execution path**.

- [Setup, CLI, persistence, and limitations](case-room/README.md)
- [Recorded investigation and decision inputs](case-room/reports/live/)
- [Integration test report](case-room/reports/tests.tap)
- [Replay template and rendering instructions](case-room/replay/README.md)

```bash
cd case-room
npm ci
npm run typecheck
npm run build
npm test
npm run cli -- start --case night-shift
```

This is a **fictional engineering showcase**, not medical advice, clinical training validation, or a blinded reasoning benchmark. The 3D page replays recorded events; it does not make live model calls. Use the case-room package scripts, not the legacy root scripts, for the new system.

The original project is preserved below for historical reference. Its model-key requirements and diagnostic claims do **not** describe the new Case Room execution path. The new package is isolated to avoid silently breaking the old demo; a full root-package consolidation is not included in this first milestone.

---

# Legacy: Dr. House Multi-Agent Diagnostic System

A multi-agent system built with Mastra.ai that simulates the diagnostic process from the TV series "House M.D." Each agent embodies the personality and medical expertise of the show's characters, working together to solve complex medical cases.

## 🎭 The Team

### **Dr. Gregory House** - Lead Diagnostician
- **Specialty**: Infectious diseases and nephrology
- **Personality**: Brilliant, cynical, unconventional
- **Approach**: Questions everything, looks for zebras not horses
- **Tools**: Full diagnostic suite (symptoms, labs, imaging)

### **Dr. James Wilson** - Head of Oncology
- **Specialty**: Oncology and medical ethics
- **Personality**: Compassionate, ethical, House's moral compass
- **Approach**: Patient-focused care with ethical oversight
- **Tools**: Lab analysis specialization

### **Dr. Eric Foreman** - Neurologist
- **Specialty**: Neurology and evidence-based medicine
- **Personality**: Methodical, challenges House's risky methods
- **Approach**: Standard protocols and neurological focus
- **Tools**: Symptom analysis and imaging interpretation

### **Dr. Allison Cameron** - Immunologist
- **Specialty**: Immunology and rare diseases
- **Personality**: Idealistic, patient advocate
- **Approach**: Autoimmune conditions and genetic factors
- **Tools**: Symptom analysis and lab interpretation

### **Dr. Robert Chase** - Surgeon/Intensivist
- **Specialty**: Surgery and intensive care
- **Personality**: Pragmatic, adaptable to House's methods
- **Approach**: Surgical causes and procedural interventions
- **Tools**: Imaging and lab analysis

## 🔬 Diagnostic Tools

### **Symptom Checker**
Analyzes patient symptoms and suggests possible medical conditions
- Pattern recognition for symptom clusters
- Risk stratification and red flag identification
- Specialty recommendations

### **Lab Analyzer**
Interprets laboratory test results with clinical context
- Abnormal value detection and interpretation
- Critical alerts for dangerous values
- Diagnostic suggestions based on lab patterns

### **Imaging Interpreter**
Reviews medical imaging studies (X-ray, CT, MRI, ultrasound)
- Primary finding identification
- Clinical significance assessment
- Follow-up imaging recommendations

## 🔄 Diagnostic Workflows

The system offers two diagnostic approaches:

### **Sequential Workflow** (`house-md-diagnostic`)
The classic House M.D. diagnostic process:
1. **Case Presentation** - Initial patient case setup
2. **Symptom Analysis** - Automated symptom evaluation
3. **Team Differentials** - Each agent provides their diagnosis
4. **House's Contrarian Analysis** - House challenges conventional thinking
5. **Wilson's Ethics Review** - Ensures patient welfare considerations
6. **Final Diagnosis** - House's breakthrough moment

### **Multi-Round Workflow** (`house-md-diagnostic-multiround`) 🆕
An intelligent adaptive diagnostic process with early exit capability:

**Round 1: Initial Team Analysis (0-2 hours)**
- Foreman, Cameron, and Chase analyze simultaneously
- Each provides diagnosis with confidence level and reasoning
- **Smart Early Exit Logic**: System evaluates if case meets criteria for immediate diagnosis
- Weighted scoring considers: team confidence, consensus, classic presentation, red flags, supporting evidence

**Early Exit Path (Classic Cases)**
- For textbook presentations (bacterial meningitis, STEMI, obvious lupus)
- All safety criteria met → immediate diagnosis in 2 hours
- Prevents dangerous delays in medical emergencies

**Full Investigation Path (Complex Cases)**
- **Round 2: House's Challenge & Investigation (8 hours)**
  - House challenges team assumptions with characteristic sarcasm
  - Symptoms evolve and worsen over time
  - Auto-generated lab results based on diagnostic theories
  - Team reacts to new evidence

- **Round 3: Final Breakthrough (18 hours)**
  - Wilson provides ethical review and patient advocacy
  - House makes final diagnostic leap with supporting evidence
  - Complete timeline and reasoning summary
  - Characteristic House wit in final diagnosis

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.9.0
- OpenAI API key (for AI agents)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd dr-house-in-house

# Install dependencies (already installed)
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI API key to .env
```

### Running the System
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

**System Access:**
- **Mastra Playground**: `http://localhost:4112` (or check console for actual port)
- **API Endpoint**: `http://localhost:4112/api`

## 📋 How to Test the System

### Using the Mastra Playground
1. **Start the system**: `npm run dev`
2. **Open**: `http://localhost:4112` (or check console for actual port)
3. **Choose your workflow**:
   - `house-md-diagnostic` - Original sequential approach (hardcoded logic for demonstration)
   - `house-md-diagnostic-multiround` - Smart adaptive approach with early exit logic 🆕
   - `ai-diagnostic-workflow` - **True AI-powered workflow using real agents and tools** ⭐
4. **Use sample JSON cases** from the `test-cases/` folder
5. **View results** in the traces section

### AI Diagnostic Workflow Features ⭐ **RECOMMENDED**
- **Real AI Agents**: Each House M.D. character powered by LLMs with unique medical perspectives
- **Actual Tool Usage**: Uses `symptom-checker`, `lab-analyzer`, and `imaging-interpreter` tools
- **Genuine Medical Reasoning**: True AI analysis, not hardcoded responses
- **Comprehensive Analysis**: 8-step diagnostic process with tool-based evidence gathering
- **Character-Authentic Responses**: AI agents respond in character (House's sarcasm, Wilson's ethics, etc.)
- **Dynamic Diagnosis**: AI-generated medical conclusions based on actual case analysis

### Multi-Round Workflow Features ✨
- **Intelligent Early Exit**: Automatically identifies classic cases and provides immediate diagnosis
- **Safety-First Logic**: Prevents dangerous delays for medical emergencies (meningitis, heart attacks)
- **Weighted Decision Making**: Considers confidence, consensus, presentation clarity, and supporting evidence
- **Symptom Evolution**: For complex cases, symptoms progress realistically over 18 hours
- **Auto-Generated Labs**: System creates relevant test results based on diagnostic theories
- **Team Dynamics**: See how each doctor reacts to new evidence
- **House's Challenges**: Multiple rounds of House questioning assumptions (for non-obvious cases)
- **Complete Timeline**: Track the diagnostic journey from 2 hours (early exit) to 18 hours (full investigation)

### Sample Patient Case
```json
{
  "patientId": "PATIENT-001",
  "age": 35,
  "sex": "female",
  "chiefComplaint": "Severe headache and confusion",
  "symptoms": [
    "severe headache",
    "confusion",
    "fever",
    "neck stiffness",
    "sensitivity to light"
  ],
  "medicalHistory": ["no significant medical history"],
  "medications": ["birth control pills"]
}
```

**Expected Output**: House's team will analyze the case and provide a final diagnosis with reasoning, treatment plan, and House's characteristic wit.

### More Test Cases
See the `test-cases/` folder for additional patient scenarios including:
- **01-meningitis-case.json** - Classic bacterial meningitis (triggers early exit)
- **02-lupus-case.json** - Systemic lupus erythematosus with autoimmune markers
- **03-heart-attack-case.json** - ST-elevation myocardial infarction
- **04-mysterious-neurological.json** - Complex neurological disorder (full investigation)
- **05-toxic-exposure.json** - Lead poisoning from occupational exposure
- **06-rare-infectious-disease.json** - Atypical presentation requiring House's expertise

## 🧪 Medical Accuracy Evaluation

### Running Evaluations
```bash
# Demo evaluation with sample cases
npx tsx src/evals/demo.ts

# Custom evaluation in your code
import { EvaluationRunner } from './src/evals';
const runner = new EvaluationRunner();
await runner.evaluateSingleCase('PATIENT-001', workflowResult);
```

### Evaluation Features
- **Diagnostic Accuracy Scoring**: 0-100% accuracy with detailed breakdown
- **Critical Miss Detection**: Identifies dangerous misdiagnoses  
- **Category Analysis**: Performance tracking by medical specialty
- **Partial Credit System**: Rewards related diagnoses and differential thinking
- **Batch Processing**: Evaluate multiple cases simultaneously
- **Non-Invasive**: Does not modify existing workflows, agents, or tools

### Expected Behavior by Case Type:

#### **AI Diagnostic Workflow (Recommended)**:
- **All Cases**: Complete AI-powered analysis using real agents and tools
- **Wilson's Disease**: Perfect test case - House should identify it correctly 
- **Meningitis**: Emergency protocols with immediate AI reasoning
- **Lupus**: "It's never lupus... except when it is" - genuine AI perspective

#### **Multi-Round Workflow**:
- **Early Exit Cases**: Meningitis, obvious heart attacks, classic lupus → 2-hour diagnosis
- **Full Investigation Cases**: Rare diseases, atypical presentations → 18-hour diagnostic journey

## 🏗️ Project Structure

```
src/mastra/
├── agents/           # AI agents for each doctor
│   ├── house-agent.ts
│   ├── wilson-agent.ts
│   ├── foreman-agent.ts
│   ├── cameron-agent.ts
│   └── chase-agent.ts
├── tools/            # Medical diagnostic tools
│   ├── symptom-checker.ts
│   ├── lab-analyzer.ts
│   ├── imaging-interpreter.ts
│   └── index.ts
├── workflows/        # Diagnostic process workflows
│   ├── diagnostic-workflow.ts      # Sequential workflow (hardcoded for demo)
│   ├── multi-round-diagnostic.ts   # Smart adaptive workflow with early exit
│   ├── ai-diagnostic-workflow.ts   # True AI-powered workflow ⭐ RECOMMENDED
│   └── weather-workflow.ts
├── evals/            # Medical accuracy evaluation system ⭐ NEW
│   ├── medical-accuracy-eval.ts    # Core evaluation logic
│   ├── test-cases.ts              # Test dataset with known diagnoses
│   ├── eval-runner.ts             # Evaluation execution system
│   ├── demo.ts                    # Demo evaluation script
│   └── index.ts                   # Evaluation system exports
└── index.ts         # Main Mastra configuration
```

## 🔧 Configuration

The system uses Mastra.ai's configuration in `src/mastra/index.ts`:
- **Agents**: All House M.D. team members
- **Workflows**: Diagnostic process automation
- **Storage**: LibSQL for memory and telemetry
- **Logger**: Pino logger for system monitoring

## ✅ Recent Fixes & Improvements

### **NEW: True AI-Powered Workflow** (Latest Addition) ⭐
- **Achievement**: Built `ai-diagnostic-workflow` that actually uses Mastra agents and tools
- **Real AI Agents**: Each House M.D. character powered by LLMs with authentic medical reasoning
- **Actual Tool Usage**: Integrates `symptom-checker`, `lab-analyzer`, and `imaging-interpreter` tools
- **Impact**: Genuine AI medical analysis instead of hardcoded responses

### **Fixed Workflow Data Flow**
- **Problem**: Steps weren't passing accumulated data through the workflow chain
- **Solution**: Each step now properly passes through all previous data plus its own output
- **Impact**: Workflows now execute correctly end-to-end

### **Improved Diagnosis Logic**
- **Problem**: Hard-coded string matching for final diagnosis detection
- **Solution**: Proper symptom analysis and team consensus-based diagnosis
- **Impact**: Accurate medical diagnoses for different conditions (meningitis, lupus, heart attacks, etc.)

### **Smart Early Exit System**
- **Problem**: Too-strict early exit criteria requiring ALL conditions to be met
- **Solution**: Weighted scoring system (7/11 points required)
- **Impact**: Realistic early exit for obvious cases while preserving full investigation for complex cases

### **Medical Accuracy Evaluation System** ⭐ **NEW**
- **Achievement**: Built comprehensive evaluation system for validating AI diagnostic accuracy
- **Features**: Non-invasive testing, diagnostic scoring, critical miss detection, category-based analysis
- **Impact**: Enables systematic measurement of AI diagnostic performance without affecting workflows

## 🏥 Medical Disclaimer

**⚠️ IMPORTANT**: This is a simulation system for educational and entertainment purposes only. It should **NEVER** be used for actual medical diagnosis or treatment decisions. Always consult qualified healthcare professionals for medical advice.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

ISC License - see LICENSE file for details

## 🎬 Inspiration

Based on the medical drama "House M.D." (2004-2012), this system captures the essence of differential diagnosis through team collaboration, personality conflicts, and brilliant medical deduction that made the show compelling.

*"It's never lupus... except when it is."* - Dr. Gregory House