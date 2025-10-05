const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'ecosystem.db'), (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Database connected successfully');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          is_admin INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Creatures table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS creatures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('Herbivore', 'Carnivore', 'Omnivore')),
          health INTEGER DEFAULT 100,
          energy INTEGER DEFAULT 100,
          age INTEGER DEFAULT 0,
          x_position REAL DEFAULT 0,
          y_position REAL DEFAULT 0,
          is_alive INTEGER DEFAULT 1,
          creator_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          died_at DATETIME,
          FOREIGN KEY (creator_id) REFERENCES users(id)
        )
      `);

      // World state table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS world_state (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          day INTEGER DEFAULT 1,
          total_creatures INTEGER DEFAULT 0,
          herbivores INTEGER DEFAULT 0,
          carnivores INTEGER DEFAULT 0,
          omnivores INTEGER DEFAULT 0,
          food_available INTEGER DEFAULT 1000,
          last_update DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Events log table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          description TEXT NOT NULL,
          creature_id INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (creature_id) REFERENCES creatures(id)
        )
      `);

      // Notifications table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          sent INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Initialize world state if not exists
      this.db.get('SELECT * FROM world_state LIMIT 1', (err, row) => {
        if (!row) {
          this.db.run(`
            INSERT INTO world_state (day, food_available) 
            VALUES (1, 1000)
          `);
        }
      });

      // Create default admin user
      this.createDefaultAdmin();
    });
  }

  createDefaultAdmin() {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    this.db.run(
      `INSERT OR IGNORE INTO users (username, email, password, is_admin) 
       VALUES (?, ?, ?, 1)`,
      ['admin', 'admin@virtualworld.com', adminPassword],
      (err) => {
        if (err && !err.message.includes('UNIQUE constraint')) {
          console.error('Error creating admin:', err);
        }
      }
    );
  }

  // User methods
  createUser(username, email, password, callback) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    this.db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        callback(err, this ? this.lastID : null);
      }
    );
  }

  getUserByUsername(username, callback) {
    this.db.get('SELECT * FROM users WHERE username = ?', [username], callback);
  }

  getUserById(id, callback) {
    this.db.get('SELECT * FROM users WHERE id = ?', [id], callback);
  }

  // Creature methods
  createCreature(name, type, creatorId, callback) {
    const x = Math.random() * 1000;
    const y = Math.random() * 1000;
    
    this.db.run(
      `INSERT INTO creatures (name, type, x_position, y_position, creator_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, type, x, y, creatorId],
      function(err) {
        callback(err, this ? this.lastID : null);
      }
    );
  }

  getAllCreatures(callback) {
    this.db.all('SELECT * FROM creatures WHERE is_alive = 1', callback);
  }

  getCreaturesByUser(userId, callback) {
    this.db.all(
      'SELECT * FROM creatures WHERE creator_id = ? ORDER BY created_at DESC',
      [userId],
      callback
    );
  }

  updateCreature(id, updates, callback) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    this.db.run(
      `UPDATE creatures SET ${fields} WHERE id = ?`,
      values,
      callback
    );
  }

  // World state methods
  getWorldState(callback) {
    this.db.get('SELECT * FROM world_state ORDER BY id DESC LIMIT 1', callback);
  }

  updateWorldState(updates, callback) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    this.db.run(
      `UPDATE world_state SET ${fields}, last_update = CURRENT_TIMESTAMP WHERE id = 1`,
      values,
      callback
    );
  }

  // Events methods
  logEvent(eventType, description, creatureId, callback) {
    this.db.run(
      'INSERT INTO events (event_type, description, creature_id) VALUES (?, ?, ?)',
      [eventType, description, creatureId],
      callback
    );
  }

  getRecentEvents(limit, callback) {
    this.db.all(
      'SELECT * FROM events ORDER BY timestamp DESC LIMIT ?',
      [limit],
      callback
    );
  }

  // Notification methods
  createNotification(userId, message, callback) {
    this.db.run(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [userId, message],
      callback
    );
  }

  getPendingNotifications(callback) {
    this.db.all(
      `SELECT n.*, u.email, u.username 
       FROM notifications n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.sent = 0`,
      callback
    );
  }

  markNotificationSent(id, callback) {
    this.db.run('UPDATE notifications SET sent = 1 WHERE id = ?', [id], callback);
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;