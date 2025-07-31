# 🏥 Dr. House Test Cases

This folder contains sample patient cases designed to test the diagnostic capabilities of the Dr. House multi-agent system. Each case represents a different type of medical mystery that would appear on the show.

## 📋 Test Cases Overview

### 01-meningitis-case.json
**Classic Emergency**: Bacterial meningitis in a college student
- **Symptoms**: Severe headache, neck stiffness, fever, photophobia
- **Key Learning**: Medical emergency requiring immediate diagnosis
- **Expected Diagnosis**: Bacterial meningitis
- **House Factor**: Obvious case, but House might look for complications

### 02-lupus-case.json  
**The "It's Never Lupus" Case**: Systemic lupus erythematosus
- **Symptoms**: Joint pain, butterfly rash, fatigue
- **Key Learning**: Classic autoimmune presentation
- **Expected Diagnosis**: Systemic Lupus Erythematosus (SLE)
- **House Factor**: House famously says "It's never lupus"... except this time it is!

### 03-heart-attack-case.json
**Cardiac Emergency**: Myocardial infarction with classic presentation
- **Symptoms**: Crushing chest pain, left arm pain, shortness of breath
- **Key Learning**: Typical heart attack in high-risk patient
- **Expected Diagnosis**: ST-elevation myocardial infarction (STEMI)
- **House Factor**: Too obvious for House - he'd look for underlying causes

### 04-mysterious-neurological.json
**The House Special**: Wilson's Disease (copper accumulation disorder)
- **Symptoms**: Progressive weakness, tremors, behavioral changes
- **Key Learning**: Rare genetic disorder with neurological and liver involvement
- **Expected Diagnosis**: Wilson's Disease
- **House Factor**: Perfect "zebra" diagnosis - rare disease masquerading as common symptoms

### 05-toxic-exposure.json
**Environmental Mystery**: Lead poisoning from vintage car restoration
- **Symptoms**: Abdominal pain, weakness, blue gum line
- **Key Learning**: Occupational/environmental exposure causing systemic illness
- **Expected Diagnosis**: Lead poisoning
- **House Factor**: Environmental detective work - patient history is key

### 06-rare-infectious-disease.json
**Geographic Medicine**: Histoplasmosis from cave exploration
- **Symptoms**: Fever, night sweats, enlarged lymph nodes, cough
- **Key Learning**: Travel/exposure history crucial for rare infections
- **Expected Diagnosis**: Disseminated histoplasmosis
- **House Factor**: Geographic and exposure clues lead to rare fungal infection

## 🎯 How to Use These Cases

1. **Start your system**: `npm run dev`
2. **Open Mastra playground**: `http://localhost:4111`
3. **Go to Workflows** → `house-md-diagnostic`
4. **Copy and paste** any JSON case from these files
5. **Run the workflow** and watch the diagnostic team analyze the case
6. **Check the traces** for the final diagnosis and House's witty comments

## 🏆 Expected Outcomes

Each case should trigger different aspects of the diagnostic team:

- **Foreman**: Will focus on neurological aspects and standard protocols
- **Cameron**: Will consider autoimmune and rare diseases  
- **Chase**: Will think about surgical and cardiac causes
- **Wilson**: Will provide ethical oversight and oncology perspective
- **House**: Will make the final breakthrough diagnosis with characteristic sarcasm

## 🎬 True to the Show

These cases are designed to mirror the types of medical mysteries featured in House M.D.:
- **Mix of obvious and obscure** diagnoses
- **Environmental and occupational** clues
- **Rare diseases** that mimic common conditions
- **Patient history** that provides crucial diagnostic clues
- **Multi-system involvement** requiring team collaboration

Remember: *"Everybody lies"* - so sometimes the real diagnosis comes from what patients don't tell you initially!

## ⚠️ Medical Disclaimer

These are fictional cases for educational and entertainment purposes only. Do not use for actual medical decision-making. Always consult qualified healthcare professionals for real medical concerns.