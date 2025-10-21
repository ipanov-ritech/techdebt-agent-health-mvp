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

  // Generate recommendations based on weaknesses
  const recommendations = [];

  if (agent.weaknesses.quality < 70) {
    recommendations.push('Add comprehensive unit tests before implementation (TDD approach)');
    recommendations.push('Set code coverage minimum to 80% for all new features');
    recommendations.push('Implement pre-commit hooks for linting and testing');
  }

  if (agent.weaknesses.productivity < 70) {
    recommendations.push(`Increase commit frequency to ${Math.max(12 - agent.commits, 5)}+ more per sprint`);
    recommendations.push('Break work into smaller, atomic commits with conventional commit messages');
  }

  if (agent.weaknesses.collaboration < 70) {
    recommendations.push(`Review at least ${Math.max(5 - agent.reviews, 3)} more PRs before submitting own code`);
    recommendations.push('Provide constructive, specific feedback on architecture and patterns');
  }

  if (agent.weaknesses.reliability < 70) {
    recommendations.push('Complete one task fully before starting another');
    recommendations.push('Break complex tasks (>4 hours) into smaller subtasks');
    recommendations.push('Report blockers within 30 minutes of identification');
  }

  list.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
  section.classList.remove('hidden');
}

async function applyImprovements() {
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
