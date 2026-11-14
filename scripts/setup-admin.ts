import 'dotenv/config';
import readline from 'readline';
import { createDatabase, countAdmins } from '../server/db/database';
import { provisionInitialAdmin } from '../server/auth/adminBootstrap';
import { generateSecurePassword, isValidEmail, isValidFullName, validatePasswordStrength } from '../server/auth/validation';

function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const autoGenerate = args.has('--generate');

  const db = createDatabase();

  if (countAdmins(db) > 0) {
    console.log('✓ Initial ADMIN account is already provisioned in SQLite.');
    console.log('  System policy allows only one securely provisioned ADMIN.');
    db.close();
    process.exit(0);
  }

  let fullName = process.env.INITIAL_ADMIN_NAME || '';
  let email = process.env.INITIAL_ADMIN_EMAIL || '';
  let password = process.env.INITIAL_ADMIN_PASSWORD || '';

  if (autoGenerate) {
    fullName = fullName || 'System Administrator';
    email = email || 'admin@smartlaunch.local';
    password = password || generateSecurePassword(16);
  } else if (!email || !password) {
    if (!process.stdin.isTTY) {
      console.error(
        'Error: Non-interactive shell without INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD.\n' +
        'Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD, or run with --generate for local dev setup.'
      );
      db.close();
      process.exit(1);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log('\n=== Smart Launch Risk Assessment — Initial Admin Setup ===\n');
      while (!isValidFullName(fullName)) {
        fullName = (await askQuestion(rl, 'Admin Full Name [System Administrator]: ')) || 'System Administrator';
      }
      while (!isValidEmail(email)) {
        email = await askQuestion(rl, 'Admin Email Address: ');
        if (!isValidEmail(email)) {
          console.log('  Invalid email format. Please try again.');
        }
      }
      while (!validatePasswordStrength(password).valid) {
        const pwInput = await askQuestion(
          rl,
          'Admin Password (min 8 chars, upper+lower+number+symbol, or leave blank to auto-generate): '
        );
        if (!pwInput) {
          password = generateSecurePassword(16);
          console.log(`  Generated secure password: ${password}`);
          break;
        }
        const check = validatePasswordStrength(pwInput);
        if (!check.valid) {
          console.log(`  Weak password: ${check.errors.join(' ')}`);
        } else {
          password = pwInput;
        }
      }
    } finally {
      rl.close();
    }
  }

  const result = await provisionInitialAdmin(db, { fullName, email, password });
  db.close();

  if (result.created) {
    console.log('\n✓ Initial ADMIN account provisioned successfully in SQLite.');
    console.log(`  Email   : ${result.email}`);
    if (autoGenerate && !process.env.INITIAL_ADMIN_PASSWORD) {
      console.log(`  Password: ${password}`);
      console.log('  (Save this password securely — it is stored only as a bcrypt hash.)');
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error('Setup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
