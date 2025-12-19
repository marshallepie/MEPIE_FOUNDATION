const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Valid sources, categories, and approvers
const VALID_SOURCES = ['GoFundMe', 'Stripe', 'Bank Transfer', 'Check', 'Cash', 'Other'];
const VALID_CATEGORIES = ['Education', 'Operations', 'Marketing', 'Infrastructure', 'Salaries', 'Other'];
const VALID_APPROVERS = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder'];

/**
 * Validate session token
 */
async function validateSession(sessionToken) {
  if (!sessionToken) {
    return { valid: false, error: 'Session token is required' };
  }

  try {
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid or expired session' };
    }

    return { valid: true, userName: data.user_name };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Failed to validate session' };
  }
}

/**
 * Parse date from DD-MM-YYYY format to YYYY-MM-DD
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try DD-MM-YYYY format
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try ISO format
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse amount from string (remove currency symbols)
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;

  const cleaned = String(amountStr).replace(/[£$,\s]/g, '');
  const amount = parseFloat(cleaned);

  return isNaN(amount) ? 0 : amount;
}

/**
 * Validate and transform incoming funds row
 */
function validateIncomingRow(row, rowIndex) {
  const errors = [];

  // Row should have 7 columns: Date, Amount, Source, Donor Initials, Net Income, Purpose/Note, Approved By
  if (!row || row.length < 7) {
    return {
      valid: false,
      errors: [`Row ${rowIndex + 1}: Insufficient columns (expected 7)`]
    };
  }

  const [dateStr, amountStr, source, donorInitials, netIncome, purposeNote, approvedBy] = row;

  // Validate date
  const date = parseDate(dateStr);
  if (!date) {
    errors.push(`Row ${rowIndex + 1}: Invalid date format`);
  }

  // Validate amount
  const amount = parseAmount(amountStr);
  if (amount < 0) {
    errors.push(`Row ${rowIndex + 1}: Amount must be positive`);
  }

  // Validate source
  if (!source || !VALID_SOURCES.includes(source)) {
    errors.push(`Row ${rowIndex + 1}: Invalid source (must be one of: ${VALID_SOURCES.join(', ')})`);
  }

  // Validate approved_by
  if (!approvedBy || !VALID_APPROVERS.includes(approvedBy)) {
    errors.push(`Row ${rowIndex + 1}: Invalid approver (must be one of: ${VALID_APPROVERS.join(', ')})`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Return transformed record
  return {
    valid: true,
    record: {
      date,
      amount,
      source,
      donor_initials: donorInitials || null,
      purpose_note: purposeNote || null,
      approved_by: approvedBy
    }
  };
}

/**
 * Validate and transform outgoing funds row
 */
function validateOutgoingRow(row, rowIndex) {
  const errors = [];

  // Row should have 6 columns: Date, Amount, Recipient, Purpose, Category, Approved By
  if (!row || row.length < 6) {
    return {
      valid: false,
      errors: [`Row ${rowIndex + 1}: Insufficient columns (expected 6)`]
    };
  }

  const [dateStr, amountStr, recipient, purpose, category, approvedBy] = row;

  // Validate date
  const date = parseDate(dateStr);
  if (!date) {
    errors.push(`Row ${rowIndex + 1}: Invalid date format`);
  }

  // Validate amount
  const amount = parseAmount(amountStr);
  if (amount < 0) {
    errors.push(`Row ${rowIndex + 1}: Amount must be positive`);
  }

  // Validate recipient
  if (!recipient) {
    errors.push(`Row ${rowIndex + 1}: Recipient is required`);
  }

  // Validate purpose
  if (!purpose) {
    errors.push(`Row ${rowIndex + 1}: Purpose is required`);
  }

  // Validate category
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.push(`Row ${rowIndex + 1}: Invalid category (must be one of: ${VALID_CATEGORIES.join(', ')})`);
  }

  // Validate approved_by
  if (!approvedBy || !VALID_APPROVERS.includes(approvedBy)) {
    errors.push(`Row ${rowIndex + 1}: Invalid approver (must be one of: ${VALID_APPROVERS.join(', ')})`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Return transformed record
  return {
    valid: true,
    record: {
      date,
      amount,
      recipient,
      purpose,
      category,
      approved_by: approvedBy
    }
  };
}

/**
 * Main migration handler
 */
exports.handler = async (event) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid JSON body'
      })
    };
  }

  const { sessionToken, incomingData, outgoingData } = body;

  // Validate session
  const sessionResult = await validateSession(sessionToken);
  if (!sessionResult.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: sessionResult.error
      })
    };
  }

  const userName = sessionResult.userName;

  // Validate input data
  if (!Array.isArray(incomingData) && !Array.isArray(outgoingData)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'At least one of incomingData or outgoingData must be provided as an array'
      })
    };
  }

  const results = {
    incomingProcessed: 0,
    outgoingProcessed: 0,
    errors: []
  };

  try {
    // Migrate incoming funds
    if (Array.isArray(incomingData) && incomingData.length > 0) {
      console.log(`Migrating ${incomingData.length} incoming records...`);

      for (let i = 0; i < incomingData.length; i++) {
        const row = incomingData[i];

        // Skip empty rows
        if (!row || row.every(cell => !cell)) {
          continue;
        }

        const validation = validateIncomingRow(row, i);

        if (!validation.valid) {
          results.errors.push(...validation.errors);
          continue;
        }

        // Insert record
        const record = {
          ...validation.record,
          created_by: userName,
          updated_by: userName
        };

        try {
          const { error } = await supabase
            .from('incoming_funds')
            .insert(record);

          if (error) throw error;

          results.incomingProcessed++;
        } catch (error) {
          results.errors.push(`Row ${i + 1} (incoming): ${error.message}`);
        }
      }
    }

    // Migrate outgoing funds
    if (Array.isArray(outgoingData) && outgoingData.length > 0) {
      console.log(`Migrating ${outgoingData.length} outgoing records...`);

      for (let i = 0; i < outgoingData.length; i++) {
        const row = outgoingData[i];

        // Skip empty rows
        if (!row || row.every(cell => !cell)) {
          continue;
        }

        const validation = validateOutgoingRow(row, i);

        if (!validation.valid) {
          results.errors.push(...validation.errors);
          continue;
        }

        // Insert record
        const record = {
          ...validation.record,
          created_by: userName,
          updated_by: userName
        };

        try {
          const { error } = await supabase
            .from('outgoing_funds')
            .insert(record);

          if (error) throw error;

          results.outgoingProcessed++;
        } catch (error) {
          results.errors.push(`Row ${i + 1} (outgoing): ${error.message}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        incomingProcessed: results.incomingProcessed,
        outgoingProcessed: results.outgoingProcessed,
        errors: results.errors,
        message: `Migration completed. Processed ${results.incomingProcessed} incoming and ${results.outgoingProcessed} outgoing records.`
      })
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Migration failed',
        details: error.message,
        partialResults: results
      })
    };
  }
};
