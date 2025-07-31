#!/usr/bin/env node

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test cases
const testCasesPath = join(__dirname, 'test-cases', 'early-exit-test.json');
const testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));

const API_BASE = 'http://localhost:4113/api';

async function testWorkflow(testCase, expectedResult) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`Expected: ${expectedResult}`);
    
    const response = await fetch(`${API_BASE}/workflows/house-md-diagnostic-multiround/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.case),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    // Check if early exit occurred
    const earlyExit = result.roundSummary?.earlyExit === true;
    const roundsCompleted = result.roundSummary?.roundsCompleted || 0;
    
    console.log(`✅ Result: ${earlyExit ? 'EARLY EXIT' : 'FULL INVESTIGATION'}`);
    console.log(`   Rounds completed: ${roundsCompleted}`);
    console.log(`   Diagnosis: ${result.finalDiagnosis?.diagnosis || 'Unknown'}`);
    console.log(`   Total time: ${result.roundSummary?.totalTime || 'Unknown'}`);
    
    // Verify expectations
    const correct = (expectedResult === 'EARLY EXIT' && earlyExit) || 
                   (expectedResult === 'FULL INVESTIGATION' && !earlyExit);
    
    if (correct) {
      console.log(`✅ TEST PASSED`);
    } else {
      console.log(`❌ TEST FAILED - Expected ${expectedResult}, got ${earlyExit ? 'EARLY EXIT' : 'FULL INVESTIGATION'}`);
    }
    
    return correct;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🏥 Testing Dr. House Early-Exit Logic\n');
  
  let passed = 0;
  let total = 0;
  
  // Test early exit cases
  for (const testCase of testCases.earlyExitCases) {
    const result = await testWorkflow(testCase, 'EARLY EXIT');
    if (result) passed++;
    total++;
  }
  
  // Test full investigation cases
  for (const testCase of testCases.fullInvestigationCases) {
    const result = await testWorkflow(testCase, 'FULL INVESTIGATION');
    if (result) passed++;
    total++;
  }
  
  console.log(`\n📊 Summary: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Early-exit logic is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logic and safety criteria.');
  }
}

runAllTests().catch(console.error);