// ===== Navigation Active State =====
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// ===== Smooth Scroll Function =====
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== Appliance Selection =====
const applianceCards = document.querySelectorAll('.appliance-card');
const diagnosisForm = document.getElementById('diagnosisForm');
let selectedAppliance = '';

applianceCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove active class from all cards
        applianceCards.forEach(c => c.classList.remove('active'));

        // Add active class to clicked card
        card.classList.add('active');

        // Get selected appliance
        selectedAppliance = card.getAttribute('data-appliance');

        // Show diagnosis form with animation
        diagnosisForm.classList.add('active');

        // Scroll to form
        diagnosisForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});

// ===== Close Diagnosis Form =====
function closeDiagnosisForm() {
    diagnosisForm.classList.remove('active');
    applianceCards.forEach(c => c.classList.remove('active'));
    selectedAppliance = '';
}

// ===== Form Submission =====
const troubleshootForm = document.getElementById('troubleshootForm');

troubleshootForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const brand = document.getElementById('brand').value;
    const errorCode = document.getElementById('errorCode').value;
    const symptoms = document.getElementById('symptoms').value;
    const isUrgent = document.getElementById('urgency').checked;

    // Show AI processing modal
    showLoadingModal();

    try {
        const response = await fetch('http://localhost:3000/api/diagnose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appliance: selectedAppliance,
                brand,
                errorCode,
                symptoms,
                isUrgent
            })
        });

        // Even if it's a 500 error, we return a structured JSON response from the server as a fallback.
        // So we should try to parse the JSON regardless of the response.ok status.
        let results;
        try {
            results = await response.json();
        } catch (e) {
            throw new Error('Failed to parse response from server.');
        }

        // Hide loading and show results modal
        // Note: Adding a small delay just to let the loading animation play for UX
        setTimeout(() => {
            showResultsModal(results);
        }, 500);

    } catch (error) {
        console.error('Error during diagnosis:', error);
        alert('Failed to connect to the diagnosis service. Please ensure the backend is running.');
        closeModal();
    }
});

// ===== Show Loading Modal =====
function showLoadingModal() {
    const modal = document.getElementById('resultsModal');
    const modalBody = document.getElementById('resultsBody');

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 0;">
            <div style="width: 60px; height: 60px; border: 4px solid rgba(59, 130, 246, 0.2); border-top: 4px solid #3b82f6; border-radius: 50%; margin: 0 auto 1.5rem; animation: spin 1s linear infinite;"></div>
            <h3 style="margin-bottom: 0.5rem;">Analyzing Your Appliance...</h3>
            <p style="color: var(--text-secondary);">Our AI is diagnosing the issue</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    modal.classList.add('active');
}

// Data and backend logic migrated to server.js API endpoints

// ===== Show Results Modal =====
function showResultsModal(results) {
    const modal = document.getElementById('resultsModal');
    const modalBody = document.getElementById('resultsBody');

    let issuesHTML = '';
    results.commonIssues.forEach((issue, index) => {
        const solutionsHTML = issue.solutions.map(solution => `
            <li style="margin-bottom: 0.75rem; padding-left: 1.5rem; position: relative;">
                <span style="position: absolute; left: 0; color: var(--accent-primary);">→</span>
                ${solution}
            </li>
        `).join('');

        issuesHTML += `
            <div style="margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-tertiary); border-left: 4px solid var(--accent-primary); border-radius: var(--radius-sm);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">${issue.issue}</h4>
                    <span style="padding: 0.25rem 0.75rem; background: rgba(59, 130, 246, 0.2); color: var(--accent-primary); border-radius: 20px; font-size: 0.875rem; font-weight: 600;">${issue.probability}% Match</span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">TIME</div>
                        <div style="font-weight: 600;">${issue.estimatedTime}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">DIFFICULTY</div>
                        <div style="font-weight: 600;">${issue.difficulty}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">EST. COST</div>
                        <div style="font-weight: 600;">${issue.cost}</div>
                    </div>
                </div>
                
                <h5 style="margin-bottom: 1rem; font-size: 1rem;">Troubleshooting Steps:</h5>
                <ol style="color: var(--text-secondary); line-height: 1.8;">
                    ${solutionsHTML}
                </ol>
            </div>
        `;
    });

    modalBody.innerHTML = `
        <div style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <svg style="width: 24px; height: 24px; color: var(--success);" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2 L12 2 C17.5 2 22 6.5 22 12 C22 17.5 17.5 22 12 22 C6.5 22 2 17.5 2 12 C2 6.5 6.5 2 12 2 Z M10 16 L18 8 L16.6 6.6 L10 13.2 L7.4 10.6 L6 12 L10 16 Z"/>
                </svg>
                <h3 style="color: var(--success); margin: 0;">Diagnosis Complete</h3>
            </div>
            <p style="color: var(--text-secondary); margin: 0;">We've identified the most likely issues based on your symptoms.</p>
        </div>
        
        <h3 style="margin-bottom: 1.5rem; font-size: 1.5rem;">${results.title}</h3>
        
        ${issuesHTML}
        
        <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md);">
            <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: var(--danger);">
                <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2 L12 2 C17.5 2 22 6.5 22 12 C22 17.5 17.5 22 12 22 C6.5 22 2 17.5 2 12 C2 6.5 6.5 2 12 2 Z M11 7 L11 13 L13 13 L13 7 L11 7 Z M11 15 L11 17 L13 17 L13 15 L11 15 Z"/>
                </svg>
                Safety Warning
            </h4>
            <ul style="color: var(--text-secondary); line-height: 1.8; margin: 0; padding-left: 1.5rem;">
                <li>Always disconnect power before attempting repairs</li>
                <li>If you're not comfortable with these steps, contact a professional</li>
                <li>Follow all manufacturer safety guidelines</li>
                <li>Use proper tools and safety equipment</li>
            </ul>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <button onclick="printResults()" class="btn btn-secondary" style="flex: 1;">
                Print Guide
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4 L5 1 L15 1 L15 4 M4 4 L16 4 L16 12 L4 12 Z M6 8 L6 19 L14 19 L14 8" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
            </button>
            <button onclick="resetForm()" class="btn btn-primary" style="flex: 1;">
                New Diagnosis
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 10 A6 6 0 1 1 16 10 M10 4 L10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    modal.classList.add('active');
}

// ===== Close Modal =====
function closeModal() {
    const modal = document.getElementById('resultsModal');
    modal.classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('resultsModal').addEventListener('click', (e) => {
    if (e.target.id === 'resultsModal') {
        closeModal();
    }
});

// ===== Print Results =====
function printResults() {
    window.print();
}

// ===== Reset Form =====
function resetForm() {
    troubleshootForm.reset();
    closeModal();
    closeDiagnosisForm();
}

// ===== Add scroll animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards and other elements
document.querySelectorAll('.feature-card, .appliance-card, .step-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ===== Add keyboard shortcuts =====
document.addEventListener('keydown', (e) => {
    // Escape key closes modals and forms
    if (e.key === 'Escape') {
        closeModal();
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (diagnosisForm.classList.contains('active')) {
            closeDiagnosisForm();
        }
    }
});

// ===== Authentication Logic =====
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authErrorMsg = document.getElementById('authErrorMsg');
const authSuccessMsg = document.getElementById('authSuccessMsg');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authModalTitle = document.getElementById('authModalTitle');
const navUserText = document.getElementById('navUserText');
const logoutBtn = document.getElementById('logoutBtn');
const authNavItem = document.getElementById('authNavItem');

let currentAuthTab = 'login'; // 'login' or 'signup'

function openAuthModal(e) {
    if (e) e.preventDefault();
    if (localStorage.getItem('token')) {
        // User is logged in, show logout option in modal
        authModalTitle.textContent = 'Account';
        document.querySelector('.auth-tabs').style.display = 'none';
        authEmail.parentElement.style.display = 'none';
        authPassword.parentElement.style.display = 'none';
        authSubmitBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        // User not logged in, show login/signup
        authModalTitle.textContent = 'Login';
        document.querySelector('.auth-tabs').style.display = 'flex';
        authEmail.parentElement.style.display = 'block';
        authPassword.parentElement.style.display = 'block';
        authSubmitBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        switchAuthTab('login');
    }
    authErrorMsg.style.display = 'none';
    authSuccessMsg.style.display = 'none';
    authForm.reset();
    authModal.classList.add('active');
}

function closeAuthModal() {
    authModal.classList.remove('active');
}

function switchAuthTab(tab) {
    currentAuthTab = tab;
    document.getElementById('tabLogin').classList.remove('active');
    document.getElementById('tabSignup').classList.remove('active');
    document.getElementById('tabSignup').style.color = 'rgba(255,255,255,0.5)';
    document.getElementById('tabLogin').style.color = 'rgba(255,255,255,0.5)';
    document.getElementById('tabSignup').style.borderBottomColor = 'transparent';
    document.getElementById('tabLogin').style.borderBottomColor = 'transparent';
    
    const activeBtn = document.getElementById(tab === 'login' ? 'tabLogin' : 'tabSignup');
    activeBtn.classList.add('active');
    activeBtn.style.color = 'var(--text-color)';
    activeBtn.style.borderBottomColor = 'var(--primary-color)';
    
    authSubmitBtn.textContent = tab === 'login' ? 'Login' : 'Sign Up';
    authModalTitle.textContent = tab === 'login' ? 'Login' : 'Sign Up';
    authErrorMsg.style.display = 'none';
    authSuccessMsg.style.display = 'none';
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authErrorMsg.style.display = 'none';
        authSuccessMsg.style.display = 'none';
        
        const email = authEmail.value;
        const password = authPassword.value;
        const endpoint = currentAuthTab === 'login' ? '/api/login' : '/api/signup';
        
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Processing...';
        
        try {
            const response = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed');
            }
            
            // Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            
            authSuccessMsg.textContent = data.message;
            authSuccessMsg.style.display = 'block';
            updateNavState();
            
            setTimeout(() => {
                closeAuthModal();
            }, 1500);
            
        } catch (error) {
            authErrorMsg.textContent = error.message;
            authErrorMsg.style.display = 'block';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = currentAuthTab === 'login' ? 'Login' : 'Sign Up';
        }
    });
}

function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    updateNavState();
    closeAuthModal();
}

function updateNavState() {
    if (!navUserText) return;
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        const namePart = userEmail.split('@')[0];
        navUserText.textContent = namePart;
        authNavItem.querySelector('a').style.borderColor = '#10b981'; // Success color
    } else {
        navUserText.textContent = 'Login';
        authNavItem.querySelector('a').style.borderColor = 'var(--primary-color)';
    }
}

// Close auth modal when clicking outside
if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target.id === 'authModal') {
            closeAuthModal();
        }
    });
}

// Initialize Nav State and open Auth Modal if not logged in
document.addEventListener('DOMContentLoaded', () => {
    updateNavState();
    if (!localStorage.getItem('token')) {
        // Delay slightly for visual effect
        setTimeout(() => {
            openAuthModal();
        }, 500);
    }
});

// ===== Initialize =====
console.log('Fix My Device - Troubleshooting System Initialized');
console.log('Ready to diagnose appliance issues!');
