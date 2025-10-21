/**
 * Agent Health Monitor - Dashboard Application
 * Frontend logic for repo management, metrics display, and agent improvements
 */

const API_BASE = window.location.origin + '/api';

class AgentHealthApp {
  constructor() {
    this.currentRepo = null;
    this.repositories = [];
    this.agents = [];
    this.latestAnalysis = null;

    this.init();
  }

  async init() {
    console.log('🚀 Initializing Agent Health Monitor...');
    await this.loadRepositories();
  }

  // ========== Repository Management ==========

  async loadRepositories() {
    try {
      const response = await fetch(`${API_BASE}/repos`);
      this.repositories = await response.json();

      this.renderRepositories();

      // Auto-select first repo if available
      if (this.repositories.length > 0) {
        await this.selectRepository(this.repositories[0].id);
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
      this.showError('Failed to load repositories');
    }
  }

  renderRepositories() {
    const container = document.getElementById('repo-selector');

    if (this.repositories.length === 0) {
      container.innerHTML = '<div class="loading">No repositories configured. Click "Add Repository" to get started.</div>';
      return;
    }

    container.innerHTML = this.repositories
      .map(
        repo => `
        <div class="repo-card ${this.currentRepo?.id === repo.id ? 'selected' : ''}"
             onclick="app.selectRepository(${repo.id})">
          <div class="repo-name">${repo.name}</div>
          <div class="repo-path">${repo.path}</div>
        </div>
      `
      )
      .join('');
  }

  async selectRepository(repoId) {
    this.currentRepo = this.repositories.find(r => r.id === repoId);
    this.renderRepositories();

    // Show team health section
    document.getElementById('team-health').style.display = 'block';

    // Load latest analysis if exists
    await this.loadLeaderboard();
  }

  showAddRepoModal() {
    document.getElementById('add-repo-modal').classList.add('show');
  }

  closeAddRepoModal() {
    document.getElementById('add-repo-modal').classList.remove('show');
    document.getElementById('add-repo-form').reset();
  }

  async addRepository(event) {
    event.preventDefault();

    const formData = {
      name: document.getElementById('repo-name').value,
      path: document.getElementById('repo-path').value,
      techdebtgpt_url: document.getElementById('repo-techdebt-url').value,
      github_url: document.getElementById('repo-github-url').value || null
    };

    try {
      this.showLoading('Adding repository...');

      const response = await fetch(`${API_BASE}/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to add repository');
      }

      const repo = await response.json();
      this.repositories.push(repo);

      this.closeAddRepoModal();
      await this.loadRepositories();
      await this.selectRepository(repo.id);

      this.hideLoading();
      this.showSuccess('Repository added successfully');
    } catch (error) {
      this.hideLoading();
      console.error('Failed to add repository:', error);
      this.showError('Failed to add repository');
    }
  }

  // ========== Metrics Scraping ==========

  async scrapeMetrics() {
    if (!this.currentRepo) {
      this.showError('Please select a repository first');
      return;
    }

    try {
      this.showLoading('Scraping TechDebtGPT metrics...');

      const response = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: this.currentRepo.id })
      });

      if (!response.ok) {
        throw new Error('Scraping failed');
      }

      const result = await response.json();

      this.hideLoading();
      this.showSuccess(`Updated metrics for ${result.agents_updated} agents`);

      // Reload leaderboard
      await this.loadLeaderboard();
    } catch (error) {
      this.hideLoading();
      console.error('Scraping failed:', error);
      this.showError('Failed to scrape metrics from TechDebtGPT');
    }
  }

  // ========== Analysis ==========

  async runAnalysis() {
    if (!this.currentRepo) {
      this.showError('Please select a repository first');
      return;
    }

    try {
      this.showLoading('Analyzing agent performance...');

      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: this.currentRepo.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      this.latestAnalysis = await response.json();

      this.hideLoading();
      this.renderAnalysis();
      this.showSuccess('Analysis completed successfully');
    } catch (error) {
      this.hideLoading();
      console.error('Analysis failed:', error);
      this.showError(error.message || 'Failed to analyze agents');
    }
  }

  renderAnalysis() {
    if (!this.latestAnalysis) return;

    // Update team metrics
    document.getElementById('team-average').textContent =
      this.latestAnalysis.teamAverageScore.toFixed(1);
    document.getElementById('team-trend').textContent =
      this.getHealthLabel(this.latestAnalysis.teamAverageScore);

    document.getElementById('healthy-count').textContent =
      this.latestAnalysis.healthyAgents.length;
    document.getElementById('warning-count').textContent =
      this.latestAnalysis.warningAgents.length;
    document.getElementById('critical-count').textContent =
      this.latestAnalysis.criticalAgents.length;

    // Show analysis section
    document.getElementById('analysis-section').style.display = 'block';

    // Render detailed breakdown
    this.renderAnalysisDetails();

    // Generate and show recommendations
    this.renderRecommendations();
  }

  renderAnalysisDetails() {
    const container = document.getElementById('analysis-details');
    const { lowestPerformer, highestPerformer } = this.latestAnalysis;

    container.innerHTML = `
      <div class="analysis-card">
        <h3>🔴 Lowest Performer: ${lowestPerformer.name}</h3>
        <p style="color: var(--text-muted); margin-bottom: 1rem;">
          Overall Score: <strong style="color: var(--danger-color);">${lowestPerformer.score.toFixed(1)}/100</strong>
        </p>
        <div class="breakdown-grid">
          <div class="breakdown-item">
            <span class="breakdown-label">Productivity</span>
            <span class="breakdown-score ${this.getScoreClass(lowestPerformer.breakdown.productivity)}">
              ${lowestPerformer.breakdown.productivity.toFixed(1)}
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Quality</span>
            <span class="breakdown-score ${this.getScoreClass(lowestPerformer.breakdown.quality)}">
              ${lowestPerformer.breakdown.quality.toFixed(1)}
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Collaboration</span>
            <span class="breakdown-score ${this.getScoreClass(lowestPerformer.breakdown.collaboration)}">
              ${lowestPerformer.breakdown.collaboration.toFixed(1)}
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Reliability</span>
            <span class="breakdown-score ${this.getScoreClass(lowestPerformer.breakdown.reliability)}">
              ${lowestPerformer.breakdown.reliability.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div class="analysis-card">
        <h3>🟢 Highest Performer: ${highestPerformer.name}</h3>
        <p style="color: var(--text-muted); margin-bottom: 1rem;">
          Overall Score: <strong style="color: var(--success-color);">${highestPerformer.score.toFixed(1)}/100</strong>
        </p>
        <div class="breakdown-grid">
          <div class="breakdown-item">
            <span class="breakdown-label">Productivity</span>
            <span class="breakdown-score ${this.getScoreClass(highestPerformer.breakdown.productivity)}">
              ${highestPerformer.breakdown.productivity.toFixed(1)}
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Quality</span>
            <span class="breakdown-score ${this.getScoreClass(highestPerformer.breakdown.quality)}">
              ${highestPerformer.breakdown.quality.toFixed(1)}
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Collaboration</span>
            <span class="breakdown-score ${this.getScoreClass(highestPerformer.breakdown.collaboration)}">
              ${highestPerformer.breakdown.collaboration.toFixed(1)}
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Reliability</span>
            <span class="breakdown-score ${this.getScoreClass(highestPerformer.breakdown.reliability)}">
              ${highestPerformer.breakdown.reliability.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderRecommendations() {
    const container = document.getElementById('recommendations');
    const section = document.getElementById('recommendations-section');

    if (!this.latestAnalysis) return;

    const { lowestPerformer } = this.latestAnalysis;

    // Generate mock recommendations based on analysis
    const recommendations = this.generateRecommendations(lowestPerformer);

    container.innerHTML = recommendations
      .map(
        rec => `
        <div class="recommendation-card priority-${rec.priority}">
          <div class="recommendation-header">
            <div class="recommendation-title">${rec.title}</div>
            <span class="priority-badge ${rec.priority}">${rec.priority}</span>
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">${rec.description}</p>
          <ul class="recommendation-actions">
            ${rec.actions.map(action => `<li>${action}</li>`).join('')}
          </ul>
        </div>
      `
      )
      .join('');

    section.style.display = 'block';
  }

  generateRecommendations(agent) {
    const recommendations = [];
    const breakdown = agent.breakdown;

    if (breakdown.productivity < 60) {
      recommendations.push({
        priority: 'high',
        title: 'Increase Task Granularity and Commit Frequency',
        description: `${agent.name} has low productivity (${breakdown.productivity.toFixed(1)}). Focus on breaking work into smaller commits.`,
        actions: [
          'Break down work into smaller, atomic commits',
          'Commit after each logical unit of work',
          'Use conventional commit messages (feat:, fix:, refactor:)',
          'Target minimum 5 commits per sprint'
        ]
      });
    }

    if (breakdown.quality < 60) {
      recommendations.push({
        priority: 'critical',
        title: 'Enhance Code Quality Checks and Testing',
        description: `${agent.name} has quality issues (${breakdown.quality.toFixed(1)}). Strengthen testing and code review practices.`,
        actions: [
          'Add pre-commit linting and formatting checks',
          'Require unit tests for all new code',
          'Run test suite before committing',
          'Add code review checklist for self-review'
        ]
      });
    }

    if (breakdown.collaboration < 60) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve Code Review Participation',
        description: `${agent.name} needs better collaboration (${breakdown.collaboration.toFixed(1)}).`,
        actions: [
          'Review at least 2 PRs before submitting own PR',
          'Provide constructive feedback on code quality',
          'Ask clarifying questions on unclear implementations'
        ]
      });
    }

    if (breakdown.reliability < 60) {
      recommendations.push({
        priority: 'medium',
        title: 'Stabilize Velocity and Task Completion',
        description: `${agent.name} shows reliability concerns (${breakdown.reliability.toFixed(1)}).`,
        actions: [
          'Focus on completing tasks fully before starting new ones',
          'Break complex tasks into smaller milestones',
          'Maintain consistent daily activity'
        ]
      });
    }

    return recommendations;
  }

  async applyImprovements() {
    if (!this.latestAnalysis) {
      this.showError('Run analysis first');
      return;
    }

    const lowestPerformer = this.latestAnalysis.lowestPerformer;

    try {
      this.showLoading('Generating and applying improvements...');

      const response = await fetch(`${API_BASE}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: lowestPerformer.id,
          analysis: this.latestAnalysis,
          auto_apply: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply improvements');
      }

      const result = await response.json();

      this.hideLoading();
      this.showSuccess(
        `Improvements applied to ${lowestPerformer.name}'s agent definition!`
      );

      console.log('Improvement result:', result);
    } catch (error) {
      this.hideLoading();
      console.error('Failed to apply improvements:', error);
      this.showError('Failed to apply improvements');
    }
  }

  // ========== Leaderboard ==========

  async loadLeaderboard() {
    if (!this.currentRepo) return;

    try {
      const response = await fetch(`${API_BASE}/leaderboard?repo_id=${this.currentRepo.id}`);
      const agents = await response.json();

      this.renderLeaderboard(agents);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  }

  renderLeaderboard(agents) {
    const container = document.getElementById('leaderboard');
    const section = document.getElementById('leaderboard-section');

    if (agents.length === 0) {
      container.innerHTML = '<div class="loading">Run scraper to collect agent metrics...</div>';
      return;
    }

    container.innerHTML = agents
      .map(
        (agent, index) => `
        <div class="leaderboard-item">
          <div class="rank ${index < 3 ? `top-${index + 1}` : ''}">${index + 1}</div>
          <div class="agent-info">
            <div class="agent-name">${agent.name || 'Unknown Agent'}</div>
            <div class="agent-email">${agent.email}</div>
          </div>
          <div class="score">
            <div class="score-value ${this.getScoreClass(agent.health_score)}">
              ${(agent.health_score || 0).toFixed(1)}
            </div>
            <div class="score-label">Health</div>
          </div>
          <div class="metric-mini">
            <div class="metric-mini-value">${agent.commits || 0}</div>
            <div class="metric-mini-label">Commits</div>
          </div>
          <div class="metric-mini">
            <div class="metric-mini-value">${agent.pull_requests || 0}</div>
            <div class="metric-mini-label">PRs</div>
          </div>
          <div class="metric-mini">
            <div class="metric-mini-value">${agent.code_reviews || 0}</div>
            <div class="metric-mini-label">Reviews</div>
          </div>
          <div class="metric-mini">
            <div class="metric-mini-value">${agent.bugs_introduced || 0}</div>
            <div class="metric-mini-label">Bugs</div>
          </div>
        </div>
      `
      )
      .join('');

    section.style.display = 'block';
  }

  // ========== Utility Methods ==========

  getScoreClass(score) {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  getHealthLabel(score) {
    if (score >= 80) return '🟢 Healthy';
    if (score >= 60) return '🟡 Warning';
    return '🔴 Critical';
  }

  showLoading(message = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const text = overlay.querySelector('.loading-text');
    text.textContent = message;
    overlay.style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  showSuccess(message) {
    console.log('✅', message);
    // TODO: Add toast notification UI
    alert(message);
  }

  showError(message) {
    console.error('❌', message);
    // TODO: Add toast notification UI
    alert('Error: ' + message);
  }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new AgentHealthApp();
  });
} else {
  app = new AgentHealthApp();
}
