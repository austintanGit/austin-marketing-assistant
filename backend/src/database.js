const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('📁 Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Business profiles table
      `CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        business_name TEXT NOT NULL,
        business_type TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        website TEXT,
        description TEXT,
        target_audience TEXT,
        tone TEXT DEFAULT 'friendly',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Generated content table
      `CREATE TABLE IF NOT EXISTS generated_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        content_type TEXT NOT NULL, -- 'social_post', 'gmb_post', 'email'
        title TEXT,
        content TEXT NOT NULL,
        platform TEXT, -- 'facebook', 'instagram', 'gmb', 'email'
        scheduled_date DATE,
        status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'published'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id)
      )`,
      
      // Subscriptions table
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        plan TEXT DEFAULT 'basic',
        status TEXT DEFAULT 'active',
        current_period_start DATETIME,
        current_period_end DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        }
      });
    });
  }

  // Helper method for async queries
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Helper method for single row queries
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Helper method for insert/update/delete
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

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
module.exports = new Database();