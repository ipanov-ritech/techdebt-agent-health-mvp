/**
 * Agent Health Monitor - Demo Server
 * Backend API for agent detection, analysis, and improvement
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Track which agents have been improved
const improvedAgents = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API: Detect agents in a folder using detector-agent
app.post('/api/detect-agents', async (req, res) => {
  const { folderPath } = req.body;

  console.log(`🔍 Detecting agents in: ${folderPath}`);
  console.log(`🤖 Using detector-agent from: ${__dirname}/.claude/agents/detector-agent.md`);

  try {
    const agentsDir = path.join(folderPath, '.claude', 'agents');

    if (!fs.existsSync(agentsDir)) {
      return res.json({ agents: [] });
    }

    const files = fs.readdirSync(agentsDir).filter(f =>
      f.endsWith('.md') &&
      f.toLowerCase() !== 'readme.md'
    );

    const agents = files.map(file => {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');

      // Extract name from content (look for "**Name**:" or "- **Name**:")
      let name = null;
      const nameMatch = content.match(/\*\*Name\*\*:\s*(.+)/);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }

      // Fallback to filename if name not found in content
      if (!name) {
        name = file.replace('.md', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      // Extract role from content (look for "**Role**:" or "- **Role**:")
      let role = 'Developer';
      const roleMatch = content.match(/\*\*Role\*\*:\s*(.+)/);
      if (roleMatch) {
        role = roleMatch[1].trim();
      } else {
        // Fallback to content-based detection
        if (content.toLowerCase().includes('frontend') || content.toLowerCase().includes('ui')) role = 'Frontend Developer';
        else if (content.toLowerCase().includes('backend') || content.toLowerCase().includes('api')) role = 'Backend Developer';
        else if (content.toLowerCase().includes('product owner') || content.toLowerCase().includes('po')) role = 'Product Owner';
        else if (content.toLowerCase().includes('devops') || content.toLowerCase().includes('infrastructure')) role = 'DevOps Engineer';
      }

      // Extract email from content (look for "**GitHub Email**:" or "**Email**:")
      let email = null;
      const emailMatch = content.match(/\*\*(?:GitHub )?Email\*\*:\s*(.+)/);
      if (emailMatch) {
        email = emailMatch[1].trim();
      }

      // Fallback to generated email
      if (!email) {
        email = `${file.replace('.md', '')}@todo-ai-agents.demo`;
      }

      return {
        name,
        role,
        email,
        filePath: path.join(agentsDir, file),
        fileName: file,
        hasBeenImproved: improvedAgents.has(email)
      };
    });

    console.log(`✅ Found ${agents.length} agents`);
    res.json({ agents });
  } catch (error) {
    console.error('Error detecting agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Run performance analysis (mock TechDebtGPT sync)
app.post('/api/analyze', (req, res) => {
  const { agents } = req.body;

  console.log(`📊 Running analysis for ${agents.length} agents...`);
  console.log(`🔄 Simulating TechDebtGPT sync...`);

  // Generate mock performance data
  // Randomly select one agent to be the lowest performer
  const lowestIndex = Math.floor(Math.random() * agents.length);

  const results = agents.map((agent, index) => {
    const isLowest = index === lowestIndex;
    const hasBeenImproved = improvedAgents.has(agent.email);

    let score, commits, pullRequests, bugs, reviews;

    if (hasBeenImproved) {
      // Agent has been improved - show great performance!
      score = 85 + Math.floor(Math.random() * 10); // 85-94
      commits = 12 + Math.floor(Math.random() * 5); // 12-16
      pullRequests = 5 + Math.floor(Math.random() * 3); // 5-7
      bugs = 0; // No bugs!
      reviews = 5 + Math.floor(Math.random() * 3); // 5-7
    } else if (isLowest) {
      // Make this agent the lowest performer
      score = 50 + Math.floor(Math.random() * 15); // 50-64
      commits = 3 + Math.floor(Math.random() * 3); // 3-5
      pullRequests = 1 + Math.floor(Math.random() * 2); // 1-2
      bugs = 3 + Math.floor(Math.random() * 3); // 3-5
      reviews = Math.floor(Math.random() * 2); // 0-1
    } else {
      // Other agents perform better
      score = 75 + Math.floor(Math.random() * 20); // 75-94
      commits = 8 + Math.floor(Math.random() * 7); // 8-14
      pullRequests = 3 + Math.floor(Math.random() * 3); // 3-5
      bugs = Math.floor(Math.random() * 2); // 0-1
      reviews = 3 + Math.floor(Math.random() * 4); // 3-6
    }

    // Calculate weakness breakdown
    const productivity = Math.min(100, Math.round((commits / 12) * 100));
    const quality = Math.max(0, Math.round(100 - ((bugs / (pullRequests || 1)) * 40)));
    const collaboration = Math.min(100, Math.round((reviews / 5) * 100));
    const reliability = Math.round(score * 0.8 + Math.random() * 20);

    return {
      ...agent,
      score,
      commits,
      pullRequests,
      bugs,
      reviews,
      velocity: Math.round(score / 10),
      weaknesses: {
        productivity,
        quality,
        collaboration,
        reliability
      }
    };
  });

  // Sort by score to find lowest
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const lowestPerformer = sorted[0];

  console.log(`⚠️  Lowest performer: ${lowestPerformer.name} (${lowestPerformer.score}/100)`);
  console.log(`   Weaknesses:`, lowestPerformer.weaknesses);

  res.json({
    agents: results,
    lowestPerformer,
    teamAverage: Math.round(results.reduce((sum, a) => sum + a.score, 0) / results.length)
  });
});

// API: Apply improvements to agent using improver-agent
app.post('/api/improve', (req, res) => {
  const { agent, folderPath } = req.body;

  console.log(`✨ Applying improvements to ${agent.name}...`);
  console.log(`🤖 Using improver-agent from: ${__dirname}/.claude/agents/improver-agent.md`);
  console.log(`📊 Agent metrics:`, { score: agent.score, weaknesses: agent.weaknesses });

  try {
    // Use agent.filePath directly if available, otherwise construct it
    const agentFile = agent.filePath || path.join(folderPath, '.claude', 'agents', agent.fileName);

    if (!fs.existsSync(agentFile)) {
      console.error(`❌ Agent file not found: ${agentFile}`);
      return res.status(404).json({ error: 'Agent file not found' });
    }

    let content = fs.readFileSync(agentFile, 'utf8');

    // Build improvements based on actual weaknesses
    const weakAreas = [];
    const improvements = [];

    if (agent.weaknesses.quality < 70) {
      weakAreas.push(`Quality (${agent.weaknesses.quality}/100)`);
      improvements.push(`#### Quality Enhancement (Current: ${agent.weaknesses.quality}/100)
- **Requirement**: Write comprehensive unit tests before implementation
- **Standard**: Minimum 80% code coverage for all new features
- **Practice**: Use Test-Driven Development (TDD) approach
- **Gate**: Run \`npm run lint && npm run test\` before every commit
- **Self-Review**: Check code for edge cases and error handling before PR`);
    }

    if (agent.weaknesses.productivity < 70) {
      weakAreas.push(`Productivity (${agent.weaknesses.productivity}/100)`);
      improvements.push(`#### Productivity Boost (Current: ${agent.weaknesses.productivity}/100)
- **Commit Frequency**: Make smaller, atomic commits (target: ${Math.max(12 - agent.commits, 5)}+ more per sprint)
- **Conventional Commits**: Use format: \`feat:\`, \`fix:\`, \`refactor:\`, etc.
- **Progress Tracking**: Commit after each logical unit of work
- **Daily Activity**: Aim for consistent commits throughout sprint`);
    }

    if (agent.weaknesses.collaboration < 70) {
      weakAreas.push(`Collaboration (${agent.weaknesses.collaboration}/100)`);
      improvements.push(`#### Collaboration Standards (Current: ${agent.weaknesses.collaboration}/100)
- **Review Goal**: Review at least ${Math.max(5 - agent.reviews, 3)} more PRs before submitting own code
- **Quality Feedback**: Provide specific, constructive feedback on architecture and patterns
- **Questions**: Ask clarifying questions when requirements or implementation unclear
- **Participation**: Engage in technical discussions and design reviews`);
    }

    if (agent.weaknesses.reliability < 70) {
      weakAreas.push(`Reliability (${agent.weaknesses.reliability}/100)`);
      improvements.push(`#### Reliability Practices (Current: ${agent.weaknesses.reliability}/100)
- **Focus**: Complete one task fully before starting another
- **Task Breakdown**: Break complex tasks (>4 hours) into smaller subtasks
- **Error Handling**: Add comprehensive error boundaries and input validation
- **Blockers**: Report blockers within 30 minutes of identification`);
    }

    const improvementSection = `

## 🎯 Performance Improvements

*Applied: ${new Date().toISOString().split('T')[0]} by Agent Health Monitor*
*Overall Score: ${agent.score}/100 → Target: 85+/100*

### Critical Areas Identified
${weakAreas.map(area => `- ${area}`).join('\n')}

### Improvement Actions

${improvements.join('\n\n')}

### Action Items Checklist
- [ ] Review and acknowledge these improvements
- [ ] Implement quality gates in development workflow
- [ ] Set up pre-commit hooks for automated checks
- [ ] Track progress against new standards
- [ ] Re-assess performance after 1 sprint

---
*Managed by Agent Health Monitor - ${new Date().toISOString()}*
`;

    content += improvementSection;

    fs.writeFileSync(agentFile, content);

    // Mark this agent as improved
    improvedAgents.add(agent.email);

    console.log(`✅ Improvements applied to: ${agentFile}`);
    console.log(`📝 Added ${improvements.length} improvement sections`);
    console.log(`🎯 Agent ${agent.email} marked as improved`);

    res.json({
      success: true,
      filePath: agentFile,
      improvementsAdded: improvements.length,
      weakAreas,
      message: `Successfully updated ${agent.name} with ${improvements.length} improvements`
    });
  } catch (error) {
    console.error('Error applying improvements:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🤖 Agent Health Monitor - Demo Server');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Backend API:  http://localhost:${PORT}`);
  console.log(`  Frontend App: http://localhost:${PORT}/app.html`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    POST /api/detect-agents  - Detect agents in folder');
  console.log('    POST /api/analyze        - Run performance analysis');
  console.log('    POST /api/improve        - Apply improvements');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});
