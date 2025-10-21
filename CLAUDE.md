# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **meta-agent system** that monitors AI agent performance in software development projects. It scrapes metrics from TechDebtGPT, analyzes agent performance, identifies underperformers, and automatically generates improvements.

### Key Architecture

The system operates across **two repositories**:

1. **Target Repository** (`todo-ai-agents`): Contains actual development work by AI agents (PM, Backend, Frontend, DevOps, QA)
2. **This Repository** (`techdebt-agent-health-mvp`): Meta-agent that monitors and improves the agents in the target repo

### Core Components

- **Scraper** (`src/scraper/techdebtgpt-scraper.js`): Playwright-based scraper that logs into TechDebtGPT and extracts agent performance metrics
- **Analyzer** (`src/meta-agent/analyzer.js`): Calculates health scores (productivity, quality, collaboration, reliability) and ranks agents
- **Improver** (`src/meta-agent/agent-improver.js`): Generates specific improvements for underperforming agents and updates their definition files in the target repo
- **Backend API** (`src/backend/server.js`): Express server providing REST API for metrics, analysis, and improvements
- **Database** (`src/backend/database.js`): SQLite database storing agent metrics, analyses, and improvement history
- **Dashboard** (`public/dashboard.html`): Web UI displaying agent health metrics

### Data Flow

1. GitHub webhook triggers when PR merges to master in target repo
2. Playwright scraper logs into TechDebtGPT and extracts metrics
3. Analyzer calculates health scores (weighted: quality 35%, productivity 30%, collaboration 20%, reliability 15%)
4. Improver generates recommendations for lowest performer
5. Agent definition files in target repo are updated with improvement plans
6. Results stored in SQLite and displayed in dashboard

## Development Commands

### Setup
```bash
npm install
npm run setup
```

### Running the System

```bash
# Full analysis pipeline (scrape → analyze → improve)
npm run analyze

# Scrape TechDebtGPT metrics only
npm run scrape

# Start backend API server
node src/backend/server.js

# Start dashboard (static file server)
npm run dashboard
# Access at http://localhost:8080/dashboard.html

# Run tests
npm test
```

### Testing Individual Components

```bash
# Test scraper in isolation
node src/scraper/techdebtgpt-scraper.js

# Test analyzer (requires scraped data)
node -e "const Analyzer = require('./src/meta-agent/analyzer'); const a = new Analyzer(); console.log(a.calculateHealthScore({commits: 5, pullRequests: 2, codeReviews: 3, bugsIntroduced: 1, techDebtScore: 30, velocity: 8}));"
```

## Environment Configuration

Required `.env` file variables:

```bash
# TechDebtGPT authentication
TECHDEBTGPT_EMAIL=your-email
TECHDEBTGPT_PASSWORD=your-password
TECHDEBTGPT_PROJECT_URL=https://app.techdebtgpt.com/projects/.../team-performance

# Target repository
TARGET_REPO_OWNER=ipanov-ritech
TARGET_REPO_NAME=todo-ai-agents
TARGET_REPO_PATH=C:/Repos/todo-ai-agents  # Local path for file updates
GITHUB_PAT=your-github-token

# Automation flags
AUTO_APPLY=true                 # Auto-update agent definitions
CREATE_GITHUB_ISSUE=true        # Create GitHub issues for improvements

# Performance thresholds (used by analyzer)
MIN_TASK_COMPLETION_RATE=60
MIN_CODE_QUALITY_SCORE=70
MAX_BUG_RATE=0.15
```

## Key Technical Details

### Health Score Calculation

Each agent receives a score (0-100) based on:
- **Productivity** (30%): commits, PRs vs thresholds
- **Quality** (35%): inverse of bugs + tech debt
- **Collaboration** (20%): code reviews performed
- **Reliability** (15%): consistency of velocity

Health status:
- ≥80: healthy
- 60-79: warning
- <60: critical

### Agent Definition Updates

Improvements are applied to `.claude/agents/{email}-agent.md` files in the target repo by:
1. Identifying root causes (productivity/quality/collaboration/reliability issues)
2. Generating actionable recommendations
3. Appending "Performance Improvement Plan" section with specific instructions
4. Optionally creating GitHub issue documenting changes

### Scraper Implementation

Uses Playwright with `headless: false` (change to `true` for production). Screenshots saved to `./screenshots/` for debugging. The scraper handles:
- Login to TechDebtGPT
- Navigation to team performance page
- Dynamic selector strategies for extracting metrics
- Error handling with screenshot capture

### API Endpoints

- `POST /api/scrape` - Trigger TechDebtGPT scrape
- `POST /api/analyze` - Analyze agent performance
- `POST /api/improve` - Generate/apply improvements
- `GET /api/agents` - List agents
- `GET /api/leaderboard` - Agent rankings
- `POST /api/webhook/github` - GitHub webhook handler

## GitHub Actions Workflow

`.github/workflows/agent-health-check.yml` triggers on:
- `repository_dispatch` event with type `pr_merged_to_master`
- Manual `workflow_dispatch`

The workflow:
1. Installs dependencies and Playwright browsers
2. Runs scraper with secrets from GitHub
3. Runs analysis
4. Uploads screenshots on failure
5. Creates job summary

## Database Schema

SQLite database at `data/agent-health.db`:
- `repositories` - Target repos being monitored
- `agents` - Individual AI agents with email/name
- `agent_metrics` - Time-series performance data
- `analyses` - Team analysis snapshots
- `improvements` - History of improvements applied

## Important Patterns

### Agent Email Mapping
Agent emails from `.env` map to definition files:
- `techdebtdemo2025po@outlook.com` → `.claude/agents/techdebtdemo2025po-agent.md`
- `techdebtdemo2025be@outlook.com` → `.claude/agents/techdebtdemo2025be-agent.md`

### Error Handling
All scraper errors trigger screenshot capture to `./screenshots/error-screenshot.png` for debugging.

### Async Workflow
Webhook endpoint (`/api/webhook/github`) triggers analysis asynchronously to avoid timeout.
