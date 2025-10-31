# External Users Linking System - Testing Guide

## Phase 8: Testing Considerations

This document provides comprehensive testing procedures for the External Users Linking System.

---

## Prerequisites

1. **Database Setup**:
   ```bash
   # Ensure all migrations are applied
   npm run migrate:latest
   npm run migrate:status
   ```

2. **Build Applications**:
   ```bash
   # Backend
   npm run build
   
   # Frontend
   cd client && npm run build && cd ..
   ```

3. **Start Server**:
   ```bash
   npm run dev
   # OR for production
   npm start
   ```

4. **Database Verification**:
   ```sql
   -- Verify all required tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'external_persons',
     'external_person_user_connections',
     'user_notifications',
     'expense_external_person_links'
   );
   ```

---

## Test Case 1: Email Matching

### Objective
Verify that when a user is created with an email matching an existing external person, the system detects the match and enables invitation.

### Test Steps

#### 1.1 Create External Person with Email
1. Login as a household member
2. Navigate to **Settings** → **External Members**
3. Click **Add External Person**
4. Fill in:
   - Name: "Test Friend"
   - Email: "friend@example.com"
   - Relationship: "Friend"
5. Click **Save**
6. ✅ Verify external person is created successfully

#### 1.2 Register User with Matching Email
1. Login as Admin
2. Navigate to **Admin** → **User Management**
3. Click **Create User**
4. Fill in:
   - Email: "friend@example.com" (same as external person)
   - Household: Select the same household
   - Role: "user"
5. Click **Create**
6. ✅ Verify user is created successfully
7. ✅ Verify response includes `external_person_match: { found: true, external_person_id: <id> }`

#### 1.3 Verify Invite Button Appears
1. Return to **Settings** → **External Members**
2. Find "Test Friend" external person
3. ✅ Verify "Invite" button is visible (not "Can invite" text)
4. ✅ Verify invitation status shows correctly

### Expected Results
- External person can be created with email
- User creation detects matching external person email
- Invite button appears when email matches registered user
- Notifications are sent to household members

### SQL Verification
```sql
-- Check external person
SELECT id, name, email, household_id 
FROM external_persons 
WHERE email = 'friend@example.com';

-- Check if user exists
SELECT id, email, household_id 
FROM users 
WHERE email = 'friend@example.com';

-- Check notifications created
SELECT * FROM user_notifications 
WHERE notification_type = 'external_person_match';
```

---

## Test Case 2: Invitation Flow

### Objective
Test the complete invitation lifecycle: send, accept, reject, revoke, and expire.

### Test Steps

#### 2.1 Send Invitation
1. From **External Members** page, click **Invite** for a person with matching email
2. ✅ Verify warning modal appears: "Share Linked Data?"
3. ✅ Verify warning message: "All linked expenses, income, and assets..."
4. Click **Confirm** to proceed
5. ✅ Verify invitation is sent successfully
6. ✅ Verify success notification appears

**Backend Verification**:
```sql
-- Check connection created
SELECT * FROM external_person_user_connections 
WHERE status = 'pending' 
ORDER BY created_at DESC LIMIT 1;

-- Should have:
-- - status = 'pending'
-- - expires_at = created_at + 5 days
-- - invited_user_id = user with matching email
-- - invited_by_user_id = current user
```

#### 2.2 Accept Invitation
1. Login as the invited user (friend@example.com)
2. Navigate to **Notifications** page OR click notification bell
3. ✅ Verify invitation notification appears
4. Click on notification or navigate to **Invitations** page
5. Find pending invitation in "Pending Invitations" section
6. Click **Accept** button
7. ✅ Verify invitation is accepted
8. ✅ Verify success notification appears
9. ✅ Verify inviter receives notification about acceptance

**Backend Verification**:
```sql
-- Check connection status updated
SELECT * FROM external_person_user_connections 
WHERE id = <connection_id>;

-- Should have:
-- - status = 'accepted'
-- - responded_at = current timestamp

-- Check notifications
SELECT * FROM user_notifications 
WHERE notification_type = 'invitation_accepted';
```

#### 2.3 Reject Invitation
1. As inviter, send another invitation (or create test scenario)
2. Login as invited user
3. Navigate to **Invitations** page
4. Find pending invitation
5. Click **Reject** button
6. ✅ Verify invitation is rejected
7. ✅ Verify status shows "Rejected"
8. ✅ Verify inviter receives notification about rejection

**Backend Verification**:
```sql
SELECT * FROM external_person_user_connections 
WHERE status = 'rejected';
```

#### 2.4 Revoke Invitation (Inviter Only)
1. Login as inviter
2. Navigate to **Invitations** page
3. Find sent invitation (status: "Pending" or "Accepted")
4. Click **Revoke** button
5. ✅ Verify confirmation dialog appears
6. Click **Confirm**
7. ✅ Verify invitation is revoked
8. ✅ Verify invitee receives notification (if was accepted)

**Backend Verification**:
```sql
SELECT * FROM external_person_user_connections 
WHERE status = 'revoked';
```

#### 2.5 Disconnect Accepted Connection
1. Login as either party (inviter or invitee)
2. Navigate to **Invitations** page
3. Find accepted connection
4. Click **Disconnect** button
5. ✅ Verify confirmation dialog appears
6. Click **Confirm**
7. ✅ Verify connection is disconnected (status: "Revoked")
8. ✅ Verify other party receives notification

**Backend Verification**:
```sql
-- Should allow either party to disconnect
SELECT * FROM external_person_user_connections 
WHERE status = 'revoked' 
AND (invited_by_user_id = <user_id> OR invited_user_id = <user_id>);
```

#### 2.6 Expire Invitation
**Note**: Invitations expire after 5 days. For testing, you can manually set expiry:

```sql
-- Manually expire an invitation for testing
UPDATE external_person_user_connections 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE status = 'pending' 
AND id = <connection_id>;
```

1. After manual expiry or wait 5 days
2. Login as invited user
3. Navigate to **Invitations** page
4. ✅ Verify expired invitation shows "Expired" status
5. ✅ Verify cannot accept expired invitation

**Background Job Verification**:
- Check server logs for cron job execution (runs daily at 2 AM UTC)
- Verify expired invitations are automatically marked as expired

---

## Test Case 3: Data Sharing

### Objective
Verify that when invitation is accepted, linked data is shared as read-only.

### Test Steps

#### 3.1 Create Expense Linked to External Person
1. Login as household member
2. Navigate to **Expenses** page
3. Create an expense:
   - Category: "Birthday Presents"
   - Link to external person (or household member)
   - Amount: 100
   - Currency: EUR
   - Date: Today
4. ✅ Verify expense is created

**Note**: For expenses, link via `expense_member_links` or `expense_external_person_links`

#### 3.2 Accept Invitation
1. Complete Test Case 2.2 (Accept Invitation)

#### 3.3 Verify Shared Data Appears
1. Login as invited user
2. Navigate to **Expenses** page
3. ✅ Verify "Shared with Me" filter toggle exists
4. Enable "Shared with Me" filter
5. ✅ Verify expense appears in list
6. ✅ Verify "Shared from [User Email]" badge is visible
7. ✅ Verify "Read-only" indicator is shown
8. Click on expense to view details
9. ✅ Verify edit/delete buttons are disabled or hidden
10. ✅ Verify cannot modify expense data

**Backend Verification**:
```sql
-- Check expense is linked
SELECT e.*, epu.id as connection_id
FROM expenses e
JOIN expense_external_person_links epl ON e.id = epl.expense_id
JOIN external_persons ep ON epl.external_person_id = ep.id
JOIN external_person_user_connections epu ON ep.id = epu.external_person_id
WHERE epu.status = 'accepted'
AND epu.invited_user_id = <invited_user_id>;
```

#### 3.4 Verify Read-Only Enforcement
1. As invited user, attempt to edit expense via API:
   ```bash
   curl -X PUT \
     -H "Authorization: Bearer <invited_user_token>" \
     -H "Content-Type: application/json" \
     -d '{"amount": 200}' \
     http://localhost:5000/api/expenses/<expense_id>
   ```
2. ✅ Verify request fails with appropriate error (403 Forbidden or similar)
3. ✅ Verify expense data is unchanged

---

## Test Case 4: Filtering

### Objective
Test "Shared with Me" filter on Expenses, Income, and Assets pages.

### Test Steps

#### 4.1 Test Expenses Filter
1. Login as invited user with accepted connection
2. Navigate to **Expenses** page
3. ✅ Verify "Shared with Me" toggle/filter exists
4. **With filter OFF**:
   - ✅ Verify only own expenses shown (or none if no own expenses)
5. **With filter ON**:
   - ✅ Verify only shared expenses are shown
   - ✅ Verify "Shared from" indicator on each expense
   - ✅ Verify read-only indicators visible

#### 4.2 Test Income Filter (if applicable)
**Note**: Income may not support external person linking yet. If implemented:
1. Navigate to **Income** page
2. ✅ Verify "Shared with Me" filter exists
3. Test same scenarios as Expenses

#### 4.3 Test Assets Filter
1. Navigate to **Assets** page
2. ✅ Verify "Shared with Me" filter exists
3. **With filter OFF**:
   - ✅ Verify only own assets shown
4. **With filter ON**:
   - ✅ Verify shared assets are shown
   - ✅ Verify shared ownership percentages displayed
   - ✅ Verify read-only indicators visible

#### 4.4 Filter by Connection (if implemented)
1. Navigate to **Linked Data** page (if exists)
2. ✅ Verify list of accepted connections
3. ✅ Verify filter by specific connection
4. Click on connection
5. ✅ Verify filtered view shows only data for that connection

---

## Test Case 5: Email Uniqueness

### Objective
Verify email uniqueness validation works correctly.

### Test Steps

#### 5.1 Attempt Duplicate User Email
1. Login as Admin
2. Navigate to **Admin** → **User Management**
3. Click **Create User**
4. Enter email that already exists: "existing@example.com"
5. Click **Create**
6. ✅ Verify error message: "User already exists"
7. ✅ Verify user is NOT created

**Backend Verification**:
```sql
-- Should still have only one user with this email
SELECT COUNT(*) FROM users WHERE email = 'existing@example.com';
-- Should return 1
```

#### 5.2 Attempt Duplicate External Person Email (Same Household)
1. Login as household member
2. Navigate to **Settings** → **External Members**
3. Create external person with email: "person@example.com"
4. ✅ Verify creation succeeds
5. Try to create another external person with same email
6. ✅ Verify error: "An external person with this email already exists in your household"
7. ✅ Verify second person is NOT created

**Backend Verification**:
```sql
-- Should have only one external person with this email in household
SELECT COUNT(*) FROM external_persons 
WHERE household_id = <household_id> 
AND LOWER(email) = LOWER('person@example.com');
-- Should return 1
```

#### 5.3 Email Case Insensitivity
1. Create external person with: "Person@Example.com"
2. Try to create another with: "person@example.com"
3. ✅ Verify duplicate error (case-insensitive matching)

---

## Additional Security Tests

### 6.1 Self-Invitation Prevention
1. Create external person with your own email
2. ✅ Verify "Invite" button is NOT visible (cannot invite yourself)
3. Attempt to send invitation via API:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <your_token>" \
     -H "Content-Type: application/json" \
     -d '{"external_person_id": <id>}' \
     http://localhost:5000/api/invitations
   ```
4. ✅ Verify error: "Cannot invite yourself"

### 6.2 Household Isolation
1. Create external person in Household A
2. Login as user from Household B
3. Attempt to invite external person from Household A
4. ✅ Verify error: "User does not belong to the same household"

### 6.3 Connection Ownership Verification
1. As User A, send invitation to User B
2. Login as User C (different user)
3. Attempt to accept invitation (via API):
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <user_c_token>" \
     http://localhost:5000/api/invitations/<connection_id>/accept
   ```
4. ✅ Verify error: "Invitation not found or already processed"

### 6.4 Invitation Expiry Validation
1. Manually expire an invitation (see Test Case 2.6)
2. Attempt to accept expired invitation
3. ✅ Verify error: "Invitation has expired"

---

## Notification Tests

### 7.1 Notification Delivery
1. Send invitation
2. ✅ Verify invited user receives notification
3. Accept invitation
4. ✅ Verify inviter receives acceptance notification
5. Reject invitation
6. ✅ Verify inviter receives rejection notification
7. Revoke invitation
8. ✅ Verify invitee receives revocation notification (if accepted)

### 7.2 Notification Bell
1. Check notification bell in header
2. ✅ Verify unread count is displayed
3. Click bell
4. ✅ Verify dropdown shows recent notifications
5. ✅ Verify can mark individual notifications as read
6. ✅ Verify can mark all as read

### 7.3 Notifications Page
1. Navigate to **Notifications** page
2. ✅ Verify list of all notifications
3. ✅ Verify filter by "All", "Unread", "Read"
4. ✅ Verify can mark individual as read
5. ✅ Verify can mark all as read
6. ✅ Verify can delete notifications

---

## Background Job Tests

### 8.1 Invitation Expiry Job
1. Check server logs for cron job startup message
2. ✅ Verify: "📅 Starting invitation expiry cron job (runs daily at 2 AM)..."
3. ✅ Verify: "🔍 Checking for expired invitations on startup..."
4. Create pending invitation with past expiry date
5. Wait for cron job to run (or manually trigger)
6. ✅ Verify expired invitations are marked as 'expired'
7. ✅ Verify notifications are created for expired invitations

**Manual Trigger** (for testing):
```sql
-- Manually expire an invitation
UPDATE external_person_user_connections 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE status = 'pending';

-- Then check logs or run job manually
```

---

## API Endpoint Tests

### Comprehensive API testing checklist:

#### Invitations API
- ✅ `POST /api/invitations` - Send invitation
- ✅ `GET /api/invitations` - Get all invitations (pending/accepted)
- ✅ `POST /api/invitations/:id/accept` - Accept invitation
- ✅ `POST /api/invitations/:id/reject` - Reject invitation
- ✅ `DELETE /api/invitations/:id` - Revoke invitation (inviter only)
- ✅ `POST /api/invitations/:id/disconnect` - Disconnect (either party)

#### User Notifications API
- ✅ `GET /api/user/notifications` - Get notifications
- ✅ `PUT /api/user/notifications/:id/read` - Mark as read
- ✅ `PUT /api/user/notifications/read-all` - Mark all as read
- ✅ `GET /api/user/notifications/unread-count` - Get unread count
- ✅ `DELETE /api/user/notifications/:id` - Delete notification

#### Linked Data API
- ✅ `GET /api/linked-data/connections` - Get accepted connections
- ✅ `GET /api/linked-data/:connectionId/expenses` - Get linked expenses
- ✅ `GET /api/linked-data/:connectionId/income` - Get linked income
- ✅ `GET /api/linked-data/:connectionId/assets` - Get linked assets
- ✅ `GET /api/linked-data/:connectionId/summary` - Get summary

#### External Persons API
- ✅ `GET /api/external-persons` - Get all (with invitation status)
- ✅ `POST /api/external-persons` - Create (with email validation)
- ✅ `PUT /api/external-persons/:id` - Update (with email uniqueness check)
- ✅ `DELETE /api/external-persons/:id` - Delete
- ✅ `GET /api/external-persons/:id/invite-status` - Get invitation status

---

## Database Integrity Tests

### 9.1 Foreign Key Constraints
```sql
-- Verify foreign keys
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN (
  'external_persons',
  'external_person_user_connections',
  'user_notifications',
  'expense_external_person_links'
)
AND tc.constraint_type = 'FOREIGN KEY';
```

### 9.2 Index Verification
```sql
-- Verify indexes exist for performance
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'external_persons',
  'external_person_user_connections',
  'user_notifications'
)
ORDER BY tablename, indexname;
```

### 9.3 Data Consistency
```sql
-- Check for orphaned connections
SELECT epu.* 
FROM external_person_user_connections epu
LEFT JOIN external_persons ep ON epu.external_person_id = ep.id
WHERE ep.id IS NULL;

-- Should return 0 rows

-- Check for orphaned notifications
SELECT un.*
FROM user_notifications un
LEFT JOIN users u ON un.user_id = u.id
WHERE u.id IS NULL;

-- Should return 0 rows
```

---

## Performance Tests

### 10.1 Query Performance
- ✅ Verify invitation queries are fast (< 100ms)
- ✅ Verify notification queries are paginated
- ✅ Verify linked data queries use proper indexes

### 10.2 Load Testing (Optional)
- Test with 100+ external persons
- Test with 100+ connections
- Test with 1000+ notifications
- Verify no performance degradation

---

## Summary Checklist

### Core Functionality
- [ ] Email matching works correctly
- [ ] Invitations can be sent, accepted, rejected, revoked
- [ ] Disconnect works for both parties
- [ ] Invitations expire after 5 days
- [ ] Background job expires old invitations

### Data Sharing
- [ ] Shared expenses appear in "Shared with Me" filter
- [ ] Shared data is read-only
- [ ] Shared data shows "Shared from" indicator
- [ ] Cannot edit/delete shared data

### Security
- [ ] Email uniqueness enforced
- [ ] Self-invitation prevented
- [ ] Household isolation enforced
- [ ] Connection ownership verified
- [ ] Expired invitations cannot be accepted

### Notifications
- [ ] Notifications delivered correctly
- [ ] Notification bell shows unread count
- [ ] Can mark notifications as read
- [ ] Can delete notifications

### UI/UX
- [ ] All translations work correctly
- [ ] Invite button appears/disappears correctly
- [ ] Status indicators show correctly
- [ ] Filters work correctly
- [ ] Read-only indicators visible

---

## Known Issues / Edge Cases to Test

1. **Email Normalization**: Verify emails are stored in lowercase
2. **Multiple Connections**: Can external person have multiple connections?
3. **Deleted External Person**: What happens to connections when external person is deleted?
4. **Deleted User**: What happens to connections when user is deleted?
5. **Changed Email**: What happens if external person email is changed?
6. **Changed User Email**: What happens if user email is changed?

---

## Test Environment Setup

### Required Test Data

1. **Household A**:
   - User A (admin@test.com)
   - User B (member@test.com)
   - External Person: friend@test.com

2. **Household B**:
   - User C (user@test.com)
   - External Person: colleague@test.com

3. **Registered Users**:
   - friend@test.com (matches external person)
   - colleague@test.com (matches external person)

### Database Cleanup (After Testing)
```sql
-- Cleanup test data (BE CAREFUL!)
DELETE FROM user_notifications WHERE notification_type LIKE 'test%';
DELETE FROM external_person_user_connections WHERE external_person_id IN (
  SELECT id FROM external_persons WHERE email LIKE '%@test.com'
);
DELETE FROM external_persons WHERE email LIKE '%@test.com';
DELETE FROM users WHERE email LIKE '%@test.com';
```

---

## Report Template

After completing tests, document results:

```markdown
# External Users Linking System - Test Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Development/Staging/Production]

## Test Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

## Detailed Results
[Document each test case with pass/fail status and notes]

## Issues Found
[Document any bugs or issues]

## Recommendations
[Suggestions for improvement]
```

---

**Last Updated**: 2024-01-XX
**Version**: 1.0.0

