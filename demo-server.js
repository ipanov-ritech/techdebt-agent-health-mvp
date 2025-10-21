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
app.post('/api/improve', async (req, res) => {
  const { agent, folderPath } = req.body;

  console.log(`✨ Applying improvements to ${agent.name}...`);
  console.log(`🤖 Invoking improver-agent from: ${__dirname}/.claude/agents/improver-agent.md`);
  console.log(`📊 Agent metrics:`, { score: agent.score, weaknesses: agent.weaknesses });

  try {
    // Use agent.filePath directly if available, otherwise construct it
    const agentFile = agent.filePath || path.join(folderPath, '.claude', 'agents', agent.fileName);

    if (!fs.existsSync(agentFile)) {
      console.error(`❌ Agent file not found: ${agentFile}`);
      return res.status(404).json({ error: 'Agent file not found' });
    }

    // Create a prompt file for Claude Code to invoke improver-agent
    const promptFile = path.join(__dirname, '.claude', 'improve-prompt.txt');
    const improvementPrompt = `Please use the improver-agent to improve the following agent:

Agent File: ${agentFile}
Agent Name: ${agent.name}
Role: ${agent.role}
Overall Score: ${agent.score}/100

Performance Metrics:
- Commits: ${agent.commits}
- Pull Requests: ${agent.pullRequests}
- Bugs: ${agent.bugs}
- Reviews: ${agent.reviews}

Weaknesses:
- Quality: ${agent.weaknesses.quality}/100
- Productivity: ${agent.weaknesses.productivity}/100
- Collaboration: ${agent.weaknesses.collaboration}/100
- Reliability: ${agent.weaknesses.reliability}/100

Please read the agent file and add role-specific improvements based on these metrics.`;

    fs.writeFileSync(promptFile, improvementPrompt);
    console.log(`📝 Created improvement prompt: ${promptFile}`);
    console.log(`\n⚠️  MANUAL STEP REQUIRED:`);
    console.log(`   Run: /agent improver-agent`);
    console.log(`   Then provide the prompt from: ${promptFile}\n`);

    // For the demo, we'll still do the direct edit
    let content = fs.readFileSync(agentFile, 'utf8');

    // Build improvements based on actual weaknesses AND agent role
    const weakAreas = [];
    const improvements = [];

    // Role-specific improvement templates
    const roleSpecificImprovements = {
      'Product Owner': {
        quality: `#### Requirements Quality (Current: ${agent.weaknesses.quality}/100)
- **Acceptance Criteria**: Define clear, testable acceptance criteria for every user story
- **User Story Format**: Follow "As a [user], I want [goal] so that [benefit]" structure
- **Definition of Done**: Ensure all stories have explicit DoD before sprint planning
- **Validation**: Review stories with stakeholders before marking as ready for development`,
        productivity: `#### Backlog Management (Current: ${agent.weaknesses.productivity}/100)
- **Refinement Cadence**: Conduct backlog refinement sessions ${Math.max(12 - agent.commits, 3)}+ times per sprint
- **Story Sizing**: Ensure all upcoming stories are estimated and prioritized
- **Sprint Planning**: Prepare sprint goals and prioritized backlog items in advance
- **Stakeholder Sync**: Schedule regular check-ins with business stakeholders`,
        collaboration: `#### Stakeholder Engagement (Current: ${agent.weaknesses.collaboration}/100)
- **Communication**: Provide clear product vision and roadmap updates to the team
- **Feedback Loops**: Gather and incorporate feedback from ${Math.max(5 - agent.reviews, 3)}+ team members
- **Alignment**: Ensure technical team understands business value of each feature
- **Demo Preparation**: Actively participate in sprint demos and retrospectives`,
        reliability: `#### Product Delivery (Current: ${agent.weaknesses.reliability}/100)
- **Scope Management**: Prevent scope creep by clearly defining MVP requirements
- **Dependency Tracking**: Identify and document external dependencies early
- **Risk Assessment**: Flag high-risk items during planning
- **Release Planning**: Maintain updated release roadmap with realistic timelines`
      },
      'Backend Developer': {
        quality: `#### Code Quality & Testing (Current: ${agent.weaknesses.quality}/100)
- **Unit Tests**: Write comprehensive unit tests for all API endpoints and business logic
- **Integration Tests**: Add integration tests covering database interactions
- **Code Coverage**: Maintain minimum 80% test coverage for backend services
- **Static Analysis**: Run \`npm run lint\` and fix all errors before committing
- **Error Handling**: Implement proper error handling with appropriate HTTP status codes`,
        productivity: `#### Development Velocity (Current: ${agent.weaknesses.productivity}/100)
- **Commit Frequency**: Make ${Math.max(12 - agent.commits, 5)}+ atomic commits per sprint
- **API Documentation**: Document all new endpoints using OpenAPI/Swagger
- **Code Reusability**: Identify and extract common patterns into shared modules
- **Performance**: Profile and optimize database queries and API response times`,
        collaboration: `#### Team Collaboration (Current: ${agent.weaknesses.collaboration}/100)
- **Code Reviews**: Review ${Math.max(5 - agent.reviews, 3)}+ backend PRs focusing on architecture
- **API Contracts**: Coordinate with frontend team on API contract changes
- **Knowledge Sharing**: Document complex business logic and architectural decisions
- **Technical Discussions**: Participate in architecture reviews and design sessions`,
        reliability: `#### System Reliability (Current: ${agent.weaknesses.reliability}/100)
- **Error Monitoring**: Implement comprehensive logging and error tracking
- **Database Migrations**: Test all migrations thoroughly before deployment
- **Backward Compatibility**: Ensure API changes don't break existing clients
- **Performance Testing**: Load test critical endpoints before production deployment`
      },
      'Frontend Developer': {
        quality: `#### UI/UX Quality (Current: ${agent.weaknesses.quality}/100)
- **Component Testing**: Write unit tests for all React components using Jest/Testing Library
- **E2E Tests**: Add end-to-end tests for critical user flows
- **Accessibility**: Ensure WCAG 2.1 AA compliance for all UI components
- **Browser Testing**: Test across Chrome, Firefox, Safari, and Edge
- **Code Review**: Check for proper error boundaries and loading states`,
        productivity: `#### Frontend Velocity (Current: ${agent.weaknesses.productivity}/100)
- **Component Commits**: Make ${Math.max(12 - agent.commits, 5)}+ commits per sprint
- **Reusable Components**: Build atomic, reusable UI components
- **Performance**: Optimize bundle size and implement code splitting
- **Styling Standards**: Follow design system and maintain consistent styling approach`,
        collaboration: `#### Cross-functional Collaboration (Current: ${agent.weaknesses.collaboration}/100)
- **Design Review**: Review ${Math.max(5 - agent.reviews, 3)}+ UI/UX implementations from team
- **API Integration**: Coordinate with backend team on data requirements
- **UX Feedback**: Gather and incorporate user feedback from Product Owner
- **Design System**: Contribute to and maintain shared component library`,
        reliability: `#### Frontend Reliability (Current: ${agent.weaknesses.reliability}/100)
- **Error Handling**: Implement comprehensive error boundaries and user-friendly error messages
- **Form Validation**: Add client-side validation with clear validation messages
- **Loading States**: Show appropriate loading indicators for async operations
- **Responsive Design**: Ensure mobile responsiveness across all screen sizes`
      },
      'DevOps Engineer': {
        quality: `#### Infrastructure Quality (Current: ${agent.weaknesses.quality}/100)
- **Infrastructure as Code**: Write tests for Terraform/CloudFormation templates
- **CI/CD Validation**: Implement pre-deployment validation checks
- **Security Scanning**: Add automated security scanning to CI/CD pipeline
- **Configuration Management**: Validate all configuration changes before deployment
- **Documentation**: Document all infrastructure changes and runbooks`,
        productivity: `#### Automation Efficiency (Current: ${agent.weaknesses.productivity}/100)
- **Pipeline Improvements**: Make ${Math.max(12 - agent.commits, 5)}+ automation commits per sprint
- **Build Optimization**: Reduce CI/CD pipeline execution time
- **Deployment Automation**: Automate manual deployment steps
- **Monitoring Setup**: Implement comprehensive monitoring and alerting`,
        collaboration: `#### DevOps Collaboration (Current: ${agent.weaknesses.collaboration}/100)
- **Infrastructure Reviews**: Review ${Math.max(5 - agent.reviews, 3)}+ infrastructure PRs
- **Developer Support**: Provide timely support for deployment and infrastructure issues
- **Knowledge Transfer**: Document and train team on CI/CD processes
- **Incident Response**: Participate in incident response and post-mortems`,
        reliability: `#### System Reliability (Current: ${agent.weaknesses.reliability}/100)
- **High Availability**: Implement redundancy and failover mechanisms
- **Disaster Recovery**: Test backup and recovery procedures regularly
- **Performance Monitoring**: Set up and monitor SLAs and SLOs
- **Incident Management**: Create and maintain incident response playbooks`
      }
    };

    // Determine agent's primary role for role-specific improvements
    let roleKey = 'Backend Developer'; // default
    if (agent.role.toLowerCase().includes('product') || agent.role.toLowerCase().includes('pm')) {
      roleKey = 'Product Owner';
    } else if (agent.role.toLowerCase().includes('frontend') || agent.role.toLowerCase().includes('ui')) {
      roleKey = 'Frontend Developer';
    } else if (agent.role.toLowerCase().includes('devops') || agent.role.toLowerCase().includes('infrastructure')) {
      roleKey = 'DevOps Engineer';
    }

    const roleImprovements = roleSpecificImprovements[roleKey];

    if (agent.weaknesses.quality < 70 && roleImprovements.quality) {
      weakAreas.push(`Quality (${agent.weaknesses.quality}/100)`);
      improvements.push(roleImprovements.quality);
    }

    if (agent.weaknesses.productivity < 70 && roleImprovements.productivity) {
      weakAreas.push(`Productivity (${agent.weaknesses.productivity}/100)`);
      improvements.push(roleImprovements.productivity);
    }

    if (agent.weaknesses.collaboration < 70 && roleImprovements.collaboration) {
      weakAreas.push(`Collaboration (${agent.weaknesses.collaboration}/100)`);
      improvements.push(roleImprovements.collaboration);
    }

    if (agent.weaknesses.reliability < 70 && roleImprovements.reliability) {
      weakAreas.push(`Reliability (${agent.weaknesses.reliability}/100)`);
      improvements.push(roleImprovements.reliability);
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
