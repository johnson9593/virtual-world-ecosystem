const cron = require('node-cron');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor(database, ecosystem) {
    this.db = database;
    this.ecosystem = ecosystem;
    this.transporter = null;
    this.setupEmailTransporter();
  }

  setupEmailTransporter() {
    // Configure email transporter
    // For production, use real SMTP credentials
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-password'
      }
    });

    console.log('Email transporter configured (update SMTP settings in .env for production)');
  }

  // Schedule daily notifications
  scheduleDailyNotifications() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Sending daily notifications...');
      this.sendDailyReports();
    });

    console.log('Daily notifications scheduled for 9:00 AM');
  }

  // Send daily reports to all users
  async sendDailyReports() {
    this.db.db.all('SELECT * FROM users WHERE is_admin = 0', (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return;
      }

      users.forEach(user => {
        this.ecosystem.generateUserReport(user.id, (err, report) => {
          if (err) {
            console.error(`Error generating report for user ${user.username}:`, err);
            return;
          }

          const message = this.formatDailyReport(user, report);
          
          // Save notification to database
          this.db.createNotification(user.id, message, (err) => {
            if (err) {
              console.error('Error saving notification:', err);
            }
          });

          // Send email (if configured)
          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.sendEmail(user.email, 'Virtual World Daily Report', message);
          } else {
            console.log(`Daily report for ${user.username}:\n${message}`);
          }
        });
      });
    });
  }

  // Format daily report message
  formatDailyReport(user, report) {
    let message = `🌍 Virtual World Daily Report - Day ${report.day}\n\n`;
    message += `Hello ${user.username}!\n\n`;
    message += `📊 Your Creatures Status:\n`;
    message += `- Total Creatures: ${report.totalCreatures}\n`;
    message += `- Alive: ${report.aliveCreatures}\n`;
    message += `- Deceased: ${report.deadCreatures}\n\n`;

    if (report.creatures.length > 0) {
      message += `🦁 Living Creatures:\n`;
      report.creatures.forEach(creature => {
        const healthBar = '█'.repeat(Math.floor(creature.health / 10));
        const energyBar = '█'.repeat(Math.floor(creature.energy / 10));
        message += `\n  ${creature.name} (${creature.type})\n`;
        message += `    Age: ${creature.age} days\n`;
        message += `    Health: ${healthBar} ${creature.health}%\n`;
        message += `    Energy: ${energyBar} ${creature.energy}%\n`;
      });
    } else {
      message += `You currently have no living creatures. Create new ones to join the ecosystem!\n`;
    }

    message += `\n🌎 World Statistics:\n`;
    message += `- Total Population: ${report.worldStats.totalPopulation}\n`;
    message += `- Herbivores: ${report.worldStats.herbivores}\n`;
    message += `- Carnivores: ${report.worldStats.carnivores}\n`;
    message += `- Omnivores: ${report.worldStats.omnivores}\n`;
    message += `- Food Available: ${report.worldStats.foodAvailable} units\n\n`;
    message += `Visit the Virtual World dashboard to see more details!\n`;

    return message;
  }

  // Send email notification
  async sendEmail(to, subject, text) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER || 'virtualworld@example.com',
        to: to,
        subject: subject,
        text: text
      });
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error.message);
    }
  }

  // Send immediate notification
  sendImmediateNotification(userId, message) {
    this.db.getUserById(userId, (err, user) => {
      if (err || !user) {
        console.error('Error fetching user:', err);
        return;
      }

      this.db.createNotification(userId, message, (err) => {
        if (err) {
          console.error('Error saving notification:', err);
        }
      });

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.sendEmail(user.email, 'Virtual World Notification', message);
      }
    });
  }
}

module.exports = NotificationService;