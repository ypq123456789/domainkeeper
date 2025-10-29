const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/domains.db';
const dbDir = path.dirname(dbPath);

// 确保数据目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // 创建表
      const createTables = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT UNIQUE NOT NULL,
          system TEXT,
          registrar TEXT,
          registration_date TEXT,
          expiration_date TEXT,
          zone_id TEXT,
          is_custom BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS whois_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT UNIQUE NOT NULL,
          whois_data TEXT,
          cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          domains_count INTEGER,
          sync_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      db.exec(createTables, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
};

const close = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

// 辅助函数
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  init,
  getDb,
  close,
  run,
  get,
  all
};
