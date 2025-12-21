// API Configuration
const API_BASE = '/.netlify/functions';

/**
 * Make an API request to a Netlify function
 * @param {string} endpoint - The function name (without .netlify/functions/)
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - The response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}
