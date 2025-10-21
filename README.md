# TechDebtGPT Agent Health Monitor MVP

## Overview
A meta-agent system that monitors AI agent performance in software development projects, identifies underperforming agents, and automatically improves their definitions.

## Architecture

### Two-Repository Setup

**Repository 1: todo-ai-agents** (Target Repository)
- Contains the actual development work
- Multiple AI agents (PM, Backend, Frontend, DevOps, QA) commit code
- Monitored by TechDebtGPT at: https://app.techdebtgpt.com/projects/2d0e3495-7a9e-4c7e-b755-07f58d1401f7/team-performance
- Each agent has unique Git identity and Azure DevOps account

**Repository 2: techdebt-agent-health-mvp** (This Repository)
- Meta-agent that monitors agent performance
- Scrapes TechDebtGPT metrics using Playwright
- Analyzes agent performance and identifies underperformers
- Automatically improves agent definitions in target repo
- Contains dashboard showing agent health

## Workflow

1. **Trigger**: PM Agent merges develop → master in `todo-ai-agents`
2. **GitHub Webhook**: Fires to GitHub Action in this repo
3. **Scraper**: Playwright logs into TechDebtGPT and extracts team performance metrics
4. **Analyzer**: Meta-agent identifies lowest performing agent
5. **Improver**: Meta-agent updates the underperforming agent's definition in `todo-ai-agents`
6. **Dashboard**: Visual display of all agent health metrics

## Project Structure

```
techdebt-agent-health-mvp/
├── .github/
│   └── workflows/
│       └── monitor-agents.yml          # GitHub Action triggered on webhook
├── src/
│   ├── scraper/
│   │   ├── techdebtgpt-scraper.js      # Playwright script to extract metrics
│   │   └── auth.js                     # TechDebtGPT authentication
│   ├── meta-agent/
│   │   ├── analyzer.js                 # Analyzes performance data
│   │   ├── agent-improver.js           # Generates improvements
│   │   └── agent-updater.js            # Updates agent definitions
│   └── dashboard/
│       ├── index.html                  # Agent health dashboard
│       └── app.js                      # Dashboard logic
├── config/
│   ├── thresholds.json                 # Performance thresholds
│   └── target-repo.json                # todo-ai-agents repo config
├── .env.example                        # Environment variables template
└── package.json
```

## Setup

### Prerequisites
- Node.js 18+
- GitHub PAT with repo access
- TechDebtGPT account credentials
- Access to target repository (todo-ai-agents)

### Environment Variables

Create `.env` file:
```env
# TechDebtGPT Credentials
TECHDEBTGPT_EMAIL=your-email@example.com
TECHDEBTGPT_PASSWORD=your-password
TECHDEBTGPT_PROJECT_URL=https://app.techdebtgpt.com/projects/2d0e3495-7a9e-4c7e-b755-07f58d1401f7/team-performance

# Target Repository
TARGET_REPO_OWNER=ipanov-ritech
TARGET_REPO_NAME=todo-ai-agents
GITHUB_PAT=your-github-pat

# Performance Thresholds
MIN_TASK_COMPLETION_RATE=60
MIN_CODE_QUALITY_SCORE=70
MAX_BUG_RATE=0.15
```

### Installation

```bash
npm install
npm run setup
```

## Usage

### Manual Trigger
```bash
npm run analyze
```

### Automatic Trigger
Configure webhook in `todo-ai-agents` repository:
- Payload URL: `https://api.github.com/repos/{owner}/techdebt-agent-health-mvp/dispatches`
- Events: Pull request (merged to master)

## Demo for Ritech AI Challenge

This MVP demonstrates:
1. **AI Agent Performance Tracking** - Treating AI agents as team members
2. **Automated Analysis** - Meta-agent identifies underperformers
3. **Self-Improvement** - Agents automatically improve based on metrics
4. **TechDebtGPT Integration** - Leverages existing Ritech product

## References
- [TechDebtGPT Platform](https://www.techdebtgpt.com/)
- [Project Proposal](./docs/proposal.md)
- [Implementation Guide](./docs/implementation.md)
