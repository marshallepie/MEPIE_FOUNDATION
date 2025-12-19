# Supabase Setup Guide for Financial Transparency

This guide walks you through setting up Supabase for the MEPIE Foundation financial transparency system.

## Prerequisites

- A Supabase account (free tier available at [supabase.com](https://supabase.com))
- Access to the MEPIE Foundation codebase
- Netlify account for deploying functions

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Select or create an organization
   - **Name**: `MEPIE Foundation Financial`
   - **Database Password**: Generate a strong password (save this securely!)
   - **Region**: Choose closest to your users (e.g., `eu-west-1` for UK/Europe)
   - **Pricing Plan**: Free tier is sufficient to start
4. Click **"Create new project"**
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Run Database Schema

1. Once your project is ready, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open `/database-schema.sql` from the MEPIE Foundation repository
4. Copy the entire contents
5. Paste into the Supabase SQL Editor
6. Click **"Run"** (or press `Ctrl/Cmd + Enter`)
7. You should see: `Success. No rows returned`
8. Verify tables were created:
   - Click **"Table Editor"** in left sidebar
   - You should see: `incoming_funds`, `outgoing_funds`, `audit_trail`, `auth_sessions`

## Step 3: Get API Credentials

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"** under **Project Settings**
3. You'll see two important sections:

### Project URL
- Copy the **URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
- This is your `SUPABASE_URL` and `VITE_SUPABASE_URL`

### API Keys
- **anon / public key**:
  - This key is safe for client-side use
  - Copy this for `VITE_SUPABASE_ANON_KEY`
- **service_role / secret key**:
  - ⚠️ **NEVER expose this key in client-side code**
  - Only use in Netlify Functions (server-side)
  - Copy this for `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Update Environment Variables

### Local Development (.env file)

1. Open `/Users/marshallepie/Desktop/MEPIE_FOUNDATION/.env`
2. Replace the placeholders with your actual Supabase credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

3. Also ensure `SITE_URL` is set correctly:
```bash
# For local development
SITE_URL=http://localhost:3000

# For production (update after deployment)
SITE_URL=https://storied-pika-7c404d.netlify.app
```

### Netlify Production Environment

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your MEPIE Foundation site
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a variable"**
5. Add each variable (click **"Add"** after each one):

   ```
   Key: SUPABASE_URL
   Value: https://YOUR_PROJECT_ID.supabase.co
   ```

   ```
   Key: VITE_SUPABASE_URL
   Value: https://YOUR_PROJECT_ID.supabase.co
   ```

   ```
   Key: VITE_SUPABASE_ANON_KEY
   Value: your_actual_anon_key_here
   ```

   ```
   Key: SUPABASE_SERVICE_ROLE_KEY
   Value: your_actual_service_role_key_here
   ```

   ```
   Key: SITE_URL
   Value: https://storied-pika-7c404d.netlify.app
   ```

6. **Important**: Trigger a new deployment after adding environment variables:
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Clear cache and deploy site"**

## Step 5: Test the Setup

### Test Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/financial-transparency.html`

3. Test authentication:
   - Click **"Enable Editing"**
   - Select your name from dropdown
   - Enter password: `mepie2024admin` (or your configured password)
   - Click **"Submit"**
   - You should see: "Edit mode enabled"

4. Test data loading:
   - The page should load without errors
   - Initially, spreadsheets will be empty (no data yet)

### Test on Production

1. After Netlify deployment completes, visit:
   ```
   https://storied-pika-7c404d.netlify.app/financial-transparency.html
   ```

2. Repeat the same authentication test

3. Check browser console for any errors (F12 → Console tab)

## Step 6: Migrate Existing Data (Optional)

If you have existing data in localStorage that needs to be migrated:

### Export Current Data

1. Open the financial transparency page in your browser
2. Open browser console (F12)
3. Run:
   ```javascript
   const incoming = localStorage.getItem('mepie_incoming_funds');
   const outgoing = localStorage.getItem('mepie_outgoing_funds');
   console.log('Incoming:', incoming);
   console.log('Outgoing:', outgoing);
   ```

4. Copy the output and save to a file for backup

### Run Migration

The migration function is available but requires custom implementation based on your data format. Contact the development team for assistance with data migration.

## Step 7: Verify Database

1. Go back to Supabase Dashboard
2. Click **"Table Editor"**
3. Click **"incoming_funds"** table
4. Try to manually insert a test record:
   - Click **"Insert row"**
   - Fill in required fields:
     - `date`: Today's date (YYYY-MM-DD format)
     - `amount`: 100.00
     - `source`: GoFundMe
     - `donor_initials`: TE
     - `approved_by`: Marshall Epie
     - `created_by`: Marshall Epie
     - `updated_by`: Marshall Epie
   - Click **"Save"**

5. Refresh the financial transparency page
6. You should see the test record appear!

7. Try editing the record through the UI:
   - Enable editing mode
   - Change a value
   - Click "Save Changes"
   - Check Supabase Table Editor to see if it updated

8. Check audit trail:
   - Go to **"audit_trail"** table in Supabase
   - You should see entries for CREATE and UPDATE actions

## Troubleshooting

### "Failed to fetch data" error

**Cause**: API credentials not configured correctly

**Solution**:
1. Verify environment variables in `.env` (local) or Netlify (production)
2. Check that `SUPABASE_URL` matches your project URL exactly
3. Ensure keys don't have extra spaces or quotes
4. Redeploy Netlify site after changing environment variables

### "Invalid or expired session" error

**Cause**: Session token issue or time synchronization

**Solution**:
1. Clear browser localStorage:
   ```javascript
   localStorage.clear();
   ```
2. Refresh the page
3. Try logging in again

### "Row Level Security" error

**Cause**: RLS policies not applied correctly

**Solution**:
1. Go to Supabase → **Authentication** → **Policies**
2. Verify policies exist for all tables
3. Re-run the database schema SQL if policies are missing

### Database connection timeout

**Cause**: Supabase project paused (free tier inactivity)

**Solution**:
1. Free tier projects pause after 7 days of inactivity
2. Go to Supabase Dashboard → **Settings** → **General**
3. Click **"Restore project"**
4. Wait 2-3 minutes for project to resume

### CORS errors in browser console

**Cause**: CORS configuration mismatch

**Solution**:
1. Verify `SITE_URL` in Netlify environment variables
2. Ensure it matches your actual site URL (no trailing slash)
3. Check Netlify Function logs for CORS-related errors

## Security Best Practices

1. **Never commit `.env` file to git**
   - Already in `.gitignore`
   - Double-check before pushing

2. **Rotate keys if exposed**
   - Go to Supabase → **Settings** → **API**
   - Can reset `service_role` key if compromised

3. **Use different passwords per environment**
   - Use `mepie2024admin` for local development
   - Use a stronger password for production

4. **Regular backups**
   - Supabase automatically backs up database daily (free tier: 7 days retention)
   - For additional safety, export CSV regularly via the UI

5. **Monitor audit trail**
   - Periodically review `audit_trail` table
   - Look for unexpected changes or suspicious activity

## Maintenance

### Weekly Tasks
- [ ] Check Supabase project is running (free tier may pause)
- [ ] Review audit trail for any unusual activity
- [ ] Verify backups are current

### Monthly Tasks
- [ ] Export data to CSV for offline backup
- [ ] Review and clean up old session tokens
- [ ] Check database usage (free tier: 500MB limit)

### As Needed
- [ ] Update Approvers list if team changes (requires SQL update)
- [ ] Add new Sources or Categories (requires SQL update)

## Support

For issues or questions:
1. Check Supabase logs: Dashboard → **Logs**
2. Check Netlify Function logs: Netlify Dashboard → **Functions** → Select function → **Logs**
3. Review browser console errors (F12 → Console)
4. Consult [Supabase Documentation](https://supabase.com/docs)

## Success Checklist

- [ ] Supabase project created
- [ ] Database schema applied successfully
- [ ] All 4 tables visible in Table Editor
- [ ] API credentials copied and saved securely
- [ ] Local `.env` file updated
- [ ] Netlify environment variables configured
- [ ] Netlify site redeployed
- [ ] Local testing successful (authentication works)
- [ ] Production testing successful (can view page)
- [ ] Test record inserted and visible
- [ ] Audit trail captures changes

Once all items are checked, your Supabase setup is complete! 🎉
