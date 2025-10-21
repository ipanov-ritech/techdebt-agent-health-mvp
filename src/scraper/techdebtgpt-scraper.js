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
    await this.page.goto('https://app.techdebtgpt.com/login', { waitUntil: 'networkidle' });

    // Wait for the form to be visible
    await this.page.waitForSelector('input[placeholder="Enter Email"]', { timeout: 10000 });

    // Fill in email
    await this.page.fill('input[placeholder="Enter Email"]', this.email);
    console.log('   ✓ Email entered');

    // Fill in password
    await this.page.fill('input[placeholder="Enter Password"]', this.password);
    console.log('   ✓ Password entered');

    // Click the Sign in button
    await this.page.click('button:has-text("Sign in")');
    console.log('   ✓ Sign in button clicked');

    // Wait for navigation to complete (wait for URL to change or for a dashboard element)
    await this.page.waitForTimeout(3000);

    console.log('✅ Successfully logged in');
  }

  async navigateToTeamPerformance() {
    console.log('📊 Navigating to team performance page...');

    // First, navigate to the project URL
    await this.page.goto(this.projectUrl, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);

    // Look for "Select Repository" button and click it
    console.log('   Looking for repository selector...');

    try {
      // Click on "Select Repository" dropdown
      await this.page.click('text=Select Repository');
      console.log('   ✓ Clicked repository dropdown');
      await this.page.waitForTimeout(1500);

      // Take screenshot of dropdown options
      await this.page.screenshot({ path: './screenshots/dropdown-options.png', fullPage: true });

      // Try to find and click todo-ai-agents option
      const repoOption = await this.page.locator('text=todo-ai-agents').first();
      if (await repoOption.count() > 0) {
        await repoOption.click();
        console.log('   ✓ Selected todo-ai-agents repository');
        await this.page.waitForTimeout(3000);
      } else {
        console.log('   ⚠️  todo-ai-agents not found in dropdown, trying first available repository');
        // Click the first repository option if todo-ai-agents not found
        await this.page.locator('li, div[role="option"], button').first().click();
        await this.page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('   ⚠️  Could not select repository:', e.message);
    }

    // Make sure we're on the Team Performance tab (not PR Analysis)
    console.log('   Ensuring Team Performance tab is selected...');
    try {
      // Wait for tabs to be visible
      await this.page.waitForSelector('text=Team Performance', { timeout: 5000 });
      await this.page.click('text=Team Performance');
      console.log('   ✓ Clicked Team Performance tab');
      await this.page.waitForTimeout(3000);
    } catch (e) {
      console.log('   ⚠️  Team Performance tab not found or already selected:', e.message);
    }

    // Wait for data to load
    await this.page.waitForTimeout(3000);

    // Scroll down to reveal team performance data
    console.log('   Scrolling down to reveal data...');
    await this.page.evaluate(() => window.scrollBy(0, 1000));
    await this.page.waitForTimeout(2000);

    // Scroll more to ensure all data is visible
    await this.page.evaluate(() => window.scrollBy(0, 1000));
    await this.page.waitForTimeout(2000);

    // Take final screenshot after scrolling
    await this.page.screenshot({ path: './screenshots/team-performance-final.png', fullPage: true });

    console.log('✅ Team performance page loaded and scrolled');
  }

  async extractAgentMetrics() {
    console.log('📈 Extracting agent performance metrics...');

    // Scroll to ensure all data is visible before extraction
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(2000);

    // First, let's get the page content to understand structure
    const pageContent = await this.page.content();

    // Look for any table or grid containing team/contributor data
    const metrics = await this.page.evaluate(() => {
      const agents = [];

      // Strategy 1: Look for table rows with team member data
      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td'));

          if (cells.length > 0) {
            // Extract text from cells
            const cellTexts = cells.map(cell => cell.textContent.trim());

            // Look for name in first cell (like "ipanov-ritech")
            const nameCell = cellTexts[0];

            // Skip if no name
            if (!nameCell || nameCell === '') return;

            const agent = {
              name: nameCell,
              email: nameCell.includes('@') ? nameCell : `${nameCell}@techdebtgpt.user`,
              commits: 0,
              pullRequests: 0,
              codeReviews: 0,
              bugsIntroduced: 0,
              linesAdded: 0,
              linesDeleted: 0,
              techDebtScore: 0,
              velocity: 0,
              role: 'Developer',
              timestamp: new Date().toISOString()
            };

            // Extract PRs from second column (format: "2 / 2")
            if (cellTexts[1]) {
              const prMatch = cellTexts[1].match(/(\d+)\s*\/\s*(\d+)/);
              if (prMatch) {
                agent.pullRequests = parseInt(prMatch[1]);
              }
            }

            // Extract numeric values from remaining cells
            cellTexts.forEach((text, idx) => {
              // Skip first two columns (name and PRs)
              if (idx < 2) return;

              const numbers = text.match(/\d+(\.\d+)?/g);
              if (numbers) {
                const val = parseFloat(numbers[0]);

                // Map based on column headers or content
                if (text.includes('/PR')) {
                  // These are metrics per PR - use for quality/velocity estimation
                  if (idx === 2) agent.velocity = val; // Avg. Estimation
                  else if (idx === 5) agent.techDebtScore = 100 - (val * 10); // Quality inverse
                }
              }
            });

            // Only add if we have actual data
            if (agent.pullRequests > 0 || agent.commits > 0) {
              agents.push(agent);
            }
          }
        });
      }

      // Strategy 2: Look for card/list layouts if no table found
      if (agents.length === 0) {
        const memberCards = document.querySelectorAll('[class*="member"], [class*="contributor"], [class*="developer"]');

        memberCards.forEach(card => {
          const text = card.textContent;
          const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);

          if (emailMatch) {
            agents.push({
              name: card.querySelector('[class*="name"]')?.textContent?.trim() || emailMatch[0],
              email: emailMatch[0],
              commits: 0,
              pullRequests: 0,
              codeReviews: 0,
              bugsIntroduced: 0,
              linesAdded: 0,
              linesDeleted: 0,
              techDebtScore: 0,
              velocity: 0,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      return agents;
    });

    console.log(`✅ Extracted metrics for ${metrics.length} agents`);

    // If no agents found, log page structure for debugging
    if (metrics.length === 0) {
      console.log('⚠️  No agents found. Check screenshots/team-performance-final.png for page structure');
    }

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
