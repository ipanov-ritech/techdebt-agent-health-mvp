/**
 * Complete MVP Demo Runner
 * Demonstrates the full Agent Health Monitor workflow
 */

const DemoDataGenerator = require('./src/demo/test-data-generator');
const AgentAnalyzer = require('./src/meta-agent/analyzer');
const AgentImprover = require('./src/meta-agent/agent-improver');
const fs = require('fs');
require('dotenv').config();

async function runCompleteMVP() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  AGENT HEALTH MONITOR - MVP DEMONSTRATION');
  console.log('  Meta-Agent System for AI Development Team Optimization');
  console.log('═'.repeat(80));
  console.log('\n');

  try {
    // ============================================================================
    // STEP 1: GENERATE DEMO DATA (Simulates TechDebtGPT Scraping)
    // ============================================================================
    console.log('📊 STEP 1: COLLECTING AGENT PERFORMANCE DATA');
    console.log('─'.repeat(80));
    console.log('Simulating TechDebtGPT data collection...\n');

    const generator = new DemoDataGenerator();
    const scenario = generator.generateDemoScenario();

    // Display agents working on the project
    console.log('Team Composition:');
    scenario.iteration1.data.agents.forEach((agent, i) => {
      console.log(`  ${i + 1}. ${agent.name} (${agent.email})`);
      console.log(`     Role: ${agent.role}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log('Iteration 1 - Initial Sprint Performance:');
    console.log('─'.repeat(80));

    console.log('\n' + ' '.repeat(20) + 'Commits  PRs  Bugs  Reviews  Velocity');
    scenario.iteration1.data.agents.forEach(agent => {
      const name = agent.name.padEnd(20);
      const commits = String(agent.commits).padStart(7);
      const prs = String(agent.pullRequests).padStart(4);
      const bugs = String(agent.bugsIntroduced).padStart(5);
      const reviews = String(agent.codeReviews).padStart(8);
      const velocity = String(agent.velocity).padStart(9);
      console.log(`${name} ${commits} ${prs} ${bugs} ${reviews} ${velocity}`);
    });

    // ============================================================================
    // STEP 2: ANALYZE PERFORMANCE
    // ============================================================================
    console.log('\n\n');
    console.log('🔍 STEP 2: ANALYZING AGENT PERFORMANCE');
    console.log('─'.repeat(80));

    const analyzer = new AgentAnalyzer();
    const analysis = analyzer.performFullAnalysis(scenario.iteration2.data.agents);

    console.log(`\nTeam Health Overview:`);
    console.log(`  Average Score: ${analysis.teamAverageScore}/100`);
    console.log(`  🟢 Healthy Agents: ${analysis.healthyAgents.length}`);
    console.log(`  🟡 Warning Agents: ${analysis.warningAgents.length}`);
    console.log(`  🔴 Critical Agents: ${analysis.criticalAgents.length}`);

    console.log(`\n🏆 Highest Performer:`);
    console.log(`  ${analysis.highestPerformer.name}`);
    console.log(`  Score: ${analysis.highestPerformer.score}/100`);
    console.log(`  Status: ${analysis.highestPerformer.status}`);

    console.log(`\n⚠️  Lowest Performer (TARGET FOR IMPROVEMENT):`);
    console.log(`  ${analysis.lowestPerformer.name}`);
    console.log(`  Score: ${analysis.lowestPerformer.score}/100`);
    console.log(`  Status: ${analysis.lowestPerformer.status}`);

    console.log(`\n  Performance Breakdown:`);
    console.log(`    Productivity:   ${analysis.lowestPerformer.breakdown.productivity}/100`);
    console.log(`    Quality:        ${analysis.lowestPerformer.breakdown.quality}/100`);
    console.log(`    Collaboration:  ${analysis.lowestPerformer.breakdown.collaboration}/100`);
    console.log(`    Reliability:    ${analysis.lowestPerformer.breakdown.reliability}/100`);

    // ============================================================================
    // STEP 3: META-AGENT GENERATES IMPROVEMENTS
    // ============================================================================
    console.log('\n\n');
    console.log('🤖 STEP 3: META-AGENT IMPROVEMENT ANALYSIS');
    console.log('─'.repeat(80));

    const lowestAgent = scenario.iteration2.data.agents.find(
      a => a.email === analysis.lowestPerformer.email
    );

    const targetRepoPath = process.env.TARGET_REPO_PATH || 'C:/Repos/todo-ai-agents';
    const improver = new AgentImprover(targetRepoPath);
    const improvements = await improver.generateImprovements(lowestAgent, analysis);

    console.log(`\nTarget Agent: ${improvements.agent}`);
    console.log(`Current Performance: ${improvements.currentScore.toFixed(1)}/100`);
    console.log(`Target Performance: ${improvements.targetScore}/100`);
    console.log(`Expected Improvement: +${improvements.expectedImpact.estimatedScoreIncrease} points`);
    console.log(`Timeline: ${improvements.expectedImpact.timeToImprovement}`);
    console.log(`Confidence: ${improvements.expectedImpact.confidence}`);

    console.log(`\n📋 ROOT CAUSES IDENTIFIED:`);
    improvements.rootCauses.forEach((cause, i) => {
      console.log(`\n  ${i + 1}. ${cause.category} (${cause.severity} severity)`);
      console.log(`     Score: ${cause.score}/100`);
      console.log(`     Issues:`);
      cause.issues.forEach(issue => {
        console.log(`       • ${issue}`);
      });
    });

    console.log(`\n\n💡 IMPROVEMENT RECOMMENDATIONS:`);
    improvements.recommendations.forEach((rec, i) => {
      console.log(`\n  ${i + 1}. ${rec.title}`);
      console.log(`     Priority: ${rec.priority.toUpperCase()}`);
      console.log(`     Category: ${rec.category}`);
      console.log(`\n     Actions to Take:`);
      rec.actions.forEach(action => {
        console.log(`       □ ${action}`);
      });
      console.log(`\n     Agent Configuration Updates:`);
      rec.agentPromptChanges.forEach(change => {
        console.log(`       → ${change}`);
      });
    });

    // ============================================================================
    // STEP 4: SIMULATE POST-IMPROVEMENT PERFORMANCE
    // ============================================================================
    console.log('\n\n');
    console.log('📈 STEP 4: POST-IMPROVEMENT PERFORMANCE');
    console.log('─'.repeat(80));

    console.log('\nIteration 3 - After Implementing Improvements:\n');
    console.log(' '.repeat(20) + 'Commits  PRs  Bugs  Reviews  Velocity');

    scenario.iteration3.data.agents.forEach(agent => {
      const isImproved = agent.email === lowestAgent.email;
      const prefix = isImproved ? '✨ ' : '   ';
      const name = (prefix + agent.name).padEnd(20);
      const commits = String(agent.commits).padStart(7);
      const prs = String(agent.pullRequests).padStart(4);
      const bugs = String(agent.bugsIntroduced).padStart(5);
      const reviews = String(agent.codeReviews).padStart(8);
      const velocity = String(agent.velocity).padStart(9);
      console.log(`${name} ${commits} ${prs} ${bugs} ${reviews} ${velocity}`);
    });

    // Re-analyze with improved metrics
    const improvedAnalysis = analyzer.performFullAnalysis(scenario.iteration3.data.agents);
    const improvedAgentData = improvedAnalysis.allAgents.find(
      a => a.email === lowestAgent.email
    );

    console.log(`\n📊 IMPROVEMENT RESULTS:`);
    console.log(`  Agent: ${improvedAgentData.name}`);
    console.log(`  Previous Score: ${analysis.lowestPerformer.score.toFixed(1)}/100`);
    console.log(`  New Score: ${improvedAgentData.health.overall}/100`);
    console.log(`  Actual Improvement: +${(improvedAgentData.health.overall - analysis.lowestPerformer.score).toFixed(1)} points`);
    console.log(`  Status Change: ${analysis.lowestPerformer.status} → ${improvedAgentData.health.status}`);

    console.log(`\n  New Performance Breakdown:`);
    console.log(`    Productivity:   ${improvedAgentData.health.breakdown.productivity}/100 (was ${analysis.lowestPerformer.breakdown.productivity}/100)`);
    console.log(`    Quality:        ${improvedAgentData.health.breakdown.quality}/100 (was ${analysis.lowestPerformer.breakdown.quality}/100)`);
    console.log(`    Collaboration:  ${improvedAgentData.health.breakdown.collaboration}/100 (was ${analysis.lowestPerformer.breakdown.collaboration}/100)`);
    console.log(`    Reliability:    ${improvedAgentData.health.breakdown.reliability}/100 (was ${analysis.lowestPerformer.breakdown.reliability}/100)`);

    // ============================================================================
    // STEP 5: SAVE RESULTS
    // ============================================================================
    console.log('\n\n');
    console.log('💾 STEP 5: SAVING RESULTS');
    console.log('─'.repeat(80));

    // Save all data
    const results = {
      timestamp: new Date().toISOString(),
      scenario,
      initialAnalysis: analysis,
      improvements,
      finalAnalysis: improvedAnalysis
    };

    fs.writeFileSync('./data/mvp-demo-results.json', JSON.stringify(results, null, 2));
    console.log('\n✅ Complete results saved to: ./data/mvp-demo-results.json');

    generator.saveDemoData('./data/demo-scenario.json');

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n\n');
    console.log('═'.repeat(80));
    console.log('  MVP DEMONSTRATION COMPLETE');
    console.log('═'.repeat(80));

    console.log('\n📦 Key Deliverables:');
    console.log('  ✓ Agent performance monitoring and health scoring');
    console.log('  ✓ Automated identification of underperforming agents');
    console.log('  ✓ Root cause analysis with severity classification');
    console.log('  ✓ Actionable improvement recommendations');
    console.log('  ✓ Measurable performance improvement tracking');

    console.log('\n🎯 Business Value:');
    console.log(`  • Identified ${improvements.rootCauses.length} critical performance issues`);
    console.log(`  • Generated ${improvements.recommendations.length} specific improvement actions`);
    console.log(`  • Achieved ${(improvedAgentData.health.overall - analysis.lowestPerformer.score).toFixed(1)} point improvement`);
    console.log(`  • ${improvements.expectedImpact.timeToImprovement} to full implementation`);

    console.log('\n📁 Output Files:');
    console.log('  • ./data/mvp-demo-results.json - Complete analysis results');
    console.log('  • ./data/demo-scenario.json - Test scenario data');
    console.log('  • ./screenshots/ - Visual documentation');

    console.log('\n');
    console.log('═'.repeat(80));
    console.log('\n');

    return { success: true, results };

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run the demo
if (require.main === module) {
  runCompleteMVP()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runCompleteMVP };
