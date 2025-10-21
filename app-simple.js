/**
 * Agent Health Monitor - Simple Demo App
 */

let detectedAgents = [];
let analysisResults = null;

async function detectAgents() {
  const folderPath = document.getElementById('folderPath').value;

  if (!folderPath) {
    alert('Please enter a folder path');
    return;
  }

  // Call backend to detect agents
  try {
    const response = await fetch('http://localhost:3001/api/detect-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath })
    });

    const data = await response.json();
    detectedAgents = data.agents;

    displayAgents();
  } catch (error) {
    console.error('Error detecting agents:', error);
    alert('Error detecting agents. Make sure the server is running.');
  }
}

function displayAgents() {
  const container = document.getElementById('agentsContainer');
  const section = document.getElementById('agentsSection');

  if (detectedAgents.length === 0) {
    container.innerHTML = '<div class="loading">No agents found in the specified folder.</div>';
    section.classList.remove('hidden');
    return;
  }

  container.innerHTML = `
    <div class="agents-grid">
      ${detectedAgents.map(agent => `
        <div class="agent-card">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-role">${agent.role}</div>
          <div class="status-badge badge-success">Detected</div>
        </div>
      `).join('')}
    </div>
  `;

  section.classList.remove('hidden');
}

async function runAnalysis() {
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsSection = document.getElementById('resultsSection');

  resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Running performance analysis...</div>';
  resultsSection.classList.remove('hidden');

  // Mock sync with TechDebtGPT - simulate delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Call backend to run analysis
  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents: detectedAgents })
    });

    analysisResults = await response.json();
    displayResults();
  } catch (error) {
    console.error('Error running analysis:', error);
    resultsContainer.innerHTML = '<div class="loading">Error running analysis</div>';
  }
}

function displayResults() {
  const container = document.getElementById('resultsContainer');

  container.innerHTML = `
    <div class="agents-grid">
      ${analysisResults.agents.map(agent => {
        const scoreClass = agent.score >= 80 ? 'healthy' : agent.score >= 60 ? 'warning' : 'critical';
        const fillClass = agent.score >= 80 ? 'fill-healthy' : agent.score >= 60 ? 'fill-warning' : 'fill-critical';
        const isLowest = agent.email === analysisResults.lowestPerformer.email;

        return `
          <div class="agent-card ${isLowest ? 'lowest' : ''}" style="cursor: pointer;" onclick="selectAgentToImprove('${agent.email}')">
            <div class="agent-name">${agent.name}</div>
            <div class="agent-role">${agent.role}</div>

            <div class="agent-score">
              <span class="score-label">Health Score</span>
              <span class="score-value score-${scoreClass}">${agent.score}/100</span>
            </div>

            <div class="progress-bar">
              <div class="progress-fill ${fillClass}" style="width: ${agent.score}%"></div>
            </div>

            <div class="metrics-row">
              <div class="metric-item">
                <span class="metric-label">Commits</span>
                <span class="metric-value">${agent.commits}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">PRs</span>
                <span class="metric-value">${agent.pullRequests}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Bugs</span>
                <span class="metric-value">${agent.bugs}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Reviews</span>
                <span class="metric-value">${agent.reviews}</span>
              </div>
            </div>

            ${isLowest ? '<div class="status-badge badge-danger" style="margin-top: 1rem;">Lowest Performer - Click to Improve</div>' :
                         (agent.score < 80 ? '<div class="status-badge badge-warning" style="margin-top: 1rem;">Click to Improve</div>' : '')}
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Show improvement section for lowest performer by default
  displayImprovements(analysisResults.lowestPerformer);
}

let selectedAgent = null;

function selectAgentToImprove(agentEmail) {
  selectedAgent = analysisResults.agents.find(a => a.email === agentEmail);
  displayImprovements(selectedAgent);
}

function displayImprovements(agent) {
  selectedAgent = agent;
  const section = document.getElementById('improvementSection');
  const list = document.getElementById('recommendations');
  const title = document.querySelector('.improvement-title');
  const button = document.querySelector('#improvementSection .btn-success');

  // Update title and button for selected agent
  title.textContent = `🎯 Recommended Improvements for ${agent.name}`;
  button.textContent = `✨ Apply Improvements to ${agent.name}`;

  // Generate role-specific recommendations
  const recommendations = [];

  // Determine agent's primary role
  const role = agent.role.toLowerCase();
  const isProductOwner = role.includes('product') || role.includes('pm');
  const isFrontend = role.includes('frontend') || role.includes('ui');
  const isDevOps = role.includes('devops') || role.includes('infrastructure');
  const isBackend = !isProductOwner && !isFrontend && !isDevOps;

  // Role-specific improvement recommendations
  if (isProductOwner) {
    if (agent.weaknesses.quality < 70) {
      recommendations.push(`<strong>Requirements Quality:</strong> Define clear, testable acceptance criteria for every user story`);
      recommendations.push(`Follow "As a [user], I want [goal] so that [benefit]" structure for all stories`);
    }
    if (agent.weaknesses.productivity < 70) {
      recommendations.push(`<strong>Backlog Management:</strong> Conduct ${Math.max(12 - agent.commits, 3)}+ backlog refinement sessions per sprint`);
      recommendations.push(`Ensure all upcoming stories are estimated and prioritized before sprint planning`);
    }
    if (agent.weaknesses.collaboration < 70) {
      recommendations.push(`<strong>Stakeholder Engagement:</strong> Provide clear product vision and roadmap updates to the team`);
      recommendations.push(`Gather and incorporate feedback from ${Math.max(5 - agent.reviews, 3)}+ team members per sprint`);
    }
    if (agent.weaknesses.reliability < 70) {
      recommendations.push(`<strong>Product Delivery:</strong> Prevent scope creep by clearly defining MVP requirements`);
      recommendations.push(`Maintain updated release roadmap with realistic timelines`);
    }
  } else if (isFrontend) {
    if (agent.weaknesses.quality < 70) {
      recommendations.push(`<strong>UI/UX Quality:</strong> Write unit tests for all React components using Jest/Testing Library`);
      recommendations.push(`Ensure WCAG 2.1 AA compliance for all UI components`);
    }
    if (agent.weaknesses.productivity < 70) {
      recommendations.push(`<strong>Frontend Velocity:</strong> Make ${Math.max(12 - agent.commits, 5)}+ commits per sprint`);
      recommendations.push(`Build atomic, reusable UI components and optimize bundle size`);
    }
    if (agent.weaknesses.collaboration < 70) {
      recommendations.push(`<strong>Design Collaboration:</strong> Review ${Math.max(5 - agent.reviews, 3)}+ UI/UX implementations from team`);
      recommendations.push(`Coordinate with backend team on data requirements and API integration`);
    }
    if (agent.weaknesses.reliability < 70) {
      recommendations.push(`<strong>Frontend Reliability:</strong> Implement comprehensive error boundaries and user-friendly error messages`);
      recommendations.push(`Ensure mobile responsiveness across all screen sizes`);
    }
  } else if (isDevOps) {
    if (agent.weaknesses.quality < 70) {
      recommendations.push(`<strong>Infrastructure Quality:</strong> Write tests for Terraform/CloudFormation templates`);
      recommendations.push(`Add automated security scanning to CI/CD pipeline`);
    }
    if (agent.weaknesses.productivity < 70) {
      recommendations.push(`<strong>Automation Efficiency:</strong> Make ${Math.max(12 - agent.commits, 5)}+ automation commits per sprint`);
      recommendations.push(`Reduce CI/CD pipeline execution time and automate manual deployment steps`);
    }
    if (agent.weaknesses.collaboration < 70) {
      recommendations.push(`<strong>DevOps Collaboration:</strong> Review ${Math.max(5 - agent.reviews, 3)}+ infrastructure PRs`);
      recommendations.push(`Document and train team on CI/CD processes`);
    }
    if (agent.weaknesses.reliability < 70) {
      recommendations.push(`<strong>System Reliability:</strong> Implement redundancy and failover mechanisms`);
      recommendations.push(`Test backup and recovery procedures regularly`);
    }
  } else if (isBackend) {
    if (agent.weaknesses.quality < 70) {
      recommendations.push(`<strong>Code Quality & Testing:</strong> Write comprehensive unit tests for all API endpoints and business logic`);
      recommendations.push(`Maintain minimum 80% test coverage for backend services`);
    }
    if (agent.weaknesses.productivity < 70) {
      recommendations.push(`<strong>Development Velocity:</strong> Make ${Math.max(12 - agent.commits, 5)}+ atomic commits per sprint`);
      recommendations.push(`Document all new endpoints using OpenAPI/Swagger`);
    }
    if (agent.weaknesses.collaboration < 70) {
      recommendations.push(`<strong>Team Collaboration:</strong> Review ${Math.max(5 - agent.reviews, 3)}+ backend PRs focusing on architecture`);
      recommendations.push(`Coordinate with frontend team on API contract changes`);
    }
    if (agent.weaknesses.reliability < 70) {
      recommendations.push(`<strong>System Reliability:</strong> Implement comprehensive logging and error tracking`);
      recommendations.push(`Test all database migrations thoroughly before deployment`);
    }
  }

  // Add common recommendations if no specific weaknesses found
  if (recommendations.length === 0) {
    recommendations.push('Agent is performing well across all metrics! 🎉');
    recommendations.push('Continue maintaining current standards and best practices');
  }

  list.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
  section.classList.remove('hidden');
}

async function applyImprovements(event) {
  const button = event.target;
  button.disabled = true;
  button.textContent = '⏳ Applying improvements...';

  try {
    const response = await fetch('http://localhost:3001/api/improve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: selectedAgent,
        folderPath: document.getElementById('folderPath').value
      })
    });

    const result = await response.json();

    button.textContent = '✅ Improvements Applied!';

    const successMsg = document.getElementById('successMessage');
    successMsg.className = 'success-message';
    successMsg.innerHTML = `
      <span>✅</span>
      <div>
        <strong>Success!</strong> ${selectedAgent.name} definition has been updated with ${result.improvementsAdded} improvements.
        <br>
        <small>File: ${result.filePath}</small>
      </div>
    `;
  } catch (error) {
    console.error('Error applying improvements:', error);
    button.textContent = '❌ Error applying improvements';
    button.disabled = false;
  }
}
