# Financial Transparency System

## Overview

The financial transparency page provides a complete, editable spreadsheet system for tracking all incoming and outgoing funds for the MEPIE Foundation. Data is stored in a Supabase (PostgreSQL) database with full audit trail tracking.

## Architecture

### Frontend
- **Framework**: Vanilla JavaScript with jspreadsheet-ce
- **Hosting**: Netlify (static site)
- **Styling**: Embedded CSS in HTML

### Backend
- **Database**: Supabase (PostgreSQL)
- **API**: Netlify Functions (serverless)
- **Authentication**: Session-based with password + user selection

### Data Flow
1. User authenticates via password + name selection
2. Session token stored in browser localStorage
3. All data operations go through Netlify Functions
4. Functions validate session and interact with Supabase
5. Audit trail automatically tracks all changes via database triggers

## Features

### Two Separate Sheets
- **Incoming Funds**: Track donations and income
- **Outgoing Funds**: Track expenses and disbursements

### User Authentication
- Password protection for editing
- User identification (Marshall Epie, Aruna Ramineni, Fitz Shrowder)
- 8-hour session expiration
- Automatic session validation on page load

### Cross-Device Data Persistence
- Data accessible from any device/browser
- Automatic synchronization via database
- No manual export/import needed for device switching

### Full Audit Trail
- Every change tracked with timestamp
- User attribution for all modifications
- Old and new values stored in JSONB format
- Queryable audit history

### Data Validation
- Server-side validation for all fields
- Dropdown constraints enforced at database level
- Amount validation (positive numbers only)
- Date format validation

### Export Functionality
- Export data to CSV files
- Export to PDF for reports

### Real-Time Calculations
- Total Net Income (with GoFundMe 3.31% fee deduction)
- Total Outgoing
- Current Balance (auto-calculated)

## Spreadsheet Columns

### Incoming Funds (7 columns)
1. **Date**: Calendar picker (DD-MM-YYYY format)
2. **Amount (£)**: Numeric field with currency formatting
3. **Source**: Dropdown (GoFundMe, Stripe, Bank Transfer, Check, Cash, Other)
4. **Donor Initials**: Text field
5. **Net Income (£)**: Auto-calculated (amount × 0.9669 for GoFundMe, otherwise full amount)
6. **Purpose/Note**: Text field for description
7. **Approved By**: Dropdown (Marshall Epie, Aruna Ramineni, Fitz Shrowder)

### Outgoing Funds (6 columns)
1. **Date**: Calendar picker (DD-MM-YYYY format)
2. **Amount (£)**: Numeric field with currency formatting
3. **Recipient**: Text field for recipient name
4. **Purpose**: Text field for expense description
5. **Category**: Dropdown (Education, Operations, Marketing, Infrastructure, Salaries, Other)
6. **Approved By**: Dropdown (Marshall Epie, Aruna Ramineni, Fitz Shrowder)

## How to Use

### Viewing Data (Public Access)
1. Navigate to `/financial-transparency.html`
2. View both Incoming and Outgoing funds by clicking the tabs
3. See real-time totals and balance
4. Export data to CSV or PDF

### Editing Data (Authorized Users Only)
1. Click the **"Enable Editing"** button
2. Select your name from the dropdown:
   - Marshall Epie
   - Aruna Ramineni
   - Fitz Shrowder
3. Enter the password: `mepie2024admin` (production password will be different)
4. Click **"Submit"**
5. Make your changes:
   - Click cells to edit
   - Use dropdowns for predefined fields
   - Use calendar picker for dates
   - Click **"Add Row"** to insert a new row with today's date
6. Click **"Save Changes"** to persist your edits to database
7. Click **"Logout"** when finished

### Importing Data from CSV
1. Enable editing mode (login required)
2. Switch to the appropriate tab (Incoming or Outgoing)
3. Click **"Import from CSV"** button
4. Select your CSV file
5. Data will be validated and imported
6. Click **"Save Changes"** to persist to database

### Exporting Data
- **CSV**: Click **"Export to CSV"** to download the current sheet
- **PDF**: Click **"Export to PDF"** to generate a printable report

## Setup Instructions

### Initial Setup (One-Time)
1. Follow the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) guide to:
   - Create Supabase project
   - Run database schema
   - Configure environment variables
2. Deploy to Netlify with environment variables configured
3. Test authentication and data loading

### Ongoing Configuration

#### Changing the Edit Password
1. Update in `.env` file (local):
   ```bash
   VITE_FINANCE_EDIT_PASSWORD=new_password_here
   ```
2. Update in Netlify environment variables (production)
3. Restart development server or redeploy site
4. Inform all authorized users of the new password

#### Adding/Removing Authorized Users
1. Open `database-schema.sql`
2. Find the CHECK constraints for `approved_by` field
3. Update the list of names:
   ```sql
   CHECK (approved_by IN ('Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder', 'New Person'))
   ```
4. Run the updated SQL in Supabase SQL Editor
5. Update the dropdown in `financial-transparency.html`:
   ```html
   <option value="New Person">New Person</option>
   ```
6. Update the `approvers` array in `financial-transparency.js`:
   ```javascript
   const approvers = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder', 'New Person'];
   ```
7. Redeploy the site

#### Adding New Sources or Categories
1. Update database CHECK constraints in Supabase SQL Editor
2. Update dropdown arrays in `financial-transparency.js`
3. Redeploy the site

## API Endpoints

### Authentication API (`/.netlify/functions/finance-auth`)
- **POST**: Login with userName + password → session token
- **POST**: Validate existing session token
- **POST**: Logout (invalidate session)

### Data API (`/.netlify/functions/finance-data`)
- **GET** `?type=incoming`: Fetch incoming funds
- **GET** `?type=outgoing`: Fetch outgoing funds
- **GET** `?type=summary`: Fetch financial summary
- **GET** `?type=all`: Fetch all data

### Mutation API (`/.netlify/functions/finance-mutate`)
- **POST** `action=create`: Create new record
- **POST** `action=update`: Update existing record
- **POST** `action=delete`: Soft delete record
- **POST** `action=batch`: Batch operations (CSV import)

### Audit API (`/.netlify/functions/finance-audit`)
- **GET** `?recordId=<uuid>`: Get audit history for specific record
- **GET** `?userName=<name>`: Get changes by user
- **GET** `/recent?limit=50`: Get recent changes

### Migration API (`/.netlify/functions/finance-migrate`)
- **POST**: One-time migration from localStorage to database

## Database Schema

### Tables
- **incoming_funds**: Incoming fund records
- **outgoing_funds**: Outgoing fund records
- **audit_trail**: Complete change history
- **auth_sessions**: Active user sessions

### Key Features
- Soft deletes (is_deleted flag)
- Auto-calculated net_income for GoFundMe fees
- Database triggers for automatic audit trail
- Row Level Security (RLS) policies
- Optimistic locking via updated_at timestamps

## Security

### Authentication
- Password + user name required for editing
- Session tokens expire after 8 hours
- Rate limiting on login attempts (5 per minute per IP)
- Server-side session validation

### Data Protection
- HTTPS enforced in production
- CORS restricted to production domain
- Service role key never exposed to client
- SQL injection prevention via parameterized queries
- Input validation on all fields

### Audit Trail
- All changes tracked automatically
- Cannot be disabled or bypassed
- Immutable audit records
- Includes old and new values

## Troubleshooting

### Common Issues

#### "Failed to fetch data"
**Cause**: API connection issue or Supabase configuration

**Solution**:
1. Check browser console for specific error
2. Verify Supabase environment variables in Netlify
3. Check Supabase project is running (not paused)
4. View Netlify Function logs for backend errors

#### "Invalid or expired session"
**Cause**: Session timeout or cleared localStorage

**Solution**:
1. Click "Logout" then "Enable Editing" to log in again
2. Session expires after 8 hours of inactivity
3. Clear browser localStorage if issues persist:
   ```javascript
   localStorage.clear();
   ```

#### "Save Changes" button doesn't work
**Cause**: Not authenticated or session expired

**Solution**:
1. Check if "Logged in as" banner is visible
2. Try logging out and back in
3. Check browser console for errors

#### Data not appearing after save
**Cause**: Backend error or validation failure

**Solution**:
1. Check browser console for error messages
2. Verify all required fields are filled
3. Check Netlify Function logs
4. Verify Supabase tables have data (Table Editor)

#### Calendar popup too large on mobile
**Cause**: CSS responsive styles

**Solution**:
- Already fixed with mobile-responsive CSS
- Calendar centers on screen with reduced size
- If issues persist, try rotating device to landscape

### Database Issues

#### Row Level Security Error
**Cause**: RLS policies not configured correctly

**Solution**:
1. Go to Supabase → Authentication → Policies
2. Verify policies exist for all tables
3. Re-run `database-schema.sql` if needed

#### Connection Timeout
**Cause**: Supabase free tier inactivity pause

**Solution**:
1. Go to Supabase Dashboard
2. Restore paused project
3. Wait 2-3 minutes for startup

## Data Backup

### Automated Backups
- Supabase automatically backs up database daily
- Free tier: 7 days retention
- Pro tier: Point-in-time recovery

### Manual Backups
1. Export to CSV via the UI regularly
2. Store CSV files securely (encrypted storage)
3. Keep minimum 30 days of backups
4. Test restore procedure periodically

### Backup Restoration
1. Use CSV import functionality
2. Or use Supabase SQL Editor to insert bulk data
3. Verify audit trail after restoration

## Monitoring

### Health Checks
- Check financial transparency page loads: `/financial-transparency.html`
- Verify authentication works
- Test data fetching and saving
- Review audit trail for unusual activity

### Performance Metrics
- Page load time: < 2 seconds
- API response time: < 1 second
- Database query time: < 500ms

### Logs to Monitor
- **Netlify Function Logs**: Check for API errors
- **Supabase Logs**: Check for database errors
- **Browser Console**: Check for client-side errors
- **Audit Trail**: Review for suspicious changes

## Support

### For Technical Issues
1. Check this README for troubleshooting steps
2. Review [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for setup issues
3. Check browser console (F12 → Console)
4. Check Netlify Function logs
5. Check Supabase logs

### For Access Issues
- Password reset: Update environment variables
- User access: Contact administrator to be added to approvers list

### For Data Issues
- Check audit trail for change history
- Export CSV for offline analysis
- Contact Supabase support for database issues

## File Structure

```
MEPIE_FOUNDATION/
├── financial-transparency.html          # Main page
├── src/
│   └── js/
│       ├── financial-transparency.js    # API-integrated version
│       └── financial-transparency-localStorage-backup.js  # Old localStorage version
├── netlify/
│   └── functions/
│       ├── finance-auth.js              # Authentication API
│       ├── finance-data.js              # Data fetching API
│       ├── finance-mutate.js            # Data mutation API
│       ├── finance-audit.js             # Audit trail API (future)
│       └── finance-migrate.js           # Migration API
├── database-schema.sql                  # Complete database schema
├── FINANCIAL_TRANSPARENCY_README.md     # This file
├── SUPABASE_SETUP.md                    # Supabase setup guide
├── .env                                 # Local environment variables (git-ignored)
└── .env.example                         # Example environment variables

```

## Version History

### v2.0.0 (Current) - Supabase Integration
- Multi-device data persistence
- Full audit trail with user attribution
- Session-based authentication
- Server-side validation
- Cross-device synchronization
- Improved security

### v1.0.0 - localStorage Version
- Single-device data persistence
- Client-side only
- CSV import/export
- Basic password protection

## Future Enhancements

### Planned Features
- Real-time collaboration (see other users' cursors)
- Email notifications for large transactions
- Advanced filtering and search
- Data visualization dashboards
- Bulk edit operations
- Rollback functionality
- Advanced audit trail viewer UI

### Performance Optimizations
- Pagination for large datasets
- Virtual scrolling for thousands of rows
- Caching strategies
- Optimistic updates with rollback

## License

This system is proprietary to the MEPIE Foundation. All rights reserved.

## Contact

For questions or support regarding the financial transparency system, contact the MEPIE Foundation technical team.
