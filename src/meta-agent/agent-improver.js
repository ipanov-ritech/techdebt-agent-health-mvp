/**
 * Agent Improver
 * Analyzes root causes of underperformance and generates improvements
 * Modifies agent definition files in the target repository
 */

const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

class AgentImprover {
  constructor(targetRepoPath) {
    this.targetRepoPath = targetRepoPath;
    this.octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  }

  /**
   * Generate comprehensive improvements for an underperforming agent
   * @param {Object} agent - Agent data with metrics
   * @param {Object} analysis - Analysis results from AgentAnalyzer
   * @returns {Object} Improvement plan
   */
  async generateImprovements(agent, analysis) {
    console.log(`🔧 Generating improvements for ${agent.name}...`);

    const rootCauses = this.analyzeRootCauses(agent, analysis);
    const recommendations = this.generateRecommendations(rootCauses, agent);
    const agentUpdates = await this.generateAgentDefinitionUpdates(agent, rootCauses, recommendations);

    return {
      agent: agent.name,
      email: agent.email,
      currentScore: analysis.lowestPerformer.score,
      targetScore: Math.min(analysis.lowestPerformer.score + 25, 85),
      rootCauses: rootCauses,
      recommendations: recommendations,
      agentDefinitionUpdates: agentUpdates,
      expectedImpact: this.calculateExpectedImpact(rootCauses)
    };
  }

  /**
   * Analyze why agent is underperforming
   */
  analyzeRootCauses(agent, analysis) {
    const causes = [];
    const breakdown = analysis.lowestPerformer.breakdown;

    // Productivity issues
    if (breakdown.productivity < 60) {
      const productivityCauses = [];

      if (agent.commits < 5) {
        productivityCauses.push('Insufficient commit frequency');
      }
      if (agent.pull_requests < 2) {
        productivityCauses.push('Low PR submission rate');
      }

      causes.push({
        category: 'Productivity',
        severity: 'high',
        score: breakdown.productivity,
        issues: productivityCauses,
        metrics: {
          commits: agent.commits,
          pullRequests: agent.pull_requests,
          linesChanged: (agent.lines_added || 0) + (agent.lines_deleted || 0)
        }
      });
    }

    // Quality issues
    if (breakdown.quality < 60) {
      const qualityIssues = [];

      if (agent.bugs_introduced > 2) {
        qualityIssues.push(`High bug introduction rate (${agent.bugs_introduced} bugs)`);
      }
      if (agent.tech_debt_score > 50) {
        qualityIssues.push(`Elevated technical debt score (${agent.tech_debt_score})`);
      }

      causes.push({
        category: 'Quality',
        severity: 'critical',
        score: breakdown.quality,
        issues: qualityIssues,
        metrics: {
          bugsIntroduced: agent.bugs_introduced,
          techDebtScore: agent.tech_debt_score
        }
      });
    }

    // Collaboration issues
    if (breakdown.collaboration < 60) {
      causes.push({
        category: 'Collaboration',
        severity: 'medium',
        score: breakdown.collaboration,
        issues: [`Insufficient code reviews (${agent.code_reviews || 0} reviews)`],
        metrics: {
          codeReviews: agent.code_reviews || 0
        }
      });
    }

    // Reliability issues
    if (breakdown.reliability < 60) {
      causes.push({
        category: 'Reliability',
        severity: 'medium',
        score: breakdown.reliability,
        issues: ['Inconsistent velocity or task completion'],
        metrics: {
          velocity: agent.velocity
        }
      });
    }

    return causes;
  }

  /**
   * Generate specific, actionable recommendations
   */
  generateRecommendations(rootCauses, agent) {
    const recommendations = [];

    rootCauses.forEach(cause => {
      switch (cause.category) {
        case 'Productivity':
          recommendations.push({
            priority: 'high',
            category: 'Productivity',
            title: 'Increase task granularity and commit frequency',
            actions: [
              'Break down work into smaller, atomic commits',
              'Commit after each logical unit of work (function, component, test)',
              'Use conventional commit messages (feat:, fix:, refactor:)',
              'Set target: minimum 5 commits per sprint'
            ],
            agentPromptChanges: [
              'Add instruction: "Make frequent, atomic commits after each completed unit"',
              'Add checkpoint: "Commit code after implementing each function or component"',
              'Add workflow: "Always commit tests together with implementation"'
            ]
          });
          break;

        case 'Quality':
          recommendations.push({
            priority: 'critical',
            category: 'Quality',
            title: 'Enhance code quality checks and testing',
            actions: [
              'Add pre-commit linting and formatting checks',
              'Require unit tests for all new code',
              'Run test suite before committing',
              'Add code review checklist for self-review'
            ],
            agentPromptChanges: [
              'Add instruction: "Always write unit tests before implementation (TDD)"',
              'Add quality gate: "Run `npm run lint && npm test` before every commit"',
              'Add self-review step: "Review own code for edge cases and error handling"',
              'Add constraint: "Maximum cyclomatic complexity: 10 per function"'
            ]
          });
          break;

        case 'Collaboration':
          recommendations.push({
            priority: 'medium',
            category: 'Collaboration',
            title: 'Improve code review participation',
            actions: [
              'Review at least 2 PRs before submitting own PR',
              'Provide constructive feedback on code quality',
              'Ask clarifying questions on unclear implementations',
              'Learn from other agents\' approaches'
            ],
            agentPromptChanges: [
              'Add workflow: "Review 2 open PRs before creating your own"',
              'Add guideline: "Focus reviews on logic, edge cases, and test coverage"',
              'Add learning: "Note patterns and techniques used by high-performing agents"'
            ]
          });
          break;

        case 'Reliability':
          recommendations.push({
            priority: 'medium',
            category: 'Reliability',
            title: 'Stabilize velocity and task completion',
            actions: [
              'Focus on completing tasks fully before starting new ones',
              'Break complex tasks into smaller milestones',
              'Maintain consistent daily activity',
              'Communicate blockers early'
            ],
            agentPromptChanges: [
              'Add discipline: "Complete one task fully before starting another"',
              'Add workflow: "If task takes > 4 hours, break into subtasks"',
              'Add communication: "Report blockers within 30 minutes of identification"'
            ]
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Generate specific updates to agent definition file
   */
  async generateAgentDefinitionUpdates(agent, rootCauses, recommendations) {
    const updates = {
      filePath: `.claude/agents/${agent.email.split('@')[0]}-agent.md`,
      sections: []
    };

    // Generate new sections to add to agent definition
    recommendations.forEach(rec => {
      const section = {
        title: rec.title,
        priority: rec.priority,
        content: this.formatAgentInstructions(rec.agentPromptChanges)
      };
      updates.sections.push(section);
    });

    // Generate specific instruction blocks
    updates.instructionsToAdd = [
      '## Performance Improvement Plan',
      `**Current Health Score**: ${Math.round(agent.health_score || 0)}/100`,
      `**Target Score**: ${Math.round((agent.health_score || 0) + 25)}/100`,
      '',
      '### Critical Areas for Improvement',
      ...rootCauses.map(cause => `- **${cause.category}**: ${cause.issues.join(', ')}`),
      '',
      '### New Guidelines',
      ...recommendations.flatMap(rec => rec.agentPromptChanges.map(change => `- ${change}`))
    ].join('\n');

    return updates;
  }

  formatAgentInstructions(changes) {
    return changes.map(change => `- ${change}`).join('\n');
  }

  /**
   * Calculate expected improvement impact
   */
  calculateExpectedImpact(rootCauses) {
    let totalImpact = 0;

    rootCauses.forEach(cause => {
      switch (cause.severity) {
        case 'critical':
          totalImpact += 30;
          break;
        case 'high':
          totalImpact += 20;
          break;
        case 'medium':
          totalImpact += 10;
          break;
      }
    });

    return {
      estimatedScoreIncrease: Math.min(totalImpact, 40),
      timeToImprovement: '1-2 sprints',
      confidence: rootCauses.length > 2 ? 'medium' : 'high'
    };
  }

  /**
   * Apply improvements to agent definition file
   */
  async applyImprovements(agent, improvements) {
    try {
      const agentFilePath = path.join(
        this.targetRepoPath,
        improvements.agentDefinitionUpdates.filePath
      );

      console.log(`📝 Updating agent definition: ${agentFilePath}`);

      // Read current agent definition
      let content = await fs.readFile(agentFilePath, 'utf-8');

      // Check if improvements section already exists
      const improvementMarker = '## Performance Improvement Plan';
      if (content.includes(improvementMarker)) {
        // Replace existing improvement section
        const regex = new RegExp(
          `${improvementMarker}[\\s\\S]*?(?=\\n## |$)`,
          'g'
        );
        content = content.replace(regex, improvements.agentDefinitionUpdates.instructionsToAdd);
      } else {
        // Append improvements section
        content += '\n\n' + improvements.agentDefinitionUpdates.instructionsToAdd;
      }

      // Write updated content
      await fs.writeFile(agentFilePath, content, 'utf-8');

      console.log(`✅ Agent definition updated successfully`);

      return {
        success: true,
        filePath: agentFilePath,
        changes: improvements.agentDefinitionUpdates.instructionsToAdd,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to apply improvements:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create GitHub issue documenting the improvement
   */
  async createGitHubIssue(agent, improvements) {
    const [owner, repo] = process.env.TARGET_REPO_OWNER.split('/');

    const issueBody = `
## Agent Health Alert: ${agent.name}

**Current Health Score**: ${improvements.currentScore}/100
**Status**: 🔴 Requires Immediate Attention

### Root Causes Identified

${improvements.rootCauses.map(cause => `
#### ${cause.category} (${cause.severity} severity)
- Score: ${cause.score}/100
- Issues:
${cause.issues.map(issue => `  - ${issue}`).join('\n')}
`).join('\n')}

### Recommended Actions

${improvements.recommendations.map(rec => `
#### ${rec.title} (Priority: ${rec.priority})

**Actions**:
${rec.actions.map(action => `- [ ] ${action}`).join('\n')}

**Agent Configuration Updates**:
${rec.agentPromptChanges.map(change => `- ${change}`).join('\n')}
`).join('\n')}

### Expected Impact

- **Score Increase**: +${improvements.expectedImpact.estimatedScoreIncrease} points
- **Timeline**: ${improvements.expectedImpact.timeToImprovement}
- **Confidence**: ${improvements.expectedImpact.confidence}

---

*Generated by Agent Health Monitor Meta-Agent*
*Timestamp: ${new Date().toISOString()}*
    `;

    try {
      const response = await this.octokit.issues.create({
        owner,
        repo,
        title: `[Agent Health] Improve ${agent.name} Performance`,
        body: issueBody,
        labels: ['agent-health', 'meta-agent', 'improvement']
      });

      console.log(`✅ GitHub issue created: ${response.data.html_url}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create GitHub issue:', error);
      throw error;
    }
  }
}

module.exports = AgentImprover;
