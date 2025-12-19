const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Password from environment
const EDIT_PASSWORD = process.env.VITE_FINANCE_EDIT_PASSWORD || 'mepie2024admin';

// Valid user names
const VALID_USERS = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder'];

// Session duration: 8 hours
const SESSION_DURATION_HOURS = 8;

// Rate limiting (in-memory, resets on function cold start)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000; // 1 minute

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

/**
 * Generate a cryptographically secure session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check rate limiting for login attempts
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];

  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(time => now - time < ATTEMPT_WINDOW_MS);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false; // Rate limit exceeded
  }

  // Add current attempt
  recentAttempts.push(now);
  loginAttempts.set(identifier, recentAttempts);

  return true; // Within rate limit
}

/**
 * Clean up expired sessions periodically
 */
async function cleanupExpiredSessions() {
  try {
    const { error } = await supabase
      .from('auth_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}

/**
 * Handle login request
 */
async function handleLogin(body, clientIp, userAgent) {
  const { userName, password } = body;

  // Validate required fields
  if (!userName || !password) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'userName and password are required'
      })
    };
  }

  // Validate user name
  if (!VALID_USERS.includes(userName)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid user name'
      })
    };
  }

  // Check rate limiting
  const rateLimitKey = clientIp || 'unknown';
  if (!checkRateLimit(rateLimitKey)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Too many login attempts. Please try again later.'
      })
    };
  }

  // Verify password
  if (password !== EDIT_PASSWORD) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid password'
      })
    };
  }

  // Generate session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  // Store session in database
  try {
    const { data, error } = await supabase
      .from('auth_sessions')
      .insert({
        session_token: sessionToken,
        user_name: userName,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIp || null,
        user_agent: userAgent || null
      })
      .select()
      .single();

    if (error) throw error;

    // Clean up old sessions (async, don't wait)
    cleanupExpiredSessions().catch(console.error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionToken: sessionToken,
        userName: userName,
        expiresAt: expiresAt.toISOString()
      })
    };
  } catch (error) {
    console.error('Database error during login:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create session'
      })
    };
  }
}

/**
 * Handle session validation request
 */
async function handleValidate(body) {
  const { sessionToken } = body;

  if (!sessionToken) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        valid: false,
        error: 'sessionToken is required'
      })
    };
  }

  try {
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Session not found or expired'
        })
      };
    }

    // Update last activity
    await supabase
      .from('auth_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        userName: data.user_name,
        expiresAt: data.expires_at
      })
    };
  } catch (error) {
    console.error('Database error during validation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        valid: false,
        error: 'Failed to validate session'
      })
    };
  }
}

/**
 * Handle logout request
 */
async function handleLogout(body) {
  const { sessionToken } = body;

  if (!sessionToken) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'sessionToken is required'
      })
    };
  }

  try {
    const { error } = await supabase
      .from('auth_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true
      })
    };
  } catch (error) {
    console.error('Database error during logout:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to logout'
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

  // Extract client info
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'];
  const userAgent = event.headers['user-agent'];

  // Determine action based on request
  const action = body.action || (body.userName && body.password ? 'login' : 'validate');

  switch (action) {
    case 'login':
      return handleLogin(body, clientIp, userAgent);

    case 'validate':
      return handleValidate(body);

    case 'logout':
      return handleLogout(body);

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid action. Supported actions: login, validate, logout'
        })
      };
  }
};
