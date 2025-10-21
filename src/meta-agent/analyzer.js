/**
 * Meta-Agent Analyzer
 * Analyzes agent performance data and identifies underperformers
 */

require('dotenv').config();

class AgentAnalyzer {
  constructor(thresholds = null) {
    this.thresholds = thresholds || {
      minTaskCompletionRate: parseFloat(process.env.MIN_TASK_COMPLETION_RATE) || 60,
      minCodeQualityScore: parseFloat(process.env.MIN_CODE_QUALITY_SCORE) || 70,
      maxBugRate: parseFloat(process.env.MAX_BUG_RATE) || 0.15,
      minCommitsPerSprint: 5,
      minPRsPerSprint: 2
    };
  }

  /**
   * Calculate comprehensive health score for an agent
   * @param {Object} agent - Agent metrics from TechDebtGPT
   * @returns {Object} Health score and breakdown
   */
  calculateHealthScore(agent) {
    const scores = {
      productivity: this.calculateProductivityScore(agent),
      quality: this.calculateQualityScore(agent),
      collaboration: this.calculateCollaborationScore(agent),
      reliability: this.calculateReliabilityScore(agent)
    };

    // Weighted average
    const weights = {
      productivity: 0.3,
      quality: 0.35,
      collaboration: 0.2,
      reliability: 0.15
    };

    const overallScore = Object.keys(scores).reduce((sum, key) => {
      return sum + scores[key] * weights[key];
    }, 0);

    return {
      overall: Math.round(overallScore),
      breakdown: scores,
      weights: weights,
      status: this.getHealthStatus(overallScore)
    };
  }

  calculateProductivityScore(agent) {
    const commitScore = Math.min((agent.commits / this.thresholds.minCommitsPerSprint) * 100, 100);
    const prScore = Math.min((agent.pullRequests / this.thresholds.minPRsPerSprint) * 100, 100);

    return Math.round((commitScore + prScore) / 2);
  }

  calculateQualityScore(agent) {
    // Inverse relationship with bugs
    const bugPenalty = agent.bugsIntroduced * 10;
    const baseScore = 100 - bugPenalty;

    // Tech debt score (assume lower is better)
    const techDebtScore = Math.max(0, 100 - agent.techDebtScore);

    return Math.round(Math.max(0, (baseScore + techDebtScore) / 2));
  }

  calculateCollaborationScore(agent) {
    const reviewScore = Math.min((agent.codeReviews / 3) * 100, 100);
    return Math.round(reviewScore);
  }

  calculateReliabilityScore(agent) {
    // Based on consistency and velocity
    const velocityScore = Math.min(agent.velocity * 10, 100);
    return Math.round(velocityScore);
  }

  getHealthStatus(score) {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  /**
   * Analyze all agents and rank by performance
   * @param {Array} agents - Array of agent metrics
   * @returns {Object} Analysis results
   */
  analyzeTeam(agents) {
    console.log(`🔍 Analyzing ${agents.length} agents...`);

    const analyzed = agents.map(agent => ({
      ...agent,
      health: this.calculateHealthScore(agent)
    }));

    // Sort by overall health score (lowest first)
    analyzed.sort((a, b) => a.health.overall - b.health.overall);

    const lowestPerformer = analyzed[0];
    const highestPerformer = analyzed[analyzed.length - 1];

    const teamAverage = analyzed.reduce((sum, a) => sum + a.health.overall, 0) / analyzed.length;

    return {
      timestamp: new Date().toISOString(),
      teamSize: agents.length,
      teamAverageScore: Math.round(teamAverage),
      lowestPerformer: {
        name: lowestPerformer.name,
        email: lowestPerformer.email,
        score: lowestPerformer.health.overall,
        status: lowestPerformer.health.status,
        breakdown: lowestPerformer.health.breakdown
      },
      highestPerformer: {
        name: highestPerformer.name,
        email: highestPerformer.email,
        score: highestPerformer.health.overall
      },
      criticalAgents: analyzed.filter(a => a.health.status === 'critical'),
      warningAgents: analyzed.filter(a => a.health.status === 'warning'),
      healthyAgents: analyzed.filter(a => a.health.status === 'healthy'),
      allAgents: analyzed
    };
  }

  /**
   * Identify root causes for underperformance
   * @param {Object} agent - Agent with health analysis
   * @returns {Array} Root causes
   */
  identifyRootCauses(agent) {
    const causes = [];

    if (agent.health.breakdown.productivity < 60) {
      causes.push({
        category: 'productivity',
        issue: 'Low commit and PR velocity',
        severity: 'high',
        metrics: {
          commits: agent.commits,
          pullRequests: agent.pullRequests
        }
      });
    }

    if (agent.health.breakdown.quality < 60) {
      causes.push({
        category: 'quality',
        issue: 'High bug introduction rate or technical debt',
        severity: 'critical',
        metrics: {
          bugsIntroduced: agent.bugsIntroduced,
          techDebtScore: agent.techDebtScore
        }
      });
    }

    if (agent.health.breakdown.collaboration < 60) {
      causes.push({
        category: 'collaboration',
        issue: 'Insufficient code reviews',
        severity: 'medium',
        metrics: {
          codeReviews: agent.codeReviews
        }
      });
    }

    if (agent.health.breakdown.reliability < 60) {
      causes.push({
        category: 'reliability',
        issue: 'Inconsistent velocity',
        severity: 'medium',
        metrics: {
          velocity: agent.velocity
        }
      });
    }

    return causes;
  }

  /**
   * Generate improvement recommendations
   * @param {Object} agent - Agent with health analysis
   * @param {Array} rootCauses - Identified root causes
   * @returns {Array} Recommendations
   */
  generateRecommendations(agent, rootCauses) {
    const recommendations = [];

    rootCauses.forEach(cause => {
      switch (cause.category) {
        case 'productivity':
          recommendations.push({
            priority: 'high',
            action: 'Update agent instructions to increase commit frequency',
            details: 'Add more granular task breakdown and commit checkpoints',
            expectedImpact: '+20% productivity score'
          });
          break;

        case 'quality':
          recommendations.push({
            priority: 'critical',
            action: 'Enhance agent quality checks and testing requirements',
            details: 'Add pre-commit hooks, linting rules, and test coverage requirements',
            expectedImpact: '+30% quality score'
          });
          break;

        case 'collaboration':
          recommendations.push({
            priority: 'medium',
            action: 'Require agent to review PRs before submitting own',
            details: 'Add code review step to agent workflow',
            expectedImpact: '+15% collaboration score'
          });
          break;

        case 'reliability':
          recommendations.push({
            priority: 'medium',
            action: 'Adjust agent workload and task complexity',
            details: 'Break down complex tasks into smaller, more manageable pieces',
            expectedImpact: '+10% reliability score'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Complete analysis with recommendations
   * @param {Array} agents - Agent metrics
   * @returns {Object} Full analysis report
   */
  performFullAnalysis(agents) {
    const teamAnalysis = this.analyzeTeam(agents);

    // Focus on lowest performer
    const lowestAgent = teamAnalysis.allAgents[0];
    const rootCauses = this.identifyRootCauses(lowestAgent);
    const recommendations = this.generateRecommendations(lowestAgent, rootCauses);

    return {
      ...teamAnalysis,
      detailedAnalysis: {
        agent: lowestAgent.name,
        email: lowestAgent.email,
        rootCauses: rootCauses,
        recommendations: recommendations
      }
    };
  }
}

module.exports = AgentAnalyzer;
