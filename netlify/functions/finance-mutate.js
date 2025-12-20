const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Valid sources and categories
const VALID_SOURCES = ['GoFundMe', 'Stripe', 'Bank Transfer', 'Check', 'Cash', 'Other'];
const VALID_CATEGORIES = ['Education', 'Operations', 'Marketing', 'Infrastructure', 'Salaries', 'Other'];
const VALID_APPROVERS = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder'];

/**
 * Validate session and get user name
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

    // Update last activity
    await supabase
      .from('auth_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken);

    return { valid: true, userName: data.user_name };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Failed to validate session' };
  }
}

/**
 * Validate incoming funds record data
 */
function validateIncomingFunds(data) {
  const errors = [];

  if (!data.date) errors.push('date is required');
  if (data.amount === undefined || data.amount === null) errors.push('amount is required');
  if (isNaN(data.amount) || data.amount < 0) errors.push('amount must be a positive number');
  if (!data.source) errors.push('source is required');
  if (!VALID_SOURCES.includes(data.source)) errors.push(`source must be one of: ${VALID_SOURCES.join(', ')}`);
  if (!data.approved_by) errors.push('approved_by is required');
  if (!VALID_APPROVERS.includes(data.approved_by)) errors.push(`approved_by must be one of: ${VALID_APPROVERS.join(', ')}`);

  return errors;
}

/**
 * Validate outgoing funds record data
 */
function validateOutgoingFunds(data) {
  const errors = [];

  if (!data.date) errors.push('date is required');
  if (data.amount === undefined || data.amount === null) errors.push('amount is required');
  if (isNaN(data.amount) || data.amount < 0) errors.push('amount must be a positive number');
  if (!data.recipient) errors.push('recipient is required');
  if (!data.purpose) errors.push('purpose is required');
  if (!data.category) errors.push('category is required');
  if (!VALID_CATEGORIES.includes(data.category)) errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  if (!data.approved_by) errors.push('approved_by is required');
  if (!VALID_APPROVERS.includes(data.approved_by)) errors.push(`approved_by must be one of: ${VALID_APPROVERS.join(', ')}`);

  return errors;
}

/**
 * Handle create operation
 */
async function handleCreate(body, userName) {
  const { type, data } = body;

  if (!type || !data) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'type and data are required'
      })
    };
  }

  // Validate data
  const errors = type === 'incoming'
    ? validateIncomingFunds(data)
    : validateOutgoingFunds(data);

  if (errors.length > 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        errors: errors
      })
    };
  }

  // Prepare record
  const record = {
    ...data,
    created_by: userName,
    updated_by: userName
  };

  try {
    const tableName = type === 'incoming' ? 'incoming_funds' : 'outgoing_funds';
    const { data: createdRecord, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        id: createdRecord.id,
        record: createdRecord
      })
    };
  } catch (error) {
    console.error('Error creating record:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create record',
        details: error.message
      })
    };
  }
}

/**
 * Handle update operation
 */
async function handleUpdate(body, userName) {
  const { type, id, data, expectedUpdatedAt } = body;

  if (!type || !id || !data) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'type, id, and data are required'
      })
    };
  }

  // Validate data
  const errors = type === 'incoming'
    ? validateIncomingFunds(data)
    : validateOutgoingFunds(data);

  if (errors.length > 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        errors: errors
      })
    };
  }

  try {
    const tableName = type === 'incoming' ? 'incoming_funds' : 'outgoing_funds';

    // Check for optimistic locking conflict if expectedUpdatedAt is provided
    if (expectedUpdatedAt) {
      const { data: currentRecord, error: fetchError } = await supabase
        .from(tableName)
        .select('updated_at')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentUpdatedAt = new Date(currentRecord.updated_at).toISOString();
      const expectedDate = new Date(expectedUpdatedAt).toISOString();

      if (currentUpdatedAt !== expectedDate) {
        // Concurrent edit detected
        const { data: latestRecord } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'CONFLICT',
            message: 'Record was modified by another user',
            currentData: latestRecord
          })
        };
      }
    }

    // Prepare update
    const updateData = {
      ...data,
      updated_by: userName
    };

    const { data: updatedRecord, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        record: updatedRecord
      })
    };
  } catch (error) {
    console.error('Error updating record:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update record',
        details: error.message
      })
    };
  }
}

/**
 * Handle delete operation (soft delete)
 */
async function handleDelete(body, userName) {
  const { type, id } = body;

  if (!type || !id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'type and id are required'
      })
    };
  }

  try {
    const tableName = type === 'incoming' ? 'incoming_funds' : 'outgoing_funds';

    console.log('Attempting to soft delete:', { tableName, id, userName });

    const { data, error } = await supabase
      .from(tableName)
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userName
      })
      .eq('id', id)
      .select();

    console.log('Delete result:', { data, error });

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No record found to delete with id:', id);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Record not found'
        })
      };
    }

    console.log('Successfully soft deleted record:', data[0]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        record: data[0]
      })
    };
  } catch (error) {
    console.error('Error deleting record:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to delete record',
        details: error.message
      })
    };
  }
}

/**
 * Handle batch operations (for CSV import)
 */
async function handleBatch(body, userName) {
  const { type, operations } = body;

  if (!type || !operations || !Array.isArray(operations)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'type and operations array are required'
      })
    };
  }

  const results = {
    processed: 0,
    errors: []
  };

  try {
    const tableName = type === 'incoming' ? 'incoming_funds' : 'outgoing_funds';

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      // Validate data
      const errors = type === 'incoming'
        ? validateIncomingFunds(operation)
        : validateOutgoingFunds(operation);

      if (errors.length > 0) {
        results.errors.push({
          index: i,
          errors: errors
        });
        continue;
      }

      // Prepare record
      const record = {
        ...operation,
        created_by: userName,
        updated_by: userName
      };

      try {
        await supabase
          .from(tableName)
          .insert(record);

        results.processed++;
      } catch (error) {
        results.errors.push({
          index: i,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        processed: results.processed,
        errors: results.errors
      })
    };
  } catch (error) {
    console.error('Error in batch operation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to process batch operation',
        details: error.message
      })
    };
  }
}

/**
 * Main handler function
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

  // Only allow POST, PUT, DELETE
  if (!['POST', 'PUT', 'DELETE'].includes(event.httpMethod)) {
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

  // Validate session
  const sessionResult = await validateSession(body.sessionToken);
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

  // Determine action based on HTTP method and action field
  const action = body.action || event.httpMethod.toLowerCase();

  switch (action) {
    case 'create':
    case 'post':
      return handleCreate(body, userName);

    case 'update':
    case 'put':
      return handleUpdate(body, userName);

    case 'delete':
      return handleDelete(body, userName);

    case 'batch':
      return handleBatch(body, userName);

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid action. Supported actions: create, update, delete, batch'
        })
      };
  }
};
