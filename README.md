# 🌍 Virtual World Ecosystem

A server-based virtual world simulation where users can create and manage virtual creatures that interact in a living ecosystem. Creatures can be Herbivores, Carnivores, or Omnivores, each with unique behaviors and survival strategies.

## Features

### 🦁 Creature System
- **Three Creature Types**:
  - 🌿 **Herbivores**: Eat plants, peaceful but vulnerable
  - 🦁 **Carnivores**: Hunt other creatures, strong but energy-intensive
  - 🐻 **Omnivores**: Eat both plants and meat, balanced and adaptable

- **Creature Lifecycle**:
  - Aging system (creatures age over time)
  - Health and energy management
  - Reproduction when conditions are favorable
  - Natural death from old age, starvation, or predation

### 🌎 Living Ecosystem
- **Dynamic World**: 25 initial creatures spawn at startup
- **Food Chain**: Carnivores hunt herbivores, omnivores adapt
- **Resource Management**: Food grows over time, creatures compete
- **Real-time Simulation**: Ecosystem runs continuously with automatic updates
- **Interactive Map**: Visual representation of creature positions and health

### 👥 User Features
- **User Registration & Authentication**: Secure login system
- **Creature Creation**: Users can create and name their own creatures
- **Creature Management**: Track your creatures' health, energy, and age
- **Daily Notifications**: Receive daily reports about your creatures
- **Personal Dashboard**: View all your creatures and their status

### ⚙️ Admin Panel
- **World Overview**: Monitor entire ecosystem
- **All Creatures**: View every creature in the world
- **Event Log**: Track births, deaths, hunts, and other events
- **User Management**: See all registered users
- **Real-time Statistics**: Population counts, food levels, and more

### 📧 Notification System
- **Daily Reports**: Automated daily summaries sent to users
- **Event Notifications**: Get notified when your creatures reproduce or die
- **Email Integration**: Optional email notifications via SMTP

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: Vanilla JavaScript + HTML5 Canvas
- **Scheduling**: node-cron for automated tasks
- **Email**: Nodemailer for notifications

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git (optional)

### Installation

1. **Clone or download the repository**
```bash
cd virtual-world
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
nano .env
```

Edit the `.env` file with your settings:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

4. **Start the server**
```bash
npm start
```

5. **Access the application**
Open your browser and go to: `http://localhost:3000`

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

## Project Structure

```
virtual-world/
├── server/
│   ├── server.js           # Main server file
│   ├── database.js         # Database management
│   ├── ecosystem.js        # Ecosystem simulation logic
│   ├── auth.js            # Authentication middleware
│   └── notificationService.js  # Notification system
├── client/
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Styling
│   └── app.js            # Frontend JavaScript
├── docs/
│   └── LINODE_DEPLOYMENT.md  # Deployment guide
├── .env.example          # Environment variables template
├── package.json          # Dependencies
└── README.md            # This file
```

## How It Works

### Ecosystem Simulation

The ecosystem runs in continuous cycles (default: every 30 seconds):

1. **Creature Processing**:
   - Each creature ages by 1 day
   - Energy decreases based on creature type
   - Creatures attempt to eat based on their type
   - Health changes based on energy levels
   - Creatures move randomly across the map

2. **Interactions**:
   - Carnivores hunt nearby herbivores and weak omnivores
   - Herbivores consume available plant food
   - Omnivores can hunt or eat plants

3. **Lifecycle Events**:
   - Healthy creatures can reproduce (5% chance per cycle)
   - Creatures die from starvation, health depletion, or old age
   - Food resources regenerate each cycle

4. **Notifications**:
   - Users receive notifications when their creatures reproduce or die
   - Daily reports summarize all creature statuses

### Creature Attributes

Each creature has:
- **Name**: User-defined or auto-generated
- **Type**: Herbivore, Carnivore, or Omnivore
- **Health**: 0-100% (decreases when energy is low)
- **Energy**: 0-100% (decreases each cycle, restored by eating)
- **Age**: Days since creation
- **Position**: X,Y coordinates on the world map

### Survival Strategies

- **Herbivores**: 
  - Low energy consumption
  - Easy food access
  - Vulnerable to predators
  
- **Carnivores**: 
  - High energy consumption
  - Must hunt successfully
  - Strong but resource-intensive
  
- **Omnivores**: 
  - Moderate energy consumption
  - Flexible food sources
  - Balanced survival strategy

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Creatures
- `POST /api/creatures` - Create new creature
- `GET /api/creatures` - Get all living creatures
- `GET /api/creatures/my` - Get user's creatures

### World
- `GET /api/world` - Get world state
- `GET /api/world/stats` - Get detailed world statistics

### Admin (requires admin role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/events` - Get recent events
- `GET /api/admin/creatures/all` - Get all creatures (including dead)

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/report` - Get user's daily report

## Deployment

### Linode Cloud Hosting

For detailed deployment instructions to Linode, see [LINODE_DEPLOYMENT.md](docs/LINODE_DEPLOYMENT.md)

**Quick Summary**:
1. Create a Linode 2GB instance with Ubuntu 22.04
2. Install Node.js, PM2, and Nginx
3. Upload application files
4. Configure environment variables
5. Start with PM2
6. Set up Nginx reverse proxy
7. Configure firewall
8. Optional: Add SSL with Let's Encrypt

**Recommended Linode Plan**: Linode 2GB ($12/month)

### Other Hosting Options

The application can be deployed to:
- **AWS EC2**: Similar to Linode setup
- **DigitalOcean**: Use their App Platform or Droplets
- **Heroku**: Use Heroku Postgres instead of SQLite
- **Google Cloud**: Use Compute Engine
- **Azure**: Use Virtual Machines

## Configuration

### Simulation Settings

Adjust in `.env`:
```env
SIMULATION_INTERVAL=30000  # Cycle time in milliseconds (30 seconds)
FOOD_GROWTH_RATE=50       # Food units added per cycle
```

### Email Notifications

To enable email notifications:
1. Set up an email account (Gmail recommended)
2. Generate an app password (for Gmail: https://support.google.com/accounts/answer/185833)
3. Configure SMTP settings in `.env`

## Monitoring

### PM2 Commands (Production)
```bash
pm2 status              # View status
pm2 logs virtual-world  # View logs
pm2 restart virtual-world  # Restart
pm2 monit              # Monitor resources
```

### Health Check
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting

### Application won't start
- Check if port 3000 is available: `lsof -i :3000`
- Verify Node.js version: `node --version` (should be 18+)
- Check logs for errors

### Database errors
- Ensure write permissions in the server directory
- Delete `ecosystem.db` to reset (will lose all data)

### Email notifications not working
- Verify SMTP credentials in `.env`
- Check if email provider allows SMTP access
- For Gmail, use an App Password, not your regular password

## Development

### Running in Development Mode
```bash
npm install -g nodemon
npm run dev
```

### Database Reset
To reset the database and start fresh:
```bash
rm server/ecosystem.db
npm start
```

## Security Considerations

1. **Change default admin password immediately**
2. **Use strong JWT_SECRET in production**
3. **Enable HTTPS with SSL certificate**
4. **Keep dependencies updated**: `npm audit fix`
5. **Use environment variables for sensitive data**
6. **Implement rate limiting for API endpoints**
7. **Regular backups of the database**

## Future Enhancements

Potential features for future versions:
- [ ] Multiple biomes (forest, desert, ocean)
- [ ] Weather system affecting creature behavior
- [ ] Creature evolution and mutations
- [ ] Trading system between users
- [ ] Achievements and leaderboards
- [ ] Mobile app
- [ ] WebSocket for real-time updates
- [ ] Advanced AI for creature behavior
- [ ] Seasonal changes
- [ ] Creature customization (colors, traits)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for any purpose.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the deployment guide
3. Check application logs
4. Open an issue on the repository

## Credits

Created by NinjaTech AI

---

**Enjoy your Virtual World Ecosystem! 🌍🦁🌿**