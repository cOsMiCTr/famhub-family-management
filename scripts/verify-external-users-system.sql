-- External Users Linking System - Database Verification Script
-- Run this script to verify all tables, indexes, and constraints are in place

-- ============================================
-- 1. Table Existence Verification
-- ============================================
SELECT 'Table Verification' as test_section;

SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('external_persons'),
    ('external_person_user_connections'),
    ('user_notifications'),
    ('expense_external_person_links')
) AS t(table_name);

-- ============================================
-- 2. Column Verification for external_persons
-- ============================================
SELECT 'external_persons Columns' as test_section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'external_persons'
ORDER BY ordinal_position;

-- Expected columns:
-- id, household_id, name, email, birth_date, relationship, notes, created_by_user_id, created_at, updated_at

-- ============================================
-- 3. Column Verification for external_person_user_connections
-- ============================================
SELECT 'external_person_user_connections Columns' as test_section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'external_person_user_connections'
ORDER BY ordinal_position;

-- Expected columns:
-- id, external_person_id, invited_user_id, invited_by_user_id, status, expires_at, created_at, responded_at

-- ============================================
-- 4. Column Verification for user_notifications
-- ============================================
SELECT 'user_notifications Columns' as test_section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_notifications'
ORDER BY ordinal_position;

-- Expected columns:
-- id, user_id, notification_type, severity, title, message, entity_type, entity_id, is_read, created_at

-- ============================================
-- 5. Foreign Key Constraints Verification
-- ============================================
SELECT 'Foreign Key Constraints' as test_section;

SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'external_persons',
    'external_person_user_connections',
    'user_notifications',
    'expense_external_person_links'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 6. Index Verification
-- ============================================
SELECT 'Index Verification' as test_section;

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'external_persons',
  'external_person_user_connections',
  'user_notifications',
  'expense_external_person_links'
)
ORDER BY tablename, indexname;

-- Expected indexes:
-- external_persons: household_id, created_by_user_id, email (if unique)
-- external_person_user_connections: external_person_id, invited_user_id, invited_by_user_id, status
-- user_notifications: user_id, is_read, created_at

-- ============================================
-- 7. Check Constraints (Status Enum)
-- ============================================
SELECT 'Check Constraints' as test_section;

SELECT 
  table_name,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%status%'
  OR constraint_name LIKE '%external_person%'
ORDER BY table_name, constraint_name;

-- Expected: status IN ('pending', 'accepted', 'rejected', 'revoked', 'expired')

-- ============================================
-- 8. Data Integrity Checks
-- ============================================
SELECT 'Data Integrity Checks' as test_section;

-- Check for orphaned connections
SELECT 
  'Orphaned Connections' as check_name,
  COUNT(*) as issue_count
FROM external_person_user_connections epu
LEFT JOIN external_persons ep ON epu.external_person_id = ep.id
WHERE ep.id IS NULL;

-- Check for orphaned notifications
SELECT 
  'Orphaned Notifications' as check_name,
  COUNT(*) as issue_count
FROM user_notifications un
LEFT JOIN users u ON un.user_id = u.id
WHERE u.id IS NULL;

-- Check for invalid connection statuses
SELECT 
  'Invalid Connection Statuses' as check_name,
  COUNT(*) as issue_count
FROM external_person_user_connections
WHERE status NOT IN ('pending', 'accepted', 'rejected', 'revoked', 'expired');

-- Check for expired invitations that weren't marked
SELECT 
  'Unmarked Expired Invitations' as check_name,
  COUNT(*) as issue_count
FROM external_person_user_connections
WHERE status = 'pending' 
  AND expires_at < NOW();

-- ============================================
-- 9. Statistics Summary
-- ============================================
SELECT 'Statistics Summary' as test_section;

SELECT 
  'external_persons' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT household_id) as unique_households,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email
FROM external_persons
UNION ALL
SELECT 
  'external_person_user_connections' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT external_person_id) as unique_external_persons,
  COUNT(DISTINCT invited_user_id) as unique_invited_users
FROM external_person_user_connections
UNION ALL
SELECT 
  'user_notifications' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
FROM user_notifications;

-- ============================================
-- 10. Connection Status Distribution
-- ============================================
SELECT 'Connection Status Distribution' as test_section;

SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM external_person_user_connections
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- 11. Notification Type Distribution
-- ============================================
SELECT 'Notification Type Distribution' as test_section;

SELECT 
  notification_type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
FROM user_notifications
GROUP BY notification_type
ORDER BY count DESC;

-- ============================================
-- 12. Email Matching Test Query
-- ============================================
SELECT 'Email Matching Examples' as test_section;

SELECT 
  ep.id as external_person_id,
  ep.name as external_person_name,
  ep.email as external_person_email,
  ep.household_id,
  u.id as matching_user_id,
  u.email as matching_user_email,
  u.household_id as user_household_id,
  CASE 
    WHEN u.household_id = ep.household_id THEN '✅ Same Household'
    ELSE '❌ Different Household'
  END as household_match
FROM external_persons ep
LEFT JOIN users u ON LOWER(ep.email) = LOWER(u.email)
WHERE ep.email IS NOT NULL
ORDER BY ep.household_id, ep.email;

-- ============================================
-- 13. Active Connections Summary
-- ============================================
SELECT 'Active Connections Summary' as test_section;

SELECT 
  ep.name as external_person_name,
  ep.email as external_person_email,
  u1.email as invited_user_email,
  u2.email as invited_by_email,
  epu.status,
  epu.created_at,
  epu.expires_at,
  CASE 
    WHEN epu.expires_at < NOW() AND epu.status = 'pending' THEN '⚠️ EXPIRED'
    WHEN epu.expires_at < NOW() + INTERVAL '1 day' AND epu.status = 'pending' THEN '⚠️ Expires Soon'
    ELSE '✅ OK'
  END as expiry_status
FROM external_person_user_connections epu
JOIN external_persons ep ON epu.external_person_id = ep.id
JOIN users u1 ON epu.invited_user_id = u1.id
JOIN users u2 ON epu.invited_by_user_id = u2.id
ORDER BY epu.created_at DESC
LIMIT 20;

-- ============================================
-- End of Verification Script
-- ============================================

SELECT '✅ Verification Complete' as status;

