# External Users Linking System Implementation Plan

## Overview

Create a system that allows external persons (added to expenses/income) to be linked with registered user accounts via email matching. When an external person's email matches a registered user, household members can send invitations. Invited users can accept and view (read-only) linked expenses, income, and assets where they are specifically mentioned. The system includes invitation management, user-facing notifications, expiry handling, and filtering capabilities.

## Phase 1: Database Schema

### 1.1 Add Email to External Persons

**New Migration**: `src/database/migrations/0000000000014_add_email_to_external_persons.ts`

- Add `email` column to `external_persons` table (string, nullable, unique within household)
- Add unique constraint: `UNIQUE(household_id, email)` where email IS NOT NULL
- Add index on `email` for quick lookups
- Validation: email format, lowercase normalization

### 1.2 Create External Person-User Connections Table

**New Migration**: `src/database/migrations/0000000000015_create_external_person_connections.ts`

Create `external_person_user_connections` table:

- `id` (primary key)
- `external_person_id` (FK to external_persons, CASCADE delete)
- `invited_user_id` (FK to users, CASCADE delete) - The registered user being invited
- `invited_by_user_id` (FK to users, CASCADE delete) - Who sent the invitation
- `status` (enum: 'pending', 'accepted', 'rejected', 'revoked', 'expired')
- `invited_at` (timestamp)
- `responded_at` (timestamp, nullable)
- `expires_at` (timestamp) - 5 days from invitation
- `created_at`, `updated_at` (timestamps)

Constraints:

- Unique: `(external_person_id, invited_user_id)` to prevent duplicate invitations
- Check: `status` must be valid enum value
- Indexes: `external_person_id`, `invited_user_id`, `status`, `expires_at`

### 1.3 Create User Notifications Table

**New Migration**: `src/database/migrations/0000000000016_create_user_notifications.ts`

Create `user_notifications` table:

- `id` (primary key)
- `user_id` (FK to users, CASCADE delete) - Recipient
- `type` (string, 50) - 'invitation', 'invitation_accepted', 'invitation_revoked', etc.
- `title` (string, 255)
- `message` (text)
- `related_entity_type` (string, 50, nullable) - 'external_person_connection', etc.
- `related_entity_id` (integer, nullable) - ID of related entity
- `read` (boolean, default false)
- `created_at` (timestamp)

Indexes: `user_id`, `read`, `created_at`, `(user_id, read)`

**Future Email Infrastructure**:

- Add `email_sent` (boolean, default false)
- Add `email_sent_at` (timestamp, nullable)
- Add `email_queue_id` (string, nullable) for future email queue integration

### 1.4 Create Expense-External Person Links Table

**New Migration**: `src/database/migrations/0000000000017_create_expense_external_person_links.ts`

Create `expense_external_person_links` table (proper tracking instead of just metadata):

- `id` (primary key)
- `expense_id` (FK to expenses, CASCADE delete)
- `external_person_id` (FK to external_persons, CASCADE delete)
- `created_at` (timestamp)

Constraints:

- Unique: `(expense_id, external_person_id)`
- Indexes: `expense_id`, `external_person_id`

**Note**: This provides proper relational tracking. Existing expenses may have external_person_id in metadata, but new entries should use this table.

### 1.5 Create Income-External Person Links Table (Optional Future)

**New Migration**: `src/database/migrations/0000000000018_create_income_external_person_links.ts` (if income needs external person linking)

If income entries can link to external persons (similar to expenses), create similar table structure.

## Phase 2: Backend Services

### 2.1 Update External Persons Service

**File**: `src/routes/external-persons.ts`

**Enhanced POST `/api/external-persons`**:

- Add email validation (optional but must be valid format if provided)
- Normalize email to lowercase
- Check for duplicate email within household: `SELECT id FROM external_persons WHERE household_id = $1 AND email = $2 AND email IS NOT NULL`
- Return `can_invite: boolean` and `linked_user_id: number | null` if email matches a registered user

**Enhanced GET `/api/external-persons`**:

- Include `email`, `can_invite`, `linked_user_id`, `has_pending_invitation`, `invitation_status` in response
- Join with `users` table to check email matches
- Join with `external_person_user_connections` to get invitation status

**New GET `/api/external-persons/:id/invite-status`**:

- Return invitation status, connected user info, invitation expiry

### 2.2 Invitation Service

**New File**: `src/services/invitationService.ts`

Functions:

- `checkEmailMatchesUser(email: string): Promise<{ userId: number | null; userEmail: string | null }>`
- `canInvite(externalPersonId: number, userId: number): Promise<{ canInvite: boolean; reason?: string }>`
- `sendInvitation(externalPersonId: number, invitedByUserId: number): Promise<ExternalPersonConnection>`
- `acceptInvitation(connectionId: number, userId: number): Promise<void>`
- `rejectInvitation(connectionId: number, userId: number): Promise<void>`
- `revokeInvitation(connectionId: number, userId: number): Promise<void>`
- `getPendingInvitations(userId: number): Promise<ExternalPersonConnection[]>`
- `getAcceptedConnections(userId: number): Promise<ExternalPersonConnection[]>`
- `expireOldInvitations(): Promise<number>` - Called by cron job
- `validateExpiry(expiresAt: Date): boolean`

**Invitation Flow**:

1. Check if external person has email
2. Check if email matches a registered user
3. Check if invitation already exists (pending/accepted)
4. Check if external person still exists
5. Create connection with status 'pending', expires_at = now + 5 days
6. Create user notification for invited user
7. Return connection details

### 2.3 User Notification Service

**New File**: `src/services/userNotificationService.ts`

Functions:

- `createNotification(userId: number, type: string, title: string, message: string, relatedEntityType?: string, relatedEntityId?: number): Promise<UserNotification>`
- `getNotifications(userId: number, page: number, limit: number, readFilter?: boolean): Promise<{ notifications: UserNotification[]; total: number }>`
- `markAsRead(notificationId: number, userId: number): Promise<void>`
- `markAllAsRead(userId: number): Promise<void>`
- `getUnreadCount(userId: number): Promise<number>`
- `deleteNotification(notificationId: number, userId: number): Promise<void>`

**Notification Types**:

- `invitation_received`: "You have been invited to view linked financial data"
- `invitation_accepted`: "Your invitation was accepted"
- `invitation_revoked`: "Your invitation was revoked"
- `invitation_expired`: "Invitation expired"

### 2.4 Linked Data Service

**New File**: `src/services/linkedDataService.ts`

Functions to fetch data linked to external persons:

- `getLinkedExpenses(userId: number, connectionId: number): Promise<Expense[]>`
- `getLinkedIncome(userId: number, connectionId: number): Promise<Income[]>` (if income supports external persons)
- `getLinkedAssets(userId: number, connectionId: number): Promise<Asset[]>`
- `getLinkedDataSummary(userId: number, connectionId: number): Promise<LinkedDataSummary>`

**Query Logic**:

- For expenses: Join with `expense_external_person_links` or check `expenses.metadata->>'external_person_id'`
- For assets: Check `shared_ownership_distribution` where member belongs to invited user's household
- Return read-only flag in all responses

## Phase 3: Backend Routes

### 3.1 Invitation Routes

**New File**: `src/routes/invitations.ts`

Endpoints:

- `POST /api/invitations` - Send invitation
- Body: `{ external_person_id: number }`
- Validation: Show warning modal on frontend before calling
- Returns: Connection object with expiry date

- `GET /api/invitations` - Get invitations for current user (pending/accepted)
- Query params: `status` (optional: 'pending', 'accepted', 'all')
- Returns: List of connections with external person details

- `POST /api/invitations/:id/accept` - Accept invitation
- Updates status to 'accepted', sets `responded_at`
- Creates notification for inviter
- Returns: Updated connection

- `POST /api/invitations/:id/reject` - Reject invitation
- Updates status to 'rejected', sets `responded_at`
- Returns: Updated connection

- `DELETE /api/invitations/:id` - Revoke invitation (inviter only)
- Updates status to 'revoked'
- Creates notification for invitee
- Returns: Success message

- `POST /api/invitations/:id/disconnect` - Disconnect accepted invitation (either party)
- Updates status to 'revoked'
- Creates notification for other party
- Returns: Success message

### 3.2 User Notifications Routes

**New File**: `src/routes/user-notifications.ts`

Endpoints:

- `GET /api/user/notifications` - Get notifications for current user
- Query params: `page`, `limit`, `read` (boolean filter)
- Returns: `{ notifications: [], total: number, page: number, limit: number }`

- `PUT /api/user/notifications/:id/read` - Mark notification as read

- `PUT /api/user/notifications/read-all` - Mark all notifications as read
- Body: `{ notification_ids?: number[] }` (optional, if empty marks all)

- `GET /api/user/notifications/unread-count` - Get unread count
- Returns: `{ count: number }`

- `DELETE /api/user/notifications/:id` - Delete notification

### 3.3 Linked Data Routes

**New File**: `src/routes/linked-data.ts`

Endpoints:

- `GET /api/linked-data/connections` - Get all accepted connections for current user
- Returns: List of connections with external person and inviter details

- `GET /api/linked-data/:connectionId/expenses` - Get expenses linked to external person
- Query params: Standard expense filters (date range, category, etc.)
- Returns: Expenses with read-only flag

- `GET /api/linked-data/:connectionId/income` - Get income linked to external person (if applicable)
- Similar structure to expenses

- `GET /api/linked-data/:connectionId/assets` - Get assets with shared ownership
- Returns: Assets where external person is linked or user's household members have ownership

- `GET /api/linked-data/:connectionId/summary` - Get summary of all linked data
- Returns: Summary statistics for expenses, income, assets

### 3.4 Update Existing Routes

**File**: `src/routes/expenses.ts`

**Enhanced GET `/api/expenses`**:

- Add query param: `external_person_id` (filter expenses linked to external person)
- Add query param: `shared_with_me: boolean` (filter expenses shared with current user via connections)
- When `shared_with_me=true`: Join with `external_person_user_connections` and `expense_external_person_links`
- Return `is_shared: boolean` and `shared_from_user_id: number | null` in response
- Return `is_read_only: boolean` if shared

**File**: `src/routes/income.ts`

**Similar enhancements** (if income supports external person linking):

- Add `shared_with_me` filter
- Return read-only flag

**File**: `src/routes/assets.ts`

**Enhanced GET `/api/assets`**:

- Add query param: `shared_with_me: boolean`
- When `shared_with_me=true`: Check if current user has accepted connections and filter assets where:
- External person linked to asset, OR
- User's household members have shared ownership
- Return `is_shared: boolean`, `shared_from_user_id: number | null`, `is_read_only: boolean`

**File**: `src/routes/admin.ts`

**Enhanced POST `/api/admin/users`**:

- Enforce email uniqueness check (already exists but ensure it's bulletproof)
- After user creation, check if any external_persons have matching email
- Return `{ external_person_match: boolean, external_person_id: number | null }` in response
- Create user notification for all household members that an external person can now be invited

### 3.5 Register Routes

**File**: `src/server.ts`

Add:

- `app.use('/api/invitations', invitationRoutes);`
- `app.use('/api/user/notifications', userNotificationRoutes);`
- `app.use('/api/linked-data', linkedDataRoutes);`

## Phase 4: Frontend Components

### 4.1 User Notification Bell Component

**New File**: `client/src/components/UserNotificationBell.tsx`

Features:

- Similar to `AdminNotificationBell` but for regular users
- Shows unread count badge
- Dropdown with notification list
- Mark as read functionality
- Link to full notifications page
- Auto-refresh every 30 seconds
- Display in Layout header (for all authenticated users)

### 4.2 Notifications Page

**New File**: `client/src/pages/NotificationsPage.tsx`

Features:

- List all notifications with pagination
- Filter by read/unread status
- Mark all as read button
- Delete notification
- Click notification to navigate to related content (e.g., invitation details)
- Empty state messages
- Loading states

### 4.3 Invitation Management Component

**New File**: `client/src/components/InvitationManager.tsx`

Features:

- Display pending invitations received
- Accept/Reject buttons
- Display sent invitations (pending/accepted/revoked)
- Show expiry countdown
- Revoke/Disconnect buttons
- Warning modal before sending invitation
- Connection status display

### 4.4 External Person Invite Button

**Enhanced File**: `client/src/pages/ExternalPersonsPage.tsx`

Add:

- "Invite" button next to external persons with matching email
- "Disconnect" button for accepted connections
- Invitation status indicator (pending, accepted, expired)
- Warning modal before sending invitation:
- "All linked expenses, income, and assets where this person is mentioned will be view-only shared. Continue?"

### 4.5 Linked Data View

**New File**: `client/src/pages/LinkedDataPage.tsx`

Features:

- List all accepted connections
- For each connection, show:
- External person details
- Who invited them
- Linked expenses count
- Linked income count
- Linked assets count
- Summary statistics
- Filter by connection
- Navigate to filtered views on Expenses/Income/Assets pages

### 4.6 Update Existing Pages with Filters

**File**: `client/src/pages/ExpensesPage.tsx`

Add:

- "Shared with Me" filter toggle
- When enabled, show only expenses shared via accepted connections
- Display "Shared from [User Email]" badge
- Show read-only indicator
- Disable edit/delete buttons for shared items

**File**: `client/src/pages/IncomePage.tsx`

Similar enhancements (if income supports external person linking)

**File**: `client/src/pages/AssetsPage.tsx`

Add:

- "Shared with Me" filter toggle
- Show shared assets from connections
- Display shared ownership percentages
- Read-only indicator

### 4.7 Update Layout

**File**: `client/src/components/Layout.tsx`

Add:

- `UserNotificationBell` component in header (for all authenticated users)
- Navigation item for "Notifications" (if not in dropdown)
- Optional: Navigation item for "Linked Data" or integrate into Settings

## Phase 5: Background Jobs

### 5.1 Invitation Expiry Cron Job

**New File**: `src/jobs/expireInvitations.ts`

Function:

- Run daily (or hourly)
- Query `external_person_user_connections` where `status = 'pending'` and `expires_at < NOW()`
- Update status to 'expired'
- Create user notification for both inviter and invitee
- Log expired count

**Integration**: Add to server startup or use node-cron

## Phase 6: Translations

### 6.1 Add Translation Keys

**Files**:

- `client/src/locales/en/translation.json`
- `client/src/locales/de/translation.json`
- `client/src/locales/tr/translation.json`
- `src/database/seeds/02_translations.ts`

**Keys needed**:

- `externalPersons.email`, `externalPersons.emailRequired`, `externalPersons.invalidEmail`
- `externalPersons.canInvite`, `externalPersons.invite`, `externalPersons.disconnect`
- `externalPersons.invitationPending`, `externalPersons.invitationAccepted`, `externalPersons.invitationExpired`
- `invitations.title`, `invitations.sendInvitation`, `invitations.accept`, `invitations.reject`, `invitations.revoke`, `invitations.disconnect`
- `invitations.warningTitle`, `invitations.warningMessage`, `invitations.expiresIn`, `invitations.expired`
- `notifications.title`, `notifications.unread`, `notifications.markAllAsRead`, `notifications.noNotifications`
- `notifications.invitationReceived`, `notifications.invitationAccepted`, `notifications.invitationRevoked`
- `linkedData.title`, `linkedData.sharedWithMe`, `linkedData.sharedFrom`, `linkedData.readOnly`
- `linkedData.expenses`, `linkedData.income`, `linkedData.assets`, `linkedData.summary`
- `common.readOnly`, `common.sharedItem`, `common.filterByShared`

## Phase 7: Validation & Security

### 7.1 Email Uniqueness Validation

**File**: `src/routes/admin.ts`

**Enhanced POST `/api/admin/users`**:

- Before user creation, check: `SELECT id FROM users WHERE email = $1`
- If exists, return error (already implemented)
- After creation, check: `SELECT id, email FROM external_persons WHERE LOWER(email) = LOWER($1) AND email IS NOT NULL`
- If matches found, return in response for frontend to show invite option

### 7.2 External Person Email Validation

**File**: `src/routes/external-persons.ts`

- Validate email format if provided
- Check uniqueness within household: `SELECT id FROM external_persons WHERE household_id = $1 AND LOWER(email) = LOWER($2) AND email IS NOT NULL AND id != $3`
- Normalize to lowercase before storing

### 7.3 Invitation Security

- Verify inviter belongs to external person's household
- Verify invitee email matches external person email
- Prevent self-invitation (inviter cannot invite themselves)
- Verify connection belongs to user before accept/reject/revoke
- Verify user owns connection before revoke/disconnect

## Phase 8: Testing Considerations

### 8.1 Test Cases

1. **Email Matching**:

- Create external person with email
- Register user with same email
- Verify "Invite" button appears

2. **Invitation Flow**:

- Send invitation (verify warning modal)
- Accept invitation (verify notifications)
- Reject invitation
- Revoke invitation
- Expire invitation (wait 5 days or manually expire)

3. **Data Sharing**:

- Create expense linked to external person
- Accept invitation
- Verify expense appears in "Shared with Me" filter
- Verify expense is read-only

4. **Filtering**:

- Test "Shared with Me" filter on Expenses/Income/Assets
- Verify only linked data is shown
- Verify filtering by connection

5. **Email Uniqueness**:

- Attempt to create user with existing email (should fail)
- Attempt to create external person with duplicate email in household (should fail)

## Implementation Order

1. **Database Migrations** (Phase 1)

- Add email to external_persons
- Create connections table
- Create user_notifications table
- Create expense_external_person_links table

2. **Backend Services** (Phase 2)

- InvitationService
- UserNotificationService
- LinkedDataService

3. **Backend Routes** (Phase 3)

- Invitation routes
- User notification routes
- Linked data routes
- Update existing routes

4. **Frontend Components** (Phase 4)

- UserNotificationBell
- NotificationsPage
- InvitationManager
- Update ExternalPersonsPage
- LinkedDataPage
- Update existing pages with filters

5. **Translations** (Phase 6)

6. **Background Jobs** (Phase 5)

7. **Testing & Validation** (Phase 8)

## Key Files to Create

- `src/database/migrations/0000000000014_add_email_to_external_persons.ts`
- `src/database/migrations/0000000000015_create_external_person_connections.ts`
- `src/database/migrations/0000000000016_create_user_notifications.ts`
- `src/database/migrations/0000000000017_create_expense_external_person_links.ts`
- `src/services/invitationService.ts`
- `src/services/userNotificationService.ts`
- `src/services/linkedDataService.ts`
- `src/routes/invitations.ts`
- `src/routes/user-notifications.ts`
- `src/routes/linked-data.ts`
- `src/jobs/expireInvitations.ts`
- `client/src/components/UserNotificationBell.tsx`
- `client/src/pages/NotificationsPage.tsx`
- `client/src/components/InvitationManager.tsx`
- `client/src/pages/LinkedDataPage.tsx`

## Key Files to Modify

- `src/routes/external-persons.ts` - Add email field, invitation status
- `src/routes/admin.ts` - Enhance email uniqueness validation
- `src/routes/expenses.ts` - Add shared_with_me filter
- `src/routes/assets.ts` - Add shared_with_me filter
- `client/src/pages/ExternalPersonsPage.tsx` - Add invite/disconnect buttons
- `client/src/pages/ExpensesPage.tsx` - Add shared filter, read-only display
- `client/src/pages/AssetsPage.tsx` - Add shared filter, read-only display
- `client/src/components/Layout.tsx` - Add UserNotificationBell
- All locale files - Add translations

## Critical Considerations

1. **Email Normalization**: Always store emails in lowercase for consistent matching
2. **Invitation Expiry**: Check expiry on every invitation access, auto-expire via cron
3. **Read-Only Enforcement**: Backend must enforce read-only for shared data (return 403 on edit/delete attempts)
4. **Data Privacy**: Users only see data where they are specifically mentioned, nothing more
5. **Connection Status**: Properly handle all states (pending, accepted, rejected, revoked, expired)
6. **Notification Timing**: Create notifications immediately for important events
7. **Filter Performance**: Ensure queries are optimized with proper indexes
8. **Cascading Deletes**: When external person deleted, connections and notifications should be handled appropriately