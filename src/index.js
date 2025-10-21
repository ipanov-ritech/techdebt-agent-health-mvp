/**
 * Main Entry Point for Agent Health Monitor
 * Orchestrates the full analysis pipeline
 */

const TechDebtGPTScraper = require('./scraper/techdebtgpt-scraper');
const AgentAnalyzer = require('./meta-agent/analyzer');
const AgentImprover = require('./meta-agent/agent-improver');
require('dotenv').config();

async function main() {
  console.log('🤖 Starting Agent Health Monitor Analysis...\n');

  try {
    // Step 1: Scrape metrics from TechDebtGPT
    console.log('📊 Step 1: Scraping TechDebtGPT metrics...');
    const scraper = new TechDebtGPTScraper();
    const scrapeResult = await scraper.scrape();

    if (!scrapeResult.success) {
      throw new Error('Failed to scrape TechDebtGPT: ' + scrapeResult.error);
    }

    console.log(`✅ Scraped metrics for ${scrapeResult.agents.length} agents\n`);

    // Step 2: Analyze agent performance
    console.log('🔍 Step 2: Analyzing agent performance...');
    const analyzer = new AgentAnalyzer();
    const analysis = analyzer.performFullAnalysis(scrapeResult.agents);

    console.log(`\n📈 Team Average Score: ${analysis.teamAverageScore.toFixed(1)}/100`);
    console.log(`🏆 Highest Performer: ${analysis.highestPerformer.name} (${analysis.highestPerformer.score.toFixed(1)})`);
    console.log(`⚠️  Lowest Performer: ${analysis.lowestPerformer.name} (${analysis.lowestPerformer.score.toFixed(1)})\n`);

    // Step 3: Generate improvements for underperformers
    if (analysis.criticalAgents.length > 0 || analysis.warningAgents.length > 0) {
      console.log('🔧 Step 3: Generating improvements...');

      const targetRepoPath = process.env.TARGET_REPO_PATH || 'C:/Repos/todo-ai-agents';
      const improver = new AgentImprover(targetRepoPath);

      // Focus on the lowest performer
      const lowestAgent = scrapeResult.agents.find(
        a => a.email === analysis.lowestPerformer.email
      );

      const improvements = await improver.generateImprovements(lowestAgent, analysis);

      console.log(`\n📝 Improvement Plan for ${improvements.agent}:`);
      console.log(`   Current Score: ${improvements.currentScore.toFixed(1)}/100`);
      console.log(`   Target Score: ${improvements.targetScore}/100`);
      console.log(`   Root Causes: ${improvements.rootCauses.length} identified`);
      console.log(`   Recommendations: ${improvements.recommendations.length} actions`);

      // Apply improvements if AUTO_APPLY is enabled
      if (process.env.AUTO_APPLY === 'true') {
        console.log('\n✏️  Applying improvements to agent definition...');
        const applyResult = await improver.applyImprovements(lowestAgent, improvements);

        if (applyResult.success) {
          console.log(`✅ Agent definition updated: ${applyResult.filePath}`);
        } else {
          console.log(`❌ Failed to apply improvements: ${applyResult.error}`);
        }
      } else {
        console.log('\n💡 To auto-apply improvements, set AUTO_APPLY=true in .env');
      }

      // Create GitHub issue if configured
      if (process.env.CREATE_GITHUB_ISSUE === 'true') {
        console.log('\n📋 Creating GitHub issue...');
        try {
          const issue = await improver.createGitHubIssue(lowestAgent, improvements);
          console.log(`✅ Issue created: ${issue.html_url}`);
        } catch (error) {
          console.log(`❌ Failed to create issue: ${error.message}`);
        }
      }
    } else {
      console.log('🎉 All agents are performing well! No improvements needed.\n');
    }

    console.log('\n✅ Analysis complete!');
    return { success: true, analysis, scrapeResult };
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { main };
