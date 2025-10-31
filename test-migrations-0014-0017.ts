/**
 * Test script to validate Phase 1 migrations (0014-0017)
 * This tests that migrations can be imported and have valid structure
 */

import * as migration0014 from './src/database/migrations/0000000000014_add_email_to_external_persons';
import * as migration0015 from './src/database/migrations/0000000000015_create_external_person_connections';
import * as migration0016 from './src/database/migrations/0000000000016_create_user_notifications';
import * as migration0017 from './src/database/migrations/0000000000017_create_expense_external_person_links';

async function testMigrations() {
  console.log('🧪 Testing Phase 1 migrations...\n');

  const migrations = [
    { name: '0014_add_email_to_external_persons', module: migration0014 },
    { name: '0015_create_external_person_connections', module: migration0015 },
    { name: '0016_create_user_notifications', module: migration0016 },
    { name: '0017_create_expense_external_person_links', module: migration0017 },
  ];

  let allPassed = true;

  for (const migration of migrations) {
    try {
      // Check that up and down functions exist
      if (typeof migration.module.up !== 'function') {
        console.error(`❌ ${migration.name}: Missing 'up' function`);
        allPassed = false;
        continue;
      }

      if (typeof migration.module.down !== 'function') {
        console.error(`❌ ${migration.name}: Missing 'down' function`);
        allPassed = false;
        continue;
      }

      console.log(`✅ ${migration.name}: Structure valid`);
    } catch (error) {
      console.error(`❌ ${migration.name}: Error -`, error);
      allPassed = false;
    }
  }

  console.log('\n' + (allPassed ? '✅ All migrations are valid!' : '❌ Some migrations have issues'));
  process.exit(allPassed ? 0 : 1);
}

testMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

