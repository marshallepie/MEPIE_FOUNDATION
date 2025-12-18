# Financial Transparency Spreadsheet

## Overview

The financial transparency page provides a complete, editable spreadsheet system for tracking all incoming and outgoing funds for the MEPIE Foundation.

## Features

- **Two Separate Sheets**:
  - Incoming Funds: Track donations and income
  - Outgoing Funds: Track expenses and disbursements

- **Password Protection**: Editing is protected by a password stored in environment variables

- **Data Persistence**: All data is saved to browser localStorage automatically

- **Export Functionality**: Export data to CSV files for external use

- **Dropdown Selectors**: Pre-defined options for consistency:
  - Sources: GoFundMe, Stripe, Bank Transfer, Check, Cash, Other
  - Categories: Education, Operations, Marketing, Infrastructure, Salaries, Other
  - Approvers: Marshall Epie, Aruna Ramineni, Fitz Schroeder

## Spreadsheet Columns

### Incoming Funds
1. **Date**: Calendar picker for transaction date
2. **Amount ($)**: Numeric field with currency formatting
3. **Source**: Dropdown menu for income source
4. **Purpose/Note**: Text field for description
5. **Approved By**: Dropdown menu for approver name

### Outgoing Funds
1. **Date**: Calendar picker for transaction date
2. **Amount ($)**: Numeric field with currency formatting
3. **Recipient**: Text field for recipient name
4. **Purpose**: Text field for expense description
5. **Category**: Dropdown menu for expense category
6. **Approved By**: Dropdown menu for approver name

## How to Use

### Viewing Data (Anyone)
1. Navigate to `/financial-transparency.html`
2. View both Incoming and Outgoing funds by clicking the tabs
3. Export data to CSV using the "Export to CSV" button

### Editing Data (Authorized Users Only)
1. Click the "Enable Editing" button
2. Enter the password when prompted (stored in `VITE_FINANCE_EDIT_PASSWORD`)
3. Make your changes:
   - Click cells to edit
   - Use dropdowns for predefined fields
   - Use calendar picker for dates
   - Click "Add Row" to insert a new row with today's date
4. Click "Save Changes" to persist your edits to localStorage

### Exporting Data
- Click "Export to CSV" to download the current sheet as a CSV file
- The filename will be either `incoming_funds.csv` or `outgoing_funds.csv` depending on which tab is active

## Configuration

### Setting the Edit Password

The edit password is stored as an environment variable:

1. Open `.env` file
2. Find or add: `VITE_FINANCE_EDIT_PASSWORD=your_password_here`
3. Change the password as needed
4. Restart the development server or rebuild for production

**Current Password** (as set in .env): `mepie2024admin`

### Customizing Dropdown Options

To modify the dropdown options, edit `/src/js/financial-transparency.js`:

**Approvers** (line ~12):
```javascript
const approvers = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Schroeder'];
```

**Income Sources** (line ~61):
```javascript
source: ['GoFundMe', 'Stripe', 'Bank Transfer', 'Check', 'Cash', 'Other']
```

**Expense Categories** (line ~114):
```javascript
source: ['Education', 'Operations', 'Marketing', 'Infrastructure', 'Salaries', 'Other']
```

## Data Storage

### Browser localStorage
- Data is stored in the user's browser using localStorage
- Storage keys:
  - `mepie_incoming_funds`: Incoming funds data
  - `mepie_outgoing_funds`: Outgoing funds data

### Important Notes on localStorage
- **Device-specific**: Data is stored locally on each device/browser
- **Not synced**: Changes on one device won't appear on another
- **Can be cleared**: Users clearing browser data will lose unsaved information
- **Backup recommended**: Regularly export to CSV for backup

### Future Enhancement Considerations
For a production environment with multiple users, consider:
- Backend API with database storage (PostgreSQL, MySQL, etc.)
- User authentication and role-based access
- Real-time syncing across devices
- Audit trail for all changes
- Automatic backups

## Technical Details

### Dependencies
- **jspreadsheet-ce**: Community Edition spreadsheet library
- **jsuites**: Required companion library for jspreadsheet

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Requires localStorage support

### Files
- `/financial-transparency.html`: Main HTML page
- `/src/js/financial-transparency.js`: JavaScript logic
- `/.env`: Environment variables (including password)

## Troubleshooting

### Password Not Working
- Check `.env` file for correct password
- Restart development server after changing `.env`
- For production, rebuild the project

### Data Not Saving
- Check browser console for errors
- Ensure localStorage is not disabled
- Try exporting to CSV as backup before troubleshooting

### Spreadsheet Not Loading
- Check browser console for JavaScript errors
- Ensure npm packages are installed: `npm install`
- Verify jspreadsheet-ce is in node_modules

## Security Considerations

### Current Implementation (Client-Side)
- Password is visible in source code (after build)
- Anyone with browser dev tools can bypass client-side checks
- Suitable for trusted teams or low-security needs

### For Production Use
Consider implementing:
- Server-side authentication
- Encrypted password storage
- HTTPS for all connections
- Regular security audits
- Rate limiting on edit attempts

## Support

For issues or questions:
- Check browser console for error messages
- Verify all dependencies are installed
- Ensure .env file is properly configured
- Contact site administrator for password access
