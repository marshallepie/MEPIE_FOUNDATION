const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

/**
 * Validate session token
 */
async function validateSession(sessionToken) {
  if (!sessionToken) {
    return { valid: false, error: 'No session token provided' };
  }

  try {
    const { data: session, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return { valid: false, error: 'Invalid or expired session' };
    }

    return { valid: true, userName: session.user_name };
  } catch (error) {
    return { valid: false, error: 'Session validation failed' };
  }
}

/**
 * Permanently delete a record (hard delete)
 * WARNING: This is irreversible!
 */
async function hardDelete(body, userName) {
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

    console.log('HARD DELETE attempt:', { tableName, id, userName });

    // First, get the record to verify it's soft-deleted
    const { data: record, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching record:', fetchError);
      throw fetchError;
    }

    if (!record) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Record not found'
        })
      };
    }

    // Safety check: only allow hard delete of soft-deleted records
    if (!record.is_deleted) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Can only hard delete records that are already soft-deleted. Soft delete it first.'
        })
      };
    }

    console.log('Record to be permanently deleted:', record);

    // Perform hard delete
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Hard delete error:', deleteError);
      throw deleteError;
    }

    console.log('Successfully HARD DELETED record:', id);

    // Log in audit trail
    await supabase.from('audit_trail').insert({
      table_name: tableName,
      record_id: id,
      action: 'DELETE',
      changed_by: userName,
      old_values: record,
      new_values: null
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Record permanently deleted',
        deletedRecord: record
      })
    };
  } catch (error) {
    console.error('Error in hard delete:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to permanently delete record',
        details: error.message
      })
    };
  }
}

/**
 * Get all soft-deleted records
 */
async function getDeletedRecords(body) {
  const { type } = body;

  if (!type) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'type is required'
      })
    };
  }

  try {
    const tableName = type === 'incoming' ? 'incoming_funds' : 'outgoing_funds';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    };
  } catch (error) {
    console.error('Error fetching deleted records:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch deleted records'
      })
    };
  }
}

/**
 * Restore a soft-deleted record
 */
async function restoreRecord(body, userName) {
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

    const { data, error } = await supabase
      .from(tableName)
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        updated_by: userName
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Record not found'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Record restored',
        record: data[0]
      })
    };
  } catch (error) {
    console.error('Error restoring record:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to restore record'
      })
    };
  }
}

/**
 * Main handler
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

  // Only allow POST and DELETE
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid JSON'
      })
    };
  }

  // Validate session for all operations
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
  const action = body.action;

  switch (action) {
    case 'list':
      return getDeletedRecords(body);

    case 'restore':
      return restoreRecord(body, userName);

    case 'hard-delete':
      return hardDelete(body, userName);

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid action. Supported: list, restore, hard-delete'
        })
      };
  }
};
