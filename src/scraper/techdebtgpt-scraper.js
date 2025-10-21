/**
 * TechDebtGPT Team Performance Scraper
 * Uses Playwright to login and extract agent performance metrics
 */

const { chromium } = require('playwright');
require('dotenv').config();

class TechDebtGPTScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.projectUrl = process.env.TECHDEBTGPT_PROJECT_URL;
    this.email = process.env.TECHDEBTGPT_EMAIL;
    this.password = process.env.TECHDEBTGPT_PASSWORD;
  }

  async initialize() {
    console.log('🚀 Initializing TechDebtGPT scraper...');
    this.browser = await chromium.launch({
      headless: false, // Set to true for production
      slowMo: 100
    });
    this.page = await this.browser.newPage();
  }

  async login() {
    console.log('🔐 Logging into TechDebtGPT...');

    // Navigate to login page
    await this.page.goto('https://app.techdebtgpt.com/sign-in');

    // Wait for login form
    await this.page.waitForSelector('input[type="email"]');

    // Fill credentials
    await this.page.fill('input[type="email"]', this.email);
    await this.page.fill('input[type="password"]', this.password);

    // Click sign in button
    await this.page.click('button[type="submit"]');

    // Wait for navigation to complete
    await this.page.waitForNavigation({ waitUntil: 'networkidle' });

    console.log('✅ Successfully logged in');
  }

  async navigateToTeamPerformance() {
    console.log('📊 Navigating to team performance page...');

    // Navigate to the specific project's team performance page
    await this.page.goto(this.projectUrl);

    // Wait for performance data to load
    await this.page.waitForSelector('[data-testid="team-performance-table"], .team-member, .contributor', {
      timeout: 10000
    }).catch(() => {
      console.log('⚠️  Standard selectors not found, trying alternative selectors...');
    });

    // Give time for any dynamic content to load
    await this.page.waitForTimeout(2000);

    console.log('✅ Team performance page loaded');
  }

  async extractAgentMetrics() {
    console.log('📈 Extracting agent performance metrics...');

    const metrics = await this.page.evaluate(() => {
      const agents = [];

      // Try multiple selector strategies
      const selectors = [
        '.team-member',
        '.contributor',
        '[data-testid="contributor-row"]',
        'tr[data-contributor]',
        '.performance-row'
      ];

      let rows = [];
      for (const selector of selectors) {
        rows = document.querySelectorAll(selector);
        if (rows.length > 0) break;
      }

      if (rows.length === 0) {
        // Fallback: Try to find any table rows
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const tableRows = table.querySelectorAll('tbody tr');
          if (tableRows.length > 0) {
            rows = tableRows;
            break;
          }
        }
      }

      rows.forEach(row => {
        // Extract agent name/email
        const nameElement = row.querySelector('.name, .contributor-name, td:first-child, .email');
        const name = nameElement ? nameElement.textContent.trim() : 'Unknown';

        // Extract metrics (adapt these selectors based on actual TechDebtGPT HTML)
        const cells = row.querySelectorAll('td, .metric');

        const agent = {
          name: name,
          email: nameElement?.getAttribute('data-email') || name,
          commits: 0,
          pullRequests: 0,
          codeReviews: 0,
          bugsIntroduced: 0,
          linesAdded: 0,
          linesDeleted: 0,
          techDebtScore: 0,
          velocity: 0,
          timestamp: new Date().toISOString()
        };

        // Try to parse numeric metrics from cells
        cells.forEach((cell, index) => {
          const text = cell.textContent.trim();
          const number = parseInt(text) || parseFloat(text) || 0;

          // Map cells to metrics based on position and content
          if (text.includes('commit')) agent.commits = number;
          if (text.includes('PR') || text.includes('pull')) agent.pullRequests = number;
          if (text.includes('review')) agent.codeReviews = number;
          if (text.includes('bug')) agent.bugsIntroduced = number;
          if (text.includes('debt') || text.includes('score')) agent.techDebtScore = number;
          if (text.includes('velocity')) agent.velocity = number;
        });

        agents.push(agent);
      });

      return agents;
    });

    console.log(`✅ Extracted metrics for ${metrics.length} agents`);
    return metrics;
  }

  async takeScreenshot(filename = 'team-performance.png') {
    await this.page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  async scrape() {
    try {
      await this.initialize();
      await this.login();
      await this.navigateToTeamPerformance();

      // Take screenshot for debugging
      await this.takeScreenshot('./screenshots/team-performance.png');

      const metrics = await this.extractAgentMetrics();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        agents: metrics
      };
    } catch (error) {
      console.error('❌ Scraping failed:', error);

      // Take error screenshot
      if (this.page) {
        await this.takeScreenshot('./screenshots/error-screenshot.png');
      }

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await this.close();
    }
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const scraper = new TechDebtGPTScraper();
    const result = await scraper.scrape();
    console.log('\n📊 Final Results:');
    console.log(JSON.stringify(result, null, 2));
  })();
}

module.exports = TechDebtGPTScraper;
