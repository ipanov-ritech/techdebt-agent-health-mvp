/**
 * Manual Demo Script
 * Demonstrates the complete agent health monitoring and improvement workflow
 * without requiring TechDebtGPT scraping
 */

const AgentAnalyzer = require('../meta-agent/analyzer');
const AgentImprover = require('../meta-agent/agent-improver');
const DemoDataGenerator = require('./test-data-generator');

async function runManualDemo() {
  console.log('🎯 Agent Health Monitor - Manual Demo\n');
  console.log('='  .repeat(60));

  // Step 1: Generate demo data
  console.log('\n📊 Step 1: Generating Agent Performance Data...\n');
  const generator = new DemoDataGenerator();
  const scenario = generator.generateDemoScenario();

  // Show initial state
  console.log('Iteration 1 - Initial Implementation:');
  scenario.iteration1.data.agents.forEach(agent => {
    console.log(`  ${agent.name.padEnd(20)} | Commits: ${String(agent.commits).padStart(2)} | Bugs: ${String(agent.bugsIntroduced).padStart(2)} | Velocity: ${agent.velocity}`);
  });

  // Step 2: Analyze performance
  console.log('\n🔍 Step 2: Analyzing Agent Performance...\n');
  const analyzer = new AgentAnalyzer();
  const analysis = analyzer.performFullAnalysis(scenario.iteration2.data.agents);

  console.log(`Team Average Score: ${analysis.teamAverageScore}/100`);
  console.log(`\n🏆 Highest Performer: ${analysis.highestPerformer.name} (${analysis.highestPerformer.score.toFixed(1)}/100)`);
  console.log(`⚠️  Lowest Performer: ${analysis.lowestPerformer.name} (${analysis.lowestPerformer.score.toFixed(1)}/100)`);

  console.log('\nPerformance Breakdown:');
  console.log(`  Productivity: ${analysis.lowestPerformer.breakdown.productivity}/100`);
  console.log(`  Quality: ${analysis.lowestPerformer.breakdown.quality}/100`);
  console.log(`  Collaboration: ${analysis.lowestPerformer.breakdown.collaboration}/100`);
  console.log(`  Reliability: ${analysis.lowestPerformer.breakdown.reliability}/100`);

  console.log(`\nAgent Status Summary:`);
  console.log(`  🟢 Healthy: ${analysis.healthyAgents.length}`);
  console.log(`  🟡 Warning: ${analysis.warningAgents.length}`);
  console.log(`  🔴 Critical: ${analysis.criticalAgents.length}`);

  // Step 3: Generate improvements
  console.log('\n🔧 Step 3: Generating Improvement Recommendations...\n');

  const lowestAgent = scenario.iteration2.data.agents.find(
    a => a.email === analysis.lowestPerformer.email
  );

  // Use current repo path or default
  const targetRepoPath = process.env.TARGET_REPO_PATH || 'C:/Repos/todo-ai-agents';
  const improver = new AgentImprover(targetRepoPath);
  const improvements = await improver.generateImprovements(lowestAgent, analysis);

  console.log(`Target Agent: ${improvements.agent}`);
  console.log(`Current Score: ${improvements.currentScore.toFixed(1)}/100`);
  console.log(`Target Score: ${improvements.targetScore}/100`);
  console.log(`Expected Impact: +${improvements.expectedImpact.estimatedScoreIncrease} points\n`);

  console.log('Root Causes Identified:');
  improvements.rootCauses.forEach((cause, i) => {
    console.log(`\n  ${i + 1}. ${cause.category} (${cause.severity} severity)`);
    console.log(`     Score: ${cause.score}/100`);
    cause.issues.forEach(issue => {
      console.log(`     - ${issue}`);
    });
  });

  console.log('\n\nRecommended Actions:');
  improvements.recommendations.forEach((rec, i) => {
    console.log(`\n  ${i + 1}. ${rec.title} (${rec.priority} priority)`);
    console.log(`     Actions:`);
    rec.actions.forEach(action => {
      console.log(`     - ${action}`);
    });
    console.log(`\n     Agent Prompt Changes:`);
    rec.agentPromptChanges.forEach(change => {
      console.log(`     • ${change}`);
    });
  });

  // Step 4: Show expected improvements
  console.log('\n\n📈 Step 4: Projected Impact After Improvements...\n');
  console.log('Iteration 3 - Post-Improvement Performance:');
  scenario.iteration3.data.agents.forEach(agent => {
    const icon = agent.email === lowestAgent.email ? '✨' : '  ';
    console.log(`${icon} ${agent.name.padEnd(20)} | Commits: ${String(agent.commits).padStart(2)} | Bugs: ${String(agent.bugsIntroduced).padStart(2)} | Velocity: ${agent.velocity}`);
  });

  // Re-analyze with improved metrics
  const improvedAnalysis = analyzer.performFullAnalysis(scenario.iteration3.data.agents);
  const improvedAgentData = improvedAnalysis.allAgents.find(
    a => a.email === lowestAgent.email
  );

  console.log('\nImprovement Results:');
  console.log(`  Previous Score: ${analysis.lowestPerformer.score.toFixed(1)}/100`);
  console.log(`  New Score: ${improvedAgentData.health.overall}/100`);
  console.log(`  Improvement: +${(improvedAgentData.health.overall - analysis.lowestPerformer.score).toFixed(1)} points`);
  console.log(`  Status Change: ${analysis.lowestPerformer.status} → ${improvedAgentData.health.status}`);

  // Step 5: Optional - Apply improvements to actual agent file
  console.log('\n\n💾 Step 5: Apply Improvements to Agent Definition?\n');

  if (process.env.AUTO_APPLY === 'true') {
    console.log('✏️  Applying improvements to agent definition file...');
    try {
      const applyResult = await improver.applyImprovements(lowestAgent, improvements);
      if (applyResult.success) {
        console.log(`✅ Agent definition updated: ${applyResult.filePath}`);
      } else {
        console.log(`❌ Failed to apply: ${applyResult.error}`);
      }
    } catch (error) {
      console.log(`❌ Error applying improvements: ${error.message}`);
    }
  } else {
    console.log('ℹ️  Set AUTO_APPLY=true in .env to automatically update agent definitions');
    console.log(`   Target file: ${improvements.agentDefinitionUpdates.filePath}`);
  }

  // Step 6: Optional - Create GitHub issue
  if (process.env.CREATE_GITHUB_ISSUE === 'true' && process.env.GITHUB_PAT) {
    console.log('\n📋 Creating GitHub issue with improvement plan...');
    try {
      const issue = await improver.createGitHubIssue(lowestAgent, improvements);
      console.log(`✅ Issue created: ${issue.html_url}`);
    } catch (error) {
      console.log(`❌ Failed to create issue: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Demo Complete!\n');

  // Save scenario data for reference
  generator.saveDemoData('./data/demo-scenario.json');
  console.log('📁 Full scenario data saved to: ./data/demo-scenario.json\n');

  return {
    scenario,
    analysis,
    improvements,
    improvedAnalysis
  };
}

// Run if executed directly
if (require.main === module) {
  runManualDemo()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Demo failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { runManualDemo };
