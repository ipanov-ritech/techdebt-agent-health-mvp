/**
 * Test Data Generator for Demo Scenario
 * Generates realistic agent performance data for demonstration
 */

class DemoDataGenerator {
  constructor() {
    this.agents = [
      {
        name: 'Product Owner AI',
        email: 'techdebtdemo2025po@outlook.com',
        role: 'Product Owner',
        basePerformance: 0.85 // Strong performer
      },
      {
        name: 'Backend AI',
        email: 'techdebtdemo2025be@outlook.com',
        role: 'Backend Developer',
        basePerformance: 0.45 // Underperformer - will be targeted for improvement
      },
      {
        name: 'Frontend AI',
        email: 'techdebtdemo2025fe@gmail.com',
        role: 'Frontend Developer',
        basePerformance: 0.75 // Good performer
      },
      {
        name: 'DevOps AI',
        email: 'devops-agent-bot@todo-ai-agents.demo',
        role: 'DevOps Engineer',
        basePerformance: 0.70 // Average performer
      }
    ];
  }

  /**
   * Generate realistic metrics for an agent based on their performance level
   */
  generateAgentMetrics(agent, iterationNumber = 1) {
    const perf = agent.basePerformance;
    const variance = () => (Math.random() - 0.5) * 0.1;

    // Metrics vary based on performance level
    const metrics = {
      // Basic activity metrics
      commits: Math.max(0, Math.round((perf * 10 + variance() * 3) * iterationNumber)),
      pullRequests: Math.max(0, Math.round((perf * 4 + variance() * 2) * iterationNumber)),
      codeReviews: Math.max(0, Math.round((perf * 5 + variance() * 2) * iterationNumber)),

      // Quality metrics (inverse relationship for bad metrics)
      bugsIntroduced: Math.max(0, Math.round(((1 - perf) * 5 + variance() * 2) * iterationNumber)),
      techDebtScore: Math.max(0, Math.round((1 - perf) * 100 + variance() * 10)),

      // Productivity metrics
      linesAdded: Math.max(0, Math.round((perf * 500 + variance() * 100) * iterationNumber)),
      linesDeleted: Math.max(0, Math.round((perf * 200 + variance() * 50) * iterationNumber)),
      velocity: Math.max(0, parseFloat((perf * 10 + variance()).toFixed(1))),

      // Metadata
      name: agent.name,
      email: agent.email,
      role: agent.role,
      timestamp: new Date().toISOString()
    };

    return metrics;
  }

  /**
   * Generate complete team metrics for a demo iteration
   */
  generateIterationData(iterationNumber = 1) {
    const timestamp = new Date().toISOString();

    return {
      success: true,
      timestamp: timestamp,
      iteration: iterationNumber,
      agents: this.agents.map(agent => this.generateAgentMetrics(agent, iterationNumber))
    };
  }

  /**
   * Generate improved metrics for an agent after recommendations
   */
  generateImprovedMetrics(agentEmail, currentMetrics, improvementFactor = 0.3) {
    const agent = this.agents.find(a => a.email === agentEmail);
    if (!agent) return currentMetrics;

    // Simulate improvement
    const improvedPerformance = Math.min(0.85, agent.basePerformance + improvementFactor);
    const tempAgent = { ...agent, basePerformance: improvedPerformance };

    return this.generateAgentMetrics(tempAgent, 1);
  }

  /**
   * Generate realistic scenario data for the complete demo
   */
  generateDemoScenario() {
    return {
      scenario: {
        name: "Cross-Functional Feature Development",
        description: "4 AI agents collaborating on a user authentication feature",
        iterations: 3
      },
      iteration1: {
        name: "Initial Implementation",
        description: "Agents implement basic authentication flow",
        data: this.generateIterationData(1),
        expectedOutcome: "Backend AI identified as lowest performer"
      },
      iteration2: {
        name: "Bug Fixes and Improvements",
        description: "Team addresses issues from iteration 1",
        data: this.generateIterationData(2),
        expectedOutcome: "Backend AI still struggling with quality metrics"
      },
      metaAgentIntervention: {
        name: "Meta-Agent Analysis",
        description: "System analyzes Backend AI and suggests improvements",
        targetAgent: "techdebtdemo2025be@outlook.com",
        recommendations: [
          "Increase test coverage requirements",
          "Add pre-commit validation hooks",
          "Break down tasks into smaller units",
          "Require code review before submission"
        ]
      },
      iteration3: {
        name: "Post-Improvement Performance",
        description: "Backend AI implements recommended improvements",
        data: (() => {
          const data = this.generateIterationData(3);
          // Improve backend agent's metrics
          const backendAgent = data.agents.find(a => a.email === 'techdebtdemo2025be@outlook.com');
          if (backendAgent) {
            Object.assign(backendAgent, this.generateImprovedMetrics(backendAgent.email, backendAgent));
          }
          return data;
        })(),
        expectedOutcome: "Backend AI shows 30-40% improvement in key metrics"
      }
    };
  }

  /**
   * Save demo data to file for use in testing
   */
  saveDemoData(filepath = './data/demo-scenario.json') {
    const fs = require('fs');
    const path = require('path');

    const scenario = this.generateDemoScenario();

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(scenario, null, 2));
    console.log(`✅ Demo scenario saved to ${filepath}`);

    return scenario;
  }
}

// CLI usage
if (require.main === module) {
  const generator = new DemoDataGenerator();
  const scenario = generator.generateDemoScenario();

  console.log('\n📊 Demo Scenario Generated:\n');
  console.log('Iteration 1 - Initial Implementation:');
  scenario.iteration1.data.agents.forEach(agent => {
    console.log(`  ${agent.name}: ${agent.commits} commits, ${agent.bugsIntroduced} bugs, velocity ${agent.velocity}`);
  });

  console.log('\nIteration 2 - Bug Fixes:');
  scenario.iteration2.data.agents.forEach(agent => {
    console.log(`  ${agent.name}: ${agent.commits} commits, ${agent.bugsIntroduced} bugs, velocity ${agent.velocity}`);
  });

  console.log('\n🔧 Meta-Agent Intervention:');
  console.log(`  Target: ${scenario.metaAgentIntervention.targetAgent}`);
  console.log(`  Recommendations: ${scenario.metaAgentIntervention.recommendations.length}`);

  console.log('\nIteration 3 - Post-Improvement:');
  scenario.iteration3.data.agents.forEach(agent => {
    console.log(`  ${agent.name}: ${agent.commits} commits, ${agent.bugsIntroduced} bugs, velocity ${agent.velocity}`);
  });

  // Save to file
  generator.saveDemoData();
}

module.exports = DemoDataGenerator;
