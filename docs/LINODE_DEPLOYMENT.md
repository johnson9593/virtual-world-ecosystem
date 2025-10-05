# Virtual World Ecosystem - Linode Deployment Guide

## Server Requirements

### Recommended Linode Plan
- **Plan**: Linode 2GB (Nanode or Shared CPU)
- **RAM**: 2GB minimum (4GB recommended for better performance)
- **Storage**: 50GB SSD
- **CPU**: 1 vCPU (2 vCPUs recommended)
- **Transfer**: 2TB
- **Network**: 40 Gbps
- **Estimated Cost**: $12-24/month

### Operating System
- **Distribution**: Ubuntu 22.04 LTS (recommended)
- **Alternative**: Debian 11 or CentOS 8

## Step-by-Step Deployment Instructions

### 1. Create Linode Instance

1. Log in to [cloud.linode.com](https://cloud.linode.com)
2. Click "Create" → "Linode"
3. Select the following:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Region**: Choose closest to your users
   - **Linode Plan**: Shared CPU → Linode 2GB ($12/month)
   - **Linode Label**: virtual-world-server
   - **Root Password**: Create a strong password
   - **SSH Keys**: Add your SSH key (recommended)
4. Click "Create Linode"
5. Wait for the server to boot (usually 1-2 minutes)

### 2. Initial Server Setup

SSH into your server:
```bash
ssh root@YOUR_LINODE_IP
```

Update system packages:
```bash
apt update && apt upgrade -y
```

Install required software:
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Git
apt install -y git

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server/reverse proxy)
apt install -y nginx

# Install UFW (firewall)
apt install -y ufw
```

### 3. Create Application User

Create a dedicated user for the application:
```bash
adduser virtualworld
usermod -aG sudo virtualworld
su - virtualworld
```

### 4. Deploy Application

Clone or upload your application:
```bash
cd /home/virtualworld
mkdir virtual-world
cd virtual-world

# If using Git:
# git clone YOUR_REPOSITORY_URL .

# Or upload files via SCP from your local machine:
# scp -r /path/to/virtual-world/* virtualworld@YOUR_LINODE_IP:/home/virtualworld/virtual-world/
```

If uploading manually, create the directory structure and copy all files from the virtual-world folder.

Install dependencies:
```bash
npm install
```

### 5. Configure Environment Variables

Create the .env file:
```bash
nano .env
```

Add the following configuration:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_SECURE_STRING
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SIMULATION_INTERVAL=30000
FOOD_GROWTH_RATE=50
```

**Important**: 
- Change `JWT_SECRET` to a random secure string
- Configure SMTP settings if you want email notifications
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)

Save and exit (Ctrl+X, then Y, then Enter)

### 6. Start Application with PM2

Start the application:
```bash
cd /home/virtualworld/virtual-world
pm2 start server/server.js --name virtual-world
pm2 save
pm2 startup
```

Copy and run the command that PM2 outputs to enable auto-start on reboot.

Check application status:
```bash
pm2 status
pm2 logs virtual-world
```

### 7. Configure Nginx Reverse Proxy

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/virtual-world
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/virtual-world /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configure Firewall

Set up UFW firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 9. Optional: Set Up SSL with Let's Encrypt

If you have a domain name, secure it with SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to complete SSL setup.

### 10. Access Your Application

Your Virtual World is now live!

- **URL**: http://YOUR_LINODE_IP (or https://yourdomain.com if SSL configured)
- **Admin Login**: 
  - Username: `admin`
  - Password: `admin123`

**IMPORTANT**: Change the admin password immediately after first login!

## Server Management Commands

### PM2 Commands
```bash
# View application status
pm2 status

# View logs
pm2 logs virtual-world

# Restart application
pm2 restart virtual-world

# Stop application
pm2 stop virtual-world

# Start application
pm2 start virtual-world

# Monitor resources
pm2 monit
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### System Monitoring
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

## Backup Strategy

### Database Backup
```bash
# Create backup directory
mkdir -p /home/virtualworld/backups

# Backup database
cp /home/virtualworld/virtual-world/server/ecosystem.db /home/virtualworld/backups/ecosystem-$(date +%Y%m%d).db

# Automated daily backup (add to crontab)
crontab -e
# Add this line:
0 2 * * * cp /home/virtualworld/virtual-world/server/ecosystem.db /home/virtualworld/backups/ecosystem-$(date +\%Y\%m\%d).db
```

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs virtual-world --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart application
pm2 restart virtual-world
```

### Can't Access Website
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check firewall
sudo ufw status

# Test if app is running
curl http://localhost:3000/api/health
```

### High Memory Usage
```bash
# Check memory
free -h

# Restart application
pm2 restart virtual-world

# Consider upgrading to 4GB Linode plan
```

## Scaling Considerations

### For Higher Traffic
1. Upgrade to Linode 4GB or 8GB plan
2. Enable Nginx caching
3. Use Linode's NodeBalancer for load balancing
4. Consider using Linode Object Storage for database backups

### For Multiple Regions
1. Deploy to multiple Linode regions
2. Use Linode's DNS Manager for geo-routing
3. Set up database replication

## Security Best Practices

1. **Change default passwords immediately**
2. **Keep system updated**: `sudo apt update && sudo apt upgrade`
3. **Use SSH keys instead of passwords**
4. **Enable automatic security updates**
5. **Regular backups**
6. **Monitor logs regularly**
7. **Use strong JWT_SECRET**
8. **Enable SSL/HTTPS**
9. **Implement rate limiting** (consider adding express-rate-limit)
10. **Regular security audits**

## Cost Optimization

- **Linode 2GB**: $12/month - Good for 100-500 concurrent users
- **Linode 4GB**: $24/month - Good for 500-2000 concurrent users
- **Backups**: +$2/month (optional but recommended)
- **NodeBalancer**: $10/month (only if needed for high traffic)

## Support Resources

- Linode Documentation: https://www.linode.com/docs/
- Linode Community: https://www.linode.com/community/
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- Nginx Documentation: https://nginx.org/en/docs/

## Quick Deployment Script

Save this as `deploy.sh` and run it after creating your Linode:

```bash
#!/bin/bash
# Quick deployment script for Virtual World

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx ufw

# Install PM2
npm install -g pm2

# Create user
adduser --disabled-password --gecos "" virtualworld

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "Basic setup complete! Now upload your application files and configure."
```

## Monitoring and Maintenance

### Set Up Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Checks
Create a monitoring script to check application health:
```bash
#!/bin/bash
# health-check.sh
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $response != "200" ]; then
    pm2 restart virtual-world
    echo "Application restarted at $(date)" >> /var/log/virtual-world-health.log
fi
```

Add to crontab to run every 5 minutes:
```bash
*/5 * * * * /home/virtualworld/health-check.sh
```

---

**Your Virtual World Ecosystem is now ready to host creatures and users!**

For questions or issues, refer to the troubleshooting section or check the application logs.