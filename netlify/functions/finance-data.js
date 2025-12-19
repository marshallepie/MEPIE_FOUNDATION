const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
};

/**
 * Fetch incoming funds data
 */
async function fetchIncomingFunds() {
  try {
    const { data, error } = await supabase
      .from('incoming_funds')
      .select('*')
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (error) throw error;

    // Calculate total
    const total = data.reduce((sum, record) => sum + parseFloat(record.net_income || 0), 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        summary: {
          total: parseFloat(total.toFixed(2)),
          count: data.length
        }
      })
    };
  } catch (error) {
    console.error('Error fetching incoming funds:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch incoming funds data'
      })
    };
  }
}

/**
 * Fetch outgoing funds data
 */
async function fetchOutgoingFunds() {
  try {
    const { data, error } = await supabase
      .from('outgoing_funds')
      .select('*')
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (error) throw error;

    // Calculate total
    const total = data.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        summary: {
          total: parseFloat(total.toFixed(2)),
          count: data.length
        }
      })
    };
  } catch (error) {
    console.error('Error fetching outgoing funds:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch outgoing funds data'
      })
    };
  }
}

/**
 * Fetch financial summary
 */
async function fetchSummary() {
  try {
    const { data, error } = await supabase
      .from('financial_summary')
      .select('*')
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalNetIncome: parseFloat(data.total_net_income || 0),
        totalOutgoing: parseFloat(data.total_outgoing || 0),
        currentBalance: parseFloat(data.current_balance || 0)
      })
    };
  } catch (error) {
    console.error('Error fetching summary:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch financial summary'
      })
    };
  }
}

/**
 * Fetch all data (incoming + outgoing + summary)
 */
async function fetchAllData() {
  try {
    // Fetch incoming funds
    const { data: incomingData, error: incomingError } = await supabase
      .from('incoming_funds')
      .select('*')
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (incomingError) throw incomingError;

    // Fetch outgoing funds
    const { data: outgoingData, error: outgoingError } = await supabase
      .from('outgoing_funds')
      .select('*')
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (outgoingError) throw outgoingError;

    // Fetch summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('financial_summary')
      .select('*')
      .single();

    if (summaryError) throw summaryError;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        incoming: {
          data: incomingData,
          total: incomingData.reduce((sum, r) => sum + parseFloat(r.net_income || 0), 0).toFixed(2)
        },
        outgoing: {
          data: outgoingData,
          total: outgoingData.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toFixed(2)
        },
        summary: {
          totalNetIncome: parseFloat(summaryData.total_net_income || 0),
          totalOutgoing: parseFloat(summaryData.total_outgoing || 0),
          currentBalance: parseFloat(summaryData.current_balance || 0)
        }
      })
    };
  } catch (error) {
    console.error('Error fetching all data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch financial data'
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

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed. Use GET to fetch data.'
      })
    };
  }

  // Parse query parameters
  const params = event.queryStringParameters || {};
  const type = params.type || 'all';

  // Route based on type parameter
  switch (type.toLowerCase()) {
    case 'incoming':
      return fetchIncomingFunds();

    case 'outgoing':
      return fetchOutgoingFunds();

    case 'summary':
      return fetchSummary();

    case 'all':
      return fetchAllData();

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid type parameter. Supported types: incoming, outgoing, summary, all'
        })
      };
  }
};
