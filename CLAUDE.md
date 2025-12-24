# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Development (runs Netlify Dev with functions support)
npm run dev                  # Start at http://localhost:8888 (proxies to Vite at :5173)

# Development (Vite only, no functions)
npm run dev:vite            # Start at http://localhost:5173 (no Netlify functions)

# Build
npm run build               # Build to dist/ directory

# Preview production build
npm run preview             # Preview at http://localhost:4173

# Code formatting
npm run format              # Format HTML, CSS, JS with Prettier

# Performance testing
npm run lighthouse          # Run Lighthouse audit (requires preview server running)
```

**Important:** Use `npm run dev` (not `npm run dev:vite`) when working on financial transparency features, as they require Netlify Functions to be running.

## Architecture Overview

### Technology Stack
- **Frontend**: Vanilla JavaScript (no framework) with Vite 5.0 build tool
- **Backend**: Netlify Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Netlify
- **Payment Processing**: Stripe
- **Spreadsheet UI**: jspreadsheet-ce

### Multi-Page Static Site Structure
This is a multi-page static site where each HTML file is an entry point defined in `vite.config.js`. The build tool compiles all pages and their dependencies into the `dist/` directory.

**HTML Pages** (root level):
- `index.html` - Home page
- `about.html` - About the foundation
- `projects.html` - Current projects
- `governance.html` - Governance structure
- `governing-document.html` - Legal documents
- `financial-transparency.html` - Live financial spreadsheet (requires authentication)
- `deleted-records.html` - Soft-deleted financial records (admin only)
- `donate.html` - Stripe donation form
- `donate-success.html` - Post-donation confirmation
- `contact.html` - Contact form
- `policies.html` - Policies page

**CSS Architecture** (`src/css/`):
- `base/` - CSS variables, reset, typography
- `components/` - Buttons, cards, forms, header, footer, navigation
- `layouts/` - Containers, grid systems
- `main.css` - Main stylesheet that imports all modules

**JavaScript Modules** (`src/js/`):
- `main.js` - Base functionality for all pages
- `donate.js` - Stripe payment integration
- `financial-transparency.js` - Financial spreadsheet with Supabase backend
- `financial-transparency-localStorage-backup.js` - Legacy localStorage version (backup)
- `api.js` - Shared API request utility for Netlify Functions
- `components/` - Reusable UI components
- `utils/` - Helper utilities

### Netlify Functions (Backend API)

All backend logic is in serverless functions at `netlify/functions/`:

**Financial Transparency System:**
- `finance-auth.js` - Session-based authentication (login, logout, validate session)
- `finance-data.js` - Data fetching (incoming funds, outgoing funds, summaries)
- `finance-mutate.js` - Data mutations (create, update, soft delete, batch operations)
- `finance-hard-delete.js` - Permanent deletion of soft-deleted records (admin only)
- `finance-migrate.js` - One-time migration from localStorage to Supabase

**Payment Processing:**
- `create-checkout-session.js` - Stripe Checkout session creation

**Key Implementation Details:**
- Functions use `@supabase/supabase-js` client with service role key
- All responses include CORS headers configured for `SITE_URL` environment variable
- Rate limiting implemented in-memory for login attempts (5 per minute)
- Session tokens stored in Supabase `auth_sessions` table with 8-hour expiration
- All mutations validate against database CHECK constraints

### Financial Transparency System

The financial transparency page (`financial-transparency.html`) is the most complex feature:

**Architecture Pattern:**
- Frontend: jspreadsheet-ce for spreadsheet UI
- Backend: Netlify Functions as API layer
- Database: Supabase with Row Level Security (RLS) policies
- Authentication: Session-based with password + user selection

**Data Flow:**
1. User authenticates via `finance-auth` function → receives session token
2. Session token stored in `localStorage` (key: `financeSession`)
3. All API calls include session token in request headers
4. Functions validate session before database operations
5. Database triggers automatically create audit trail entries
6. UI updates reflect database state

**Two Separate Spreadsheets:**
- **Incoming Funds** - 7 columns: Date, Amount, Source (dropdown), Donor Initials, Net Income (auto-calculated), Purpose/Note, Approved By (dropdown)
- **Outgoing Funds** - 6 columns: Date, Amount, Recipient, Purpose, Category (dropdown), Approved By (dropdown)

**Key Features:**
- Soft deletes (records marked as `is_deleted = true`, moved to `deleted-records.html`)
- Hard deletes (permanent removal via admin page)
- Audit trail (all changes tracked in `audit_trail` table with old/new values)
- Auto-calculation of Net Income (GoFundMe deducts 3.31% fee = multiply by 0.9669)
- Real-time balance calculation displayed in UI
- CSV import/export functionality
- PDF export for reports

**Database Schema** (`database-schema.sql`):
- Tables: `incoming_funds`, `outgoing_funds`, `audit_trail`, `auth_sessions`
- Computed column: `net_income` auto-calculated based on source
- CHECK constraints enforce dropdown values and positive amounts
- Triggers: `update_updated_at_column`, `audit_trail_trigger` for automatic tracking
- Indexes on date, source, category for performance

### Stripe Donation Integration

Donation flow (`donate.html` + `donate.js` + `create-checkout-session.js`):
1. User fills out donation form (amount, email, name, message)
2. Frontend calls `create-checkout-session` Netlify function
3. Function creates Stripe Checkout session with metadata
4. User redirected to Stripe-hosted checkout page
5. After payment, user redirected back to `donate-success.html`
6. Stripe webhook posts payment confirmation (if configured)

**Environment Variables Required:**
- `VITE_STRIPE_PUBLISHABLE_KEY` - Frontend Stripe key
- `STRIPE_SECRET_KEY` - Backend Stripe key (Netlify function only)

### Authentication System

**Financial Transparency Authentication:**
- Password stored in `VITE_FINANCE_EDIT_PASSWORD` environment variable
- Valid users hardcoded: "Marshall Epie", "Aruna Ramineni", "Fitz Shrowder"
- Sessions expire after 8 hours
- Rate limiting: 5 login attempts per minute per IP
- Admin buttons (hard delete) hidden from unauthenticated users via CSS class

**To modify authorized users:**
1. Update `VALID_USERS` array in `netlify/functions/finance-auth.js`
2. Update CHECK constraints in `database-schema.sql` for `approved_by` field
3. Update dropdown options in `financial-transparency.html`
4. Update `approvers` array in `src/js/financial-transparency.js`
5. Redeploy to Netlify

## Environment Variables

Required in `.env` for local development and in Netlify UI for production:

**Stripe (Payment Processing):**
- `VITE_STRIPE_PUBLISHABLE_KEY` - Public key for client-side Stripe.js
- `STRIPE_SECRET_KEY` - Secret key for server-side API calls

**Supabase (Database):**
- `VITE_SUPABASE_URL` - Supabase project URL (client-side)
- `SUPABASE_URL` - Supabase project URL (server-side)
- `VITE_SUPABASE_ANON_KEY` - Anonymous key (client-side, read-only)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only, full access)

**Financial System:**
- `VITE_FINANCE_EDIT_PASSWORD` - Password for financial spreadsheet editing

**General:**
- `SITE_URL` - Site URL for CORS configuration (e.g., `http://localhost:8888` or `https://mepie-foundation.org`)

Copy `.env.example` to `.env` and fill in values. Never commit `.env` to git.

## Common Development Tasks

### Adding a New HTML Page
1. Create HTML file in root directory (e.g., `new-page.html`)
2. Add entry to `vite.config.js` rollupOptions.input:
   ```javascript
   newPage: resolve(__dirname, 'new-page.html')
   ```
3. Import CSS and JS as needed in the HTML file:
   ```html
   <link rel="stylesheet" href="/src/css/main.css">
   <script type="module" src="/src/js/main.js"></script>
   ```
4. Test with `npm run dev`
5. Build and verify output in `dist/`

### Modifying Financial Spreadsheet Columns
Changing columns requires updates in multiple places:

1. **Database schema** (`database-schema.sql`):
   - Add column to table definition
   - Add CHECK constraint if dropdown
   - Add index if needed for performance
   - Run SQL in Supabase SQL Editor

2. **Frontend** (`financial-transparency.html` or `src/js/financial-transparency.js`):
   - Update `columns` array in jspreadsheet config
   - Add to `sources` or `categories` dropdown arrays if applicable

3. **Backend validation** (e.g., `netlify/functions/finance-mutate.js`):
   - Update validation logic in `validateIncomingData()` or `validateOutgoingData()`

4. **Test thoroughly**: Create, update, delete operations with new column

### Working with Supabase Database
- Access Supabase Dashboard: https://app.supabase.com
- Run SQL queries in "SQL Editor" tab
- View/edit data in "Table Editor" tab
- Monitor logs in "Logs" section
- Full schema in `database-schema.sql` file
- Setup guide in `SUPABASE_SETUP.md`

### Testing Netlify Functions Locally
```bash
npm run dev  # Starts Netlify Dev server with functions
```
Functions available at: `http://localhost:8888/.netlify/functions/<function-name>`

Example test with curl:
```bash
# Test finance-data function
curl http://localhost:8888/.netlify/functions/finance-data?type=incoming

# Test finance-auth function
curl -X POST http://localhost:8888/.netlify/functions/finance-auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","userName":"Marshall Epie","password":"your_password"}'
```

### Debugging Financial Transparency Issues
1. **Check browser console** (F12 → Console) for JavaScript errors
2. **Check Netlify Function logs**: Netlify Dashboard → Functions → Logs
3. **Check Supabase logs**: Supabase Dashboard → Logs → API / Database
4. **Verify session**: Check `localStorage.financeSession` in browser DevTools
5. **Test API directly**: Use curl or Postman to test Netlify Functions
6. **Check database state**: Use Supabase Table Editor to view actual data
7. **Review audit trail**: Query `audit_trail` table for change history

### Handling Soft-Deleted Records
- Soft-deleted records have `is_deleted = true` flag
- Visible only on `deleted-records.html` page (requires authentication)
- Can be permanently deleted via hard delete function (admin only)
- Queries filter out soft-deleted by default: `WHERE is_deleted = FALSE`

## Code Style and Patterns

### API Requests
Always use the shared `apiRequest()` utility from `src/js/api.js`:

```javascript
import { apiRequest } from './api.js';

const data = await apiRequest('finance-data', {
  method: 'GET',
  headers: { 'X-Session-Token': sessionToken }
});
```

### Session Management Pattern
```javascript
// Get session from localStorage
const session = JSON.parse(localStorage.getItem('financeSession'));

// Validate session before operations
if (!session || !session.token) {
  // Redirect to login
}

// Include token in API calls
headers: { 'X-Session-Token': session.token }
```

### Netlify Function Response Format
All functions should return consistent format:
```javascript
return {
  statusCode: 200,
  headers: headers,
  body: JSON.stringify({ success: true, data: result })
};

// Or for errors:
return {
  statusCode: 400,
  headers: headers,
  body: JSON.stringify({ success: false, error: 'Error message' })
};
```

### Date Formatting
Use `DD-MM-YYYY` format for display (UK standard):
```javascript
const formattedDate = new Date().toLocaleDateString('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).replace(/\//g, '-');
```

### Currency Formatting
Use GBP (£) with 2 decimal places:
```javascript
const formatted = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
}).format(amount);
```

## Design System

### Colors (CSS Variables)
- `--primary-color: #1a5490` - Deep blue (trust, professionalism)
- `--secondary-color: #f39c12` - Warm orange (optimism, action)
- `--success-color: #27ae60` - Green (transparency, growth)
- `--danger-color: #e74c3c` - Red (errors, warnings)

### Spacing System
8px grid system via CSS variables:
- `--space-1: 0.5rem` (8px)
- `--space-2: 1rem` (16px)
- `--space-3: 1.5rem` (24px)
- `--space-4: 2rem` (32px)
- ... up to `--space-8: 4rem` (64px)

### Typography
- **Headings**: Poppins font family
- **Body**: Inter font family
- Responsive font sizing with `clamp()` in `src/css/base/typography.css`

## Deployment

### Automatic Deployment
- Push to `main` branch triggers automatic Netlify build
- Build command: `npm run build`
- Publish directory: `dist/`
- Environment variables must be set in Netlify UI

### Manual Deployment
```bash
npm run build
netlify deploy --prod
```

### Pre-Deployment Checklist
- [ ] Test locally with `npm run dev`
- [ ] Run `npm run build` successfully
- [ ] Verify all environment variables set in Netlify
- [ ] Test financial transparency authentication
- [ ] Test Stripe donation flow (use test mode keys)
- [ ] Check Supabase connection and queries
- [ ] Verify no console errors in browser
- [ ] Test responsive design on mobile

## Key Documentation Files

- `README.md` - General project overview
- `FINANCIAL_TRANSPARENCY_README.md` - Complete financial system documentation
- `SUPABASE_SETUP.md` - Database setup and configuration guide
- `STRIPE_SETUP.md` - Payment integration setup guide
- `database-schema.sql` - Complete PostgreSQL schema with triggers and RLS policies
- `.env.example` - Template for environment variables

## Troubleshooting

### "Failed to fetch data" Error
- Verify Supabase environment variables in Netlify
- Check Supabase project is not paused (free tier auto-pauses after inactivity)
- Review Netlify Function logs for specific error

### Netlify Function Timeout
- Free tier limit: 10 seconds per function invocation
- Optimize database queries (check indexes)
- Consider pagination for large datasets

### CORS Errors
- Verify `SITE_URL` environment variable matches actual domain
- Check CORS headers in Netlify Function responses
- Ensure `Access-Control-Allow-Origin` includes your domain

### Session Expired Issues
- Sessions expire after 8 hours
- Check `auth_sessions` table in Supabase for active sessions
- Verify session token matches between localStorage and database
- Clear localStorage and re-login if corrupted

## Security Considerations

- Never commit `.env` file (already in `.gitignore`)
- Never expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Only use `VITE_*` prefixed variables in frontend code
- Use parameterized queries in Netlify Functions (SQL injection prevention)
- Validate all user input on backend before database operations
- Rate limit authentication attempts (already implemented)
- Use HTTPS in production (Netlify provides automatic SSL)
- Review audit trail regularly for suspicious activity
