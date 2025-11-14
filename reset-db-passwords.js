const Database = require('better-sqlite3');

const db = new Database('/opt/mazzlabs-mail/data/mail.db');

// The password: D3Kry97!D
const passwordHash = '$2b$10$EYwM1l88Wy.wfJIqj3G5aOMu85vWkGlCD9iNq72WQ.yLUenYtNDbe';

console.log('\n=== RESETTING PASSWORDS ===\n');

// Check existing users
const existing = db.prepare('SELECT id, email FROM users').all();
console.log('Existing users:');
if (existing.length === 0) {
  console.log('  ⚠️  NO USERS FOUND!');
} else {
  existing.forEach(u => console.log(`  ${u.id}: ${u.email}`));
}
console.log('');

// Create or update admin@mazzlabs.works
const adminExists = existing.find(u => u.email === 'admin@mazzlabs.works');
if (adminExists) {
  const result = db.prepare('UPDATE users SET password = ? WHERE email = ?').run(passwordHash, 'admin@mazzlabs.works');
  console.log(`✓ Updated admin@mazzlabs.works password (${result.changes} row)`);
} else {
  db.prepare(`INSERT INTO users (email, username, password, is_admin, created_at, updated_at)
              VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
    'admin@mazzlabs.works',
    'admin',
    passwordHash,
    1
  );
  console.log('✓ Created admin@mazzlabs.works');
}

// Create or update joseph@mazzlabs.works
const josephExists = existing.find(u => u.email === 'joseph@mazzlabs.works');
if (josephExists) {
  const result = db.prepare('UPDATE users SET password = ? WHERE email = ?').run(passwordHash, 'joseph@mazzlabs.works');
  console.log(`✓ Updated joseph@mazzlabs.works password (${result.changes} row)`);
} else {
  db.prepare(`INSERT INTO users (email, username, password, is_admin, created_at, updated_at)
              VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
    'joseph@mazzlabs.works',
    'joseph',
    passwordHash,
    1
  );
  console.log('✓ Created joseph@mazzlabs.works');
}

// Verify
console.log('');
const users = db.prepare('SELECT id, email, is_admin FROM users').all();
console.log('✅ Final user list:');
users.forEach(u => console.log(`  ${u.id}: ${u.email} (admin: ${u.is_admin})`));

console.log('\n🔑 Password for both: D3Kry97!D\n');

db.close();
