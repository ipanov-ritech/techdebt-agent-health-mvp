/**
 * Express Backend Server for Agent Health Monitor
 * Provides API endpoints for agent metrics, analysis, and improvements
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const Database = require('./database');
const TechDebtGPTScraper = require('../scraper/techdebtgpt-scraper');
const AgentAnalyzer = require('../meta-agent/analyzer');
const AgentImprover = require('../meta-agent/agent-improver');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Initialize database
const db = new Database();

// Routes

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/repos
 * Get list of configured target repositories
 */
app.get('/api/repos', async (req, res) => {
  try {
    const repos = await db.getRepositories();
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/repos
 * Add a new target repository
 */
app.post('/api/repos', async (req, res) => {
  try {
    const { name, path, techdebtgpt_url } = req.body;
    const repo = await db.addRepository(name, path, techdebtgpt_url);
    res.json(repo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/agents
 * Get all agents for a repository
 */
app.get('/api/agents', async (req, res) => {
  try {
    const { repo_id } = req.query;
    const agents = await db.getAgents(repo_id);
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:id/metrics
 * Get metrics history for a specific agent
 */
app.get('/api/agents/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 30 } = req.query;
    const metrics = await db.getAgentMetrics(id, limit);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scrape
 * Trigger scraping of TechDebtGPT metrics
 */
app.post('/api/scrape', async (req, res) => {
  try {
    const { repo_id } = req.body;

    // Get repository config
    const repo = await db.getRepository(repo_id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Run scraper
    const scraper = new TechDebtGPTScraper();
    const result = await scraper.scrape();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Save metrics to database
    for (const agentData of result.agents) {
      // Find or create agent
      let agent = await db.findAgentByEmail(agentData.email, repo_id);
      if (!agent) {
        agent = await db.addAgent(repo_id, agentData.name, agentData.email);
      }

      // Save metrics
      await db.saveAgentMetrics(agent.id, {
        commits: agentData.commits,
        pull_requests: agentData.pullRequests,
        code_reviews: agentData.codeReviews,
        bugs_introduced: agentData.bugsIntroduced,
        lines_added: agentData.linesAdded,
        lines_deleted: agentData.linesDeleted,
        tech_debt_score: agentData.techDebtScore,
        velocity: agentData.velocity
      });
    }

    res.json({
      success: true,
      agents_updated: result.agents.length,
      timestamp: result.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analyze
 * Analyze agents and identify underperformers
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { repo_id } = req.body;

    // Get latest metrics for all agents
    const agents = await db.getAgentsWithLatestMetrics(repo_id);

    if (agents.length === 0) {
      return res.status(400).json({ error: 'No agent metrics found. Run scraper first.' });
    }

    // Run analysis
    const analyzer = new AgentAnalyzer();
    const analysis = analyzer.performFullAnalysis(agents);

    // Save analysis results
    await db.saveAnalysis(repo_id, analysis);

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/improve
 * Generate and apply improvements for underperforming agent
 */
app.post('/api/improve', async (req, res) => {
  try {
    const { agent_id, analysis } = req.body;

    // Get agent details
    const agent = await db.getAgent(agent_id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get repository details
    const repo = await db.getRepository(agent.repository_id);

    // Generate improvements
    const improver = new AgentImprover(repo.path);
    const improvements = await improver.generateImprovements(agent, analysis);

    // Apply improvements (if auto_apply is enabled)
    if (req.body.auto_apply) {
      const result = await improver.applyImprovements(agent, improvements);

      // Save improvement record
      await db.saveImprovement(agent_id, {
        type: 'auto',
        changes: improvements,
        applied: true,
        result: result
      });

      res.json({
        success: true,
        improvements: improvements,
        applied: result
      });
    } else {
      // Just return suggested improvements
      res.json({
        success: true,
        improvements: improvements,
        applied: false
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/leaderboard
 * Get agent performance leaderboard
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { repo_id } = req.query;
    const leaderboard = await db.getAgentLeaderboard(repo_id);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/improvements/:agent_id
 * Get improvement history for an agent
 */
app.get('/api/improvements/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;
    const improvements = await db.getImprovementHistory(agent_id);
    res.json(improvements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhook/github
 * GitHub webhook endpoint for PR merge events
 */
app.post('/api/webhook/github', async (req, res) => {
  try {
    const event = req.body;

    // Verify it's a PR merge to master
    if (event.action === 'closed' &&
        event.pull_request?.merged === true &&
        event.pull_request?.base?.ref === 'master') {

      console.log('🎯 PR merged to master, triggering agent health check...');

      // Find repository by GitHub URL
      const repoUrl = event.repository.html_url;
      const repo = await db.findRepositoryByGitHubUrl(repoUrl);

      if (repo) {
        // Trigger scrape and analysis asynchronously
        (async () => {
          const scraper = new TechDebtGPTScraper();
          const result = await scraper.scrape();

          if (result.success) {
            // Save metrics
            for (const agentData of result.agents) {
              let agent = await db.findAgentByEmail(agentData.email, repo.id);
              if (!agent) {
                agent = await db.addAgent(repo.id, agentData.name, agentData.email);
              }
              await db.saveAgentMetrics(agent.id, {
                commits: agentData.commits,
                pull_requests: agentData.pullRequests,
                code_reviews: agentData.codeReviews,
                bugs_introduced: agentData.bugsIntroduced,
                tech_debt_score: agentData.techDebtScore,
                velocity: agentData.velocity
              });
            }

            // Run analysis
            const agents = await db.getAgentsWithLatestMetrics(repo.id);
            const analyzer = new AgentAnalyzer();
            const analysis = analyzer.performFullAnalysis(agents);
            await db.saveAnalysis(repo.id, analysis);

            console.log('✅ Agent health check completed');
          }
        })();
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agent Health Monitor API running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}/dashboard.html`);

  // Initialize database
  db.initialize().then(() => {
    console.log('✅ Database initialized');
  }).catch(error => {
    console.error('❌ Database initialization failed:', error);
  });
});

module.exports = app;
