const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const Database = require('./database');
const Ecosystem = require('./ecosystem');
const AuthService = require('./auth');
const NotificationService = require('./notificationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Initialize services
const db = new Database();
const ecosystem = new Ecosystem(db);
const notificationService = new NotificationService(db, ecosystem);

// Initialize world and start simulation
setTimeout(async () => {
  await ecosystem.initializeWorld();
  ecosystem.startSimulation(30000); // Run simulation every 30 seconds
  notificationService.scheduleDailyNotifications();
}, 1000);

// ============= AUTH ROUTES =============

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.createUser(username, email, password, (err, userId) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: 'Error creating user' });
    }

    db.getUserById(userId, (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user' });
      }

      const token = AuthService.generateToken(user);
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.is_admin
        }
      });
    });
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.getUserByUsername(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!AuthService.comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = AuthService.generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  });
});

// Get current user
app.get('/api/auth/me', AuthService.authMiddleware, (req, res) => {
  db.getUserById(req.user.id, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin
    });
  });
});

// ============= CREATURE ROUTES =============

// Create new creature
app.post('/api/creatures', AuthService.authMiddleware, (req, res) => {
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  if (!['Herbivore', 'Carnivore', 'Omnivore'].includes(type)) {
    return res.status(400).json({ error: 'Invalid creature type' });
  }

  db.createCreature(name, type, req.user.id, (err, creatureId) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating creature' });
    }

    db.logEvent('CREATION', `${name} was created by ${req.user.username}`, creatureId, () => {});
    
    res.json({
      message: 'Creature created successfully',
      creatureId
    });
  });
});

// Get all creatures (for admin)
app.get('/api/creatures', AuthService.authMiddleware, (req, res) => {
  db.getAllCreatures((err, creatures) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching creatures' });
    }
    res.json(creatures);
  });
});

// Get user's creatures
app.get('/api/creatures/my', AuthService.authMiddleware, (req, res) => {
  db.getCreaturesByUser(req.user.id, (err, creatures) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching creatures' });
    }
    res.json(creatures);
  });
});

// ============= WORLD ROUTES =============

// Get world state
app.get('/api/world', AuthService.authMiddleware, (req, res) => {
  db.getWorldState((err, worldState) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching world state' });
    }
    res.json(worldState);
  });
});

// Get world statistics (detailed)
app.get('/api/world/stats', AuthService.authMiddleware, (req, res) => {
  db.getWorldState((err, worldState) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching world state' });
    }

    db.getAllCreatures((err, creatures) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching creatures' });
      }

      const stats = {
        ...worldState,
        creatures: creatures.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          health: c.health,
          energy: c.energy,
          age: c.age,
          position: { x: c.x_position, y: c.y_position },
          isAlive: c.is_alive
        }))
      };

      res.json(stats);
    });
  });
});

// ============= ADMIN ROUTES =============

// Get all users (admin only)
app.get('/api/admin/users', AuthService.authMiddleware, AuthService.adminMiddleware, (req, res) => {
  db.db.all('SELECT id, username, email, created_at FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching users' });
    }
    res.json(users);
  });
});

// Get recent events (admin only)
app.get('/api/admin/events', AuthService.authMiddleware, AuthService.adminMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  db.getRecentEvents(limit, (err, events) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching events' });
    }
    res.json(events);
  });
});

// Get all creatures including dead ones (admin only)
app.get('/api/admin/creatures/all', AuthService.authMiddleware, AuthService.adminMiddleware, (req, res) => {
  db.db.all('SELECT * FROM creatures ORDER BY created_at DESC', (err, creatures) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching creatures' });
    }
    res.json(creatures);
  });
});

// ============= NOTIFICATION ROUTES =============

// Get user notifications
app.get('/api/notifications', AuthService.authMiddleware, (req, res) => {
  db.db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id],
    (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching notifications' });
      }
      res.json(notifications);
    }
  );
});

// Get user report
app.get('/api/report', AuthService.authMiddleware, (req, res) => {
  ecosystem.generateUserReport(req.user.id, (err, report) => {
    if (err) {
      return res.status(500).json({ error: 'Error generating report' });
    }
    res.json(report);
  });
});

// ============= HEALTH CHECK =============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    simulation: 'running'
  });
});

// Serve frontend for root and other non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌍 Virtual World server running on port ${PORT}`);
  console.log(`📊 Admin credentials: username: admin, password: admin123`);
  console.log(`🔗 Access at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  ecosystem.stopSimulation();
  db.close();
  process.exit(0);
});