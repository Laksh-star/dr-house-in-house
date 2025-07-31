// Dr. House Diagnostic System - Frontend JavaScript

class DiagnosticSystem {
    constructor() {
        this.mastraApiUrl = 'http://localhost:4111/api';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const form = document.getElementById('patientForm');
        const clearBtn = document.getElementById('clearBtn');
        
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        clearBtn.addEventListener('click', () => this.clearForm());
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const resultsSection = document.getElementById('resultsSection');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const resultsContent = document.getElementById('resultsContent');
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = '🔬 Analyzing Case...';
        resultsSection.style.display = 'block';
        loadingSpinner.style.display = 'block';
        resultsContent.innerHTML = '';
        
        try {
            // Collect form data
            const patientData = this.collectFormData();
            
            // Validate required fields
            if (!this.validatePatientData(patientData)) {
                this.showError('Please fill in all required fields.');
                return;
            }
            
            // Call the diagnostic workflow
            const diagnosis = await this.runDiagnosticWorkflow(patientData);
            
            // Display results
            this.displayResults(diagnosis);
            
        } catch (error) {
            console.error('Diagnostic error:', error);
            this.showError(`Diagnostic failed: ${error.message}`);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = '🔬 Run Dr. House Diagnostic Team';
            loadingSpinner.style.display = 'none';
        }
    }

    collectFormData() {
        const formData = new FormData(document.getElementById('patientForm'));
        
        // Collect basic info
        const patientData = {
            patientId: formData.get('patientId') || `PATIENT-${Date.now()}`,
            age: parseInt(formData.get('age')),
            sex: formData.get('sex'),
            chiefComplaint: formData.get('chiefComplaint'),
            symptoms: [],
            medicalHistory: [],
            medications: []
        };
        
        // Collect symptoms from checkboxes
        const checkedSymptoms = Array.from(document.querySelectorAll('input[name=\"symptoms\"]:checked'))
            .map(cb => cb.value);
        
        // Add other symptoms
        const otherSymptoms = formData.get('otherSymptoms');
        if (otherSymptoms) {
            const additionalSymptoms = otherSymptoms.split(',').map(s => s.trim()).filter(s => s);
            checkedSymptoms.push(...additionalSymptoms);
        }
        
        patientData.symptoms = checkedSymptoms;
        
        // Process medical history
        const medicalHistory = formData.get('medicalHistory');
        if (medicalHistory) {
            patientData.medicalHistory = medicalHistory.split(',').map(h => h.trim()).filter(h => h);
        }
        
        // Process medications
        const medications = formData.get('medications');
        if (medications) {
            patientData.medications = medications.split(',').map(m => m.trim()).filter(m => m);
        }
        
        // Process lab results (optional)
        const labResults = [];
        const labFields = ['wbc', 'hemoglobin', 'glucose', 'creatinine'];
        
        labFields.forEach(field => {
            const value = formData.get(field);
            if (value) {
                const units = {
                    wbc: 'cells/μL',
                    hemoglobin: 'g/dL',
                    glucose: 'mg/dL',
                    creatinine: 'mg/dL'
                };
                
                const referenceRanges = {
                    wbc: '4000-11000',
                    hemoglobin: '12.0-16.0',
                    glucose: '70-100',
                    creatinine: '0.6-1.2'
                };
                
                labResults.push({
                    testName: field.charAt(0).toUpperCase() + field.slice(1),
                    value: parseFloat(value),
                    unit: units[field],
                    referenceRange: referenceRanges[field]
                });
            }
        });
        
        // Add additional lab results
        const additionalLabs = formData.get('additionalLabs');
        if (additionalLabs) {
            // Parse additional labs (simple format: \"TEST: value unit\")
            const labLines = additionalLabs.split('\\n').map(line => line.trim()).filter(line => line);
            labLines.forEach(line => {
                const match = line.match(/^([^:]+):\\s*([\\d.]+)\\s*(.*)$/);
                if (match) {
                    labResults.push({
                        testName: match[1].trim(),
                        value: parseFloat(match[2]),
                        unit: match[3].trim() || '',
                        referenceRange: 'N/A'
                    });
                }
            });
        }
        
        if (labResults.length > 0) {
            patientData.labResults = labResults;
        }
        
        return patientData;
    }

    validatePatientData(data) {
        const required = ['patientId', 'age', 'sex', 'chiefComplaint'];
        return required.every(field => data[field] && data[field] !== '');
    }

    async runDiagnosticWorkflow(patientData) {
        const response = await fetch(`${this.mastraApiUrl}/workflows/house-md-diagnostic/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        return result;
    }

    displayResults(diagnosis) {
        const resultsContent = document.getElementById('resultsContent');
        
        // Check if we have the expected structure
        if (!diagnosis || !diagnosis.finalDiagnosis) {
            this.showError('Received unexpected response format from diagnostic system.');
            return;
        }
        
        const finalDx = diagnosis.finalDiagnosis;
        
        const html = `
            <div class=\"diagnosis-card\">
                <h3>
                    🎯 Final Diagnosis
                    <span class=\"confidence-badge confidence-${finalDx.confidence || 'medium'}\">
                        ${(finalDx.confidence || 'medium').toUpperCase()}
                    </span>
                </h3>
                
                <div class=\"diagnosis-details\">
                    <div class=\"detail-item\">
                        <h4>🏥 Diagnosis</h4>
                        <p>${finalDx.diagnosis || 'Unknown condition'}</p>
                    </div>
                    
                    <div class=\"detail-item\">
                        <h4>🧠 Medical Reasoning</h4>
                        <p>${finalDx.reasoning || 'No reasoning provided'}</p>
                    </div>
                    
                    <div class=\"detail-item\">
                        <h4>💊 Treatment Plan</h4>
                        <p>${finalDx.treatment || 'No treatment specified'}</p>
                    </div>
                    
                    <div class=\"detail-item\">
                        <h4>📈 Prognosis</h4>
                        <p>${finalDx.prognosis || 'Prognosis unclear'}</p>
                    </div>
                </div>
            </div>
            
            <div class=\"house-comment\">
                <strong>Dr. House says:</strong> \"${finalDx.house_comment || 'Everybody lies... but the labs don\\'t.'}\"
            </div>
            
            <div class=\"success-message\">
                <strong>✅ Diagnostic Complete!</strong> The team has reached a consensus. 
                Remember: This is a simulation for educational purposes only. 
                Always consult real medical professionals for actual health concerns.
            </div>
        `;
        
        resultsContent.innerHTML = html;
        
        // Scroll to results
        resultsContent.scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = `
            <div class=\"error-message\">
                <strong>❌ Error:</strong> ${message}
                <br><br>
                <strong>Troubleshooting:</strong>
                <ul style=\"margin-top: 10px; margin-left: 20px;\">
                    <li>Make sure the Mastra server is running on port 4112</li>
                    <li>Check that you've filled in all required fields</li>
                    <li>Verify your symptoms selection</li>
                    <li>Try refreshing the page and submitting again</li>
                </ul>
            </div>
        `;
    }

    clearForm() {
        if (confirm('Are you sure you want to clear all form data?')) {
            document.getElementById('patientForm').reset();
            document.getElementById('resultsSection').style.display = 'none';
            
            // Show success message
            const resultsContent = document.getElementById('resultsContent');
            resultsContent.innerHTML = `
                <div class=\"success-message\">
                    <strong>🗑️ Form Cleared!</strong> Ready for a new patient case.
                </div>
            `;
            document.getElementById('resultsSection').style.display = 'block';
            
            // Hide after 3 seconds
            setTimeout(() => {
                document.getElementById('resultsSection').style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DiagnosticSystem();
    
    // Add some helpful UI interactions
    addFormInteractions();
});

function addFormInteractions() {
    // Auto-generate patient ID if empty
    const patientIdField = document.getElementById('patientId');
    if (!patientIdField.value) {
        patientIdField.value = `PATIENT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
    
    // Add symptom counter
    const symptomCheckboxes = document.querySelectorAll('input[name=\"symptoms\"]');
    const updateSymptomCount = () => {
        const checkedCount = document.querySelectorAll('input[name=\"symptoms\"]:checked').length;
        let countDisplay = document.getElementById('symptomCount');
        
        if (!countDisplay) {
            countDisplay = document.createElement('div');
            countDisplay.id = 'symptomCount';
            countDisplay.style.cssText = 'font-size: 0.9rem; color: #666; margin-top: 10px; font-weight: 500;';
            document.querySelector('.symptoms-grid').parentNode.appendChild(countDisplay);
        }
        
        countDisplay.textContent = `Selected symptoms: ${checkedCount}`;
        countDisplay.style.color = checkedCount > 0 ? '#27ae60' : '#666';
    };
    
    symptomCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSymptomCount);
    });
    
    updateSymptomCount(); // Initial count
    
    // Add field validation feedback
    const requiredFields = ['patientId', 'age', 'sex', 'chiefComplaint'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                if (this.value.trim() === '') {
                    this.style.borderColor = '#e74c3c';
                } else {
                    this.style.borderColor = '#27ae60';
                }
            });
            
            field.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.style.borderColor = '#27ae60';
                }
            });
        }
    });
}