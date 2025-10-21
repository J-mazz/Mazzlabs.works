import dotenv from 'dotenv';
import { initDatabase } from './database/schema.js';
import { UserManager } from './database/users.js';
import { EmailManager } from './database/emails.js';
import { MailSMTPServer } from './smtp/server.js';
import { APIServer } from './api/server.js';

// Load environment variables
dotenv.config();

const config = {
  port: parseInt(process.env.PORT) || 3000,
  smtpPort: parseInt(process.env.SMTP_PORT) || 25,
  smtpPortSecure: parseInt(process.env.SMTP_PORT_SECURE) || 465,
  domain: process.env.DOMAIN || 'mazzlabs.works',
  hostname: process.env.HOSTNAME || 'mail.mazzlabs.works',
  tlsKey: process.env.TLS_KEY_PATH,
  tlsCert: process.env.TLS_CERT_PATH,
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  dbPath: process.env.DB_PATH || './data/mail.db'
};

console.log('=================================');
console.log('MazzLabs Mail Server');
console.log('=================================');
console.log(`Domain: ${config.domain}`);
console.log(`Hostname: ${config.hostname}`);
console.log('=================================\n');

// Initialize database
const db = initDatabase(config.dbPath);
const userManager = new UserManager(db);
const emailManager = new EmailManager(db);

// Create admin user if it doesn't exist
const adminEmail = process.env.ADMIN_EMAIL || 'admin@mazzlabs.works';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

try {
  const existingAdmin = userManager.getUserByEmail(adminEmail);
  if (!existingAdmin) {
    await userManager.createUser(adminEmail, adminPassword, true);
    console.log(`✓ Admin user created: ${adminEmail}`);
    console.log(`  Default password: ${adminPassword}`);
    console.log('  PLEASE CHANGE THIS PASSWORD!\n');
  } else {
    console.log(`✓ Admin user exists: ${adminEmail}\n`);
  }
} catch (err) {
  console.error('Error creating admin user:', err);
}

// Start SMTP server
const smtpServer = new MailSMTPServer(emailManager, userManager, config);
smtpServer.start();

// Start API server
const apiServer = new APIServer(emailManager, userManager, config);
apiServer.start();

console.log('\n=================================');
console.log('Servers running:');
console.log(`- API Server: http://localhost:${config.port}`);
console.log(`- SMTP Server: port ${config.smtpPort}`);
console.log('=================================\n');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  smtpServer.stop();
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  smtpServer.stop();
  db.close();
  process.exit(0);
});
