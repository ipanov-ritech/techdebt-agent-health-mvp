/**
 * Database Layer using SQLite
 * Stores agent metrics, analysis results, and improvement history
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, '../../data/agent-health.db');
    this.db = null;
  }

  /**
   * Initialize database and create tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📦 Connected to SQLite database');
          this.createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  /**
   * Create database schema
   */
  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        github_url TEXT,
        techdebtgpt_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id),
        UNIQUE(repository_id, email)
      )`,

      `CREATE TABLE IF NOT EXISTS agent_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        commits INTEGER DEFAULT 0,
        pull_requests INTEGER DEFAULT 0,
        code_reviews INTEGER DEFAULT 0,
        bugs_introduced INTEGER DEFAULT 0,
        lines_added INTEGER DEFAULT 0,
        lines_deleted INTEGER DEFAULT 0,
        tech_debt_score REAL DEFAULT 0,
        velocity REAL DEFAULT 0,
        health_score REAL DEFAULT 0,
        productivity_score REAL DEFAULT 0,
        quality_score REAL DEFAULT 0,
        collaboration_score REAL DEFAULT 0,
        reliability_score REAL DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )`,

      `CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        team_size INTEGER,
        team_average_score REAL,
        lowest_performer_id INTEGER,
        lowest_performer_score REAL,
        highest_performer_id INTEGER,
        highest_performer_score REAL,
        critical_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        healthy_count INTEGER DEFAULT 0,
        analysis_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id),
        FOREIGN KEY (lowest_performer_id) REFERENCES agents(id),
        FOREIGN KEY (highest_performer_id) REFERENCES agents(id)
      )`,

      `CREATE TABLE IF NOT EXISTS improvements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        analysis_id INTEGER,
        improvement_type TEXT,
        root_causes TEXT,
        recommendations TEXT,
        changes_applied TEXT,
        applied BOOLEAN DEFAULT 0,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (analysis_id) REFERENCES analyses(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id ON agent_metrics(agent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_agent_metrics_recorded_at ON agent_metrics(recorded_at)`,
      `CREATE INDEX IF NOT EXISTS idx_analyses_repo ON analyses(repository_id)`,
      `CREATE INDEX IF NOT EXISTS idx_improvements_agent ON improvements(agent_id)`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }
  }

  /**
   * Run SQL query
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Repository operations

  async addRepository(name, path, techdebtgpt_url, github_url = null) {
    const result = await this.run(
      `INSERT INTO repositories (name, path, techdebtgpt_url, github_url) VALUES (?, ?, ?, ?)`,
      [name, path, techdebtgpt_url, github_url]
    );
    return { id: result.id, name, path, techdebtgpt_url, github_url };
  }

  async getRepositories() {
    return this.all(`SELECT * FROM repositories ORDER BY created_at DESC`);
  }

  async getRepository(id) {
    return this.get(`SELECT * FROM repositories WHERE id = ?`, [id]);
  }

  async findRepositoryByGitHubUrl(github_url) {
    return this.get(`SELECT * FROM repositories WHERE github_url = ?`, [github_url]);
  }

  // Agent operations

  async addAgent(repository_id, name, email, role = null) {
    const result = await this.run(
      `INSERT INTO agents (repository_id, name, email, role) VALUES (?, ?, ?, ?)`,
      [repository_id, name, email, role]
    );
    return { id: result.id, repository_id, name, email, role };
  }

  async getAgents(repository_id) {
    return this.all(
      `SELECT * FROM agents WHERE repository_id = ? ORDER BY name`,
      [repository_id]
    );
  }

  async getAgent(id) {
    return this.get(`SELECT * FROM agents WHERE id = ?`, [id]);
  }

  async findAgentByEmail(email, repository_id) {
    return this.get(
      `SELECT * FROM agents WHERE email = ? AND repository_id = ?`,
      [email, repository_id]
    );
  }

  // Agent metrics operations

  async saveAgentMetrics(agent_id, metrics) {
    return this.run(
      `INSERT INTO agent_metrics (
        agent_id, commits, pull_requests, code_reviews, bugs_introduced,
        lines_added, lines_deleted, tech_debt_score, velocity,
        health_score, productivity_score, quality_score,
        collaboration_score, reliability_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agent_id,
        metrics.commits || 0,
        metrics.pull_requests || 0,
        metrics.code_reviews || 0,
        metrics.bugs_introduced || 0,
        metrics.lines_added || 0,
        metrics.lines_deleted || 0,
        metrics.tech_debt_score || 0,
        metrics.velocity || 0,
        metrics.health_score || 0,
        metrics.productivity_score || 0,
        metrics.quality_score || 0,
        metrics.collaboration_score || 0,
        metrics.reliability_score || 0
      ]
    );
  }

  async getAgentMetrics(agent_id, limit = 30) {
    return this.all(
      `SELECT * FROM agent_metrics
       WHERE agent_id = ?
       ORDER BY recorded_at DESC
       LIMIT ?`,
      [agent_id, limit]
    );
  }

  async getAgentsWithLatestMetrics(repository_id) {
    return this.all(
      `SELECT
        a.id, a.name, a.email, a.role,
        m.commits, m.pull_requests, m.code_reviews, m.bugs_introduced,
        m.lines_added, m.lines_deleted, m.tech_debt_score, m.velocity,
        m.health_score, m.recorded_at
       FROM agents a
       LEFT JOIN agent_metrics m ON a.id = m.agent_id
       WHERE a.repository_id = ?
         AND m.id = (
           SELECT id FROM agent_metrics
           WHERE agent_id = a.id
           ORDER BY recorded_at DESC
           LIMIT 1
         )
       ORDER BY m.health_score ASC`,
      [repository_id]
    );
  }

  async getAgentLeaderboard(repository_id) {
    return this.all(
      `SELECT
        a.id, a.name, a.email, a.role,
        m.health_score,
        m.productivity_score,
        m.quality_score,
        m.collaboration_score,
        m.reliability_score,
        m.commits,
        m.pull_requests,
        m.bugs_introduced,
        m.recorded_at
       FROM agents a
       LEFT JOIN agent_metrics m ON a.id = m.agent_id
       WHERE a.repository_id = ?
         AND m.id = (
           SELECT id FROM agent_metrics
           WHERE agent_id = a.id
           ORDER BY recorded_at DESC
           LIMIT 1
         )
       ORDER BY m.health_score DESC`,
      [repository_id]
    );
  }

  // Analysis operations

  async saveAnalysis(repository_id, analysis) {
    const result = await this.run(
      `INSERT INTO analyses (
        repository_id, team_size, team_average_score,
        lowest_performer_id, lowest_performer_score,
        highest_performer_id, highest_performer_score,
        critical_count, warning_count, healthy_count,
        analysis_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        repository_id,
        analysis.teamSize,
        analysis.teamAverageScore,
        analysis.lowestPerformer?.id || null,
        analysis.lowestPerformer?.score || null,
        analysis.highestPerformer?.id || null,
        analysis.highestPerformer?.score || null,
        analysis.criticalAgents?.length || 0,
        analysis.warningAgents?.length || 0,
        analysis.healthyAgents?.length || 0,
        JSON.stringify(analysis)
      ]
    );
    return result.id;
  }

  async getLatestAnalysis(repository_id) {
    return this.get(
      `SELECT * FROM analyses
       WHERE repository_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [repository_id]
    );
  }

  // Improvement operations

  async saveImprovement(agent_id, improvement) {
    return this.run(
      `INSERT INTO improvements (
        agent_id, improvement_type, root_causes, recommendations,
        changes_applied, applied, result
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        agent_id,
        improvement.type || 'manual',
        JSON.stringify(improvement.root_causes || []),
        JSON.stringify(improvement.recommendations || []),
        JSON.stringify(improvement.changes || {}),
        improvement.applied ? 1 : 0,
        JSON.stringify(improvement.result || {})
      ]
    );
  }

  async getImprovementHistory(agent_id, limit = 10) {
    return this.all(
      `SELECT * FROM improvements
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [agent_id, limit]
    );
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Database;
