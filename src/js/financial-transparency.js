// ==================================================
// MEPIE Financial Transparency - API-Integrated Version
// ==================================================

// Configuration
const API_BASE = '/.netlify/functions';
const EDIT_PASSWORD = window.FINANCE_EDIT_PASSWORD || 'mepie2024admin';

// Session management
let sessionToken = localStorage.getItem('mepie_session_token');
let currentUserName = localStorage.getItem('mepie_current_user');
let sessionExpiresAt = localStorage.getItem('mepie_session_expires');

// Spreadsheet state
let incomingSheet = null;
let outgoingSheet = null;
let isEditMode = false;
let currentTab = 'incoming';

// Data tracking for dirty rows (unsaved changes)
const dirtyRows = {
  incoming: new Set(),
  outgoing: new Set()
};

// Valid options
const approvers = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder'];
const sources = ['GoFundMe', 'Stripe', 'Bank Transfer', 'Check', 'Cash', 'Other'];
const categories = ['Education', 'Operations', 'Marketing', 'Infrastructure', 'Salaries', 'Other'];

// ==================================================
// UI Helper Functions
// ==================================================

function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const messageEl = document.getElementById('loadingMessage');
  if (messageEl) messageEl.textContent = message;
  if (overlay) overlay.classList.add('active');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('active');
}

function updateStatusMessage(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
  }
}

function updateCurrentUserBanner() {
  const banner = document.getElementById('currentUserBanner');
  const userNameEl = document.getElementById('currentUserName');
  const sessionInfoEl = document.getElementById('sessionInfo');

  if (!banner || !userNameEl) return;

  if (isEditMode && currentUserName) {
    banner.style.display = 'flex';
    userNameEl.textContent = currentUserName;

    if (sessionExpiresAt) {
      const expiresDate = new Date(sessionExpiresAt);
      const now = new Date();
      const hoursLeft = Math.floor((expiresDate - now) / (1000 * 60 * 60));
      sessionInfoEl.textContent = `Session expires in ${hoursLeft} hours`;
    }
  } else {
    banner.style.display = 'none';
  }
}

// ==================================================
// API Functions
// ==================================================

async function apiRequest(endpoint, options = {}) {
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

async function authenticateUser(userName, password) {
  try {
    const result = await apiRequest('finance-auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        userName,
        password
      })
    });

    if (result.success) {
      sessionToken = result.sessionToken;
      currentUserName = result.userName;
      sessionExpiresAt = result.expiresAt;

      // Store in localStorage
      localStorage.setItem('mepie_session_token', sessionToken);
      localStorage.setItem('mepie_current_user', currentUserName);
      localStorage.setItem('mepie_session_expires', sessionExpiresAt);

      return { success: true };
    }

    return { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function validateSession() {
  if (!sessionToken) return { valid: false };

  try {
    const result = await apiRequest('finance-auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'validate',
        sessionToken
      })
    });

    if (result.valid) {
      currentUserName = result.userName;
      sessionExpiresAt = result.expiresAt;
      return { valid: true, userName: result.userName };
    }

    // Session invalid, clear stored data
    clearSession();
    return { valid: false };
  } catch (error) {
    clearSession();
    return { valid: false };
  }
}

async function logoutUser() {
  if (!sessionToken) return;

  try {
    await apiRequest('finance-auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'logout',
        sessionToken
      })
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearSession();
  }
}

function clearSession() {
  sessionToken = null;
  currentUserName = null;
  sessionExpiresAt = null;
  localStorage.removeItem('mepie_session_token');
  localStorage.removeItem('mepie_current_user');
  localStorage.removeItem('mepie_session_expires');
}

async function fetchFinancialData(type = 'all') {
  try {
    const result = await apiRequest(`finance-data?type=${type}`, {
      method: 'GET'
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch ${type} data: ${error.message}`);
  }
}

async function saveRecord(type, data, recordId = null) {
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }

  const action = recordId ? 'update' : 'create';
  const payload = {
    sessionToken,
    action,
    type,
    data,
    ...(recordId && { id: recordId })
  };

  try {
    const result = await apiRequest('finance-mutate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to save record: ${error.message}`);
  }
}

async function deleteRecord(type, recordId) {
  console.log('deleteRecord called with type:', type, 'recordId:', recordId);

  if (!sessionToken) {
    console.error('deleteRecord: No session token!');
    throw new Error('Not authenticated');
  }

  console.log('deleteRecord: Making API request...');

  try {
    const result = await apiRequest('finance-mutate', {
      method: 'POST',
      body: JSON.stringify({
        sessionToken,
        action: 'delete',
        type,
        id: recordId
      })
    });

    console.log('deleteRecord: API response:', result);
    return result;
  } catch (error) {
    console.error('deleteRecord: API error:', error);
    throw new Error(`Failed to delete record: ${error.message}`);
  }
}

// ==================================================
// Data Transformation Functions
// ==================================================

// Store record IDs separately to track which rows are in database
const recordIds = {
  incoming: new Map(), // row index -> database UUID
  outgoing: new Map()
};

function dbRecordToSheetRow(record, type, rowIndex) {
  // Store the database ID for this row
  if (type === 'incoming') {
    recordIds.incoming.set(rowIndex, record.id);
    console.log('Stored incoming record ID:', record.id, 'at row index:', rowIndex);
    return [
      record.date,
      record.amount,
      record.source,
      record.donor_initials || '',
      record.net_income,
      record.purpose_note || '',
      record.approved_by
    ];
  } else {
    recordIds.outgoing.set(rowIndex, record.id);
    console.log('Stored outgoing record ID:', record.id, 'at row index:', rowIndex);
    return [
      record.date,
      record.amount,
      record.recipient,
      record.purpose,
      record.category,
      record.approved_by
    ];
  }
}

function sheetRowToDbRecord(row, type) {
  if (type === 'incoming') {
    return {
      date: row[0],
      amount: parseFloat(String(row[1]).replace(/[£,\s]/g, '')) || 0,
      source: row[2],
      donor_initials: row[3] || null,
      purpose_note: row[5] || null,
      approved_by: row[6]
    };
  } else {
    return {
      date: row[0],
      amount: parseFloat(String(row[1]).replace(/[£,\s]/g, '')) || 0,
      recipient: row[2],
      purpose: row[3],
      category: row[4],
      approved_by: row[5]
    };
  }
}

// Helper function to calculate net income
function calculateNetIncome(amount, source) {
  const numAmount = parseFloat(amount) || 0;
  if (source === 'GoFundMe') {
    return (numAmount * 0.9669).toFixed(2); // Deduct 3.31%
  }
  return numAmount.toFixed(2);
}

// ==================================================
// Load Data from API
// ==================================================

async function loadIncomingData() {
  try {
    showLoading('Loading incoming funds...');
    const result = await fetchFinancialData('incoming');

    // Clear existing record IDs
    recordIds.incoming.clear();

    if (result.success && result.data) {
      const sheetData = result.data.map((record, index) => dbRecordToSheetRow(record, 'incoming', index));
      return sheetData;
    }

    return [];
  } catch (error) {
    console.error('Error loading incoming data:', error);
    updateStatusMessage(`Error: ${error.message}`, 'warning');
    return [];
  } finally {
    hideLoading();
  }
}

async function loadOutgoingData() {
  try {
    showLoading('Loading outgoing funds...');
    const result = await fetchFinancialData('outgoing');

    // Clear existing record IDs
    recordIds.outgoing.clear();

    if (result.success && result.data) {
      const sheetData = result.data.map((record, index) => dbRecordToSheetRow(record, 'outgoing', index));
      return sheetData;
    }

    return [];
  } catch (error) {
    console.error('Error loading outgoing data:', error);
    updateStatusMessage(`Error: ${error.message}`, 'warning');
    return [];
  } finally {
    hideLoading();
  }
}

// ==================================================
// Initialize Spreadsheets
// ==================================================

async function initIncomingSheet() {
  const data = await loadIncomingData();

  console.log('Initializing incoming sheet with data:', data);

  incomingSheet = jspreadsheet(document.getElementById('incomingSpreadsheet'), {
    worksheets: [{
      data: data,
      columns: [
        {
          title: 'Date',
          type: 'calendar',
          width: 120,
          options: {
            format: 'DD-MM-YYYY',
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            weekdays_short: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
          }
        },
        {
          title: 'Amount (£)',
          type: 'numeric',
          width: 120,
          mask: '£ #,##0.00',
        },
        {
          title: 'Source',
          type: 'dropdown',
          width: 150,
          source: sources
        },
        {
          title: 'Donor Initials',
          type: 'text',
          width: 120
        },
        {
          title: 'Net Income (£)',
          type: 'text',
          width: 130,
          readOnly: false
        },
        {
          title: 'Purpose/Note',
          type: 'text',
          width: 200
        },
        {
          title: 'Approved By',
          type: 'dropdown',
          width: 150,
          source: approvers
        }
      ],
      minDimensions: [7, 10],
      contextMenu: function(obj, x, y, e, items) {
        // Override the delete row functionality
        const deleteIndex = items.findIndex(item => item && item.title === 'Delete selected rows');
        if (deleteIndex !== -1) {
          const originalOnclick = items[deleteIndex].onclick;
          items[deleteIndex].onclick = function() {
            const selectedRows = obj.getSelectedRows(true); // Get selected row indices
            console.log('Custom delete triggered for incoming rows:', selectedRows);

            // Delete from database first
            selectedRows.forEach(rowIndex => {
              if (recordIds.incoming.has(rowIndex)) {
                const recordId = recordIds.incoming.get(rowIndex);
                console.log('Deleting incoming record:', recordId, 'at row:', rowIndex);

                deleteRecord('incoming', recordId)
                  .then(() => {
                    console.log('Successfully deleted incoming record:', recordId);
                    updateStatusMessage('Record deleted', 'success');
                  })
                  .catch(error => {
                    console.error('Failed to delete incoming record:', error);
                    updateStatusMessage(`Failed to delete record: ${error.message}`, 'error');
                  });
              }
            });

            // Then call the original delete to remove from UI
            if (originalOnclick) originalOnclick();

            // Update totals
            setTimeout(() => {
              updateTotalNetIncome();
              updateBalance();
            }, 100);
          };
        }
        return items;
      },
      onchange: function(instance, cell, col, row, value) {
        console.log('Cell changed:', { col, row, value });

        // Recalculate net income when amount or source changes
        // col is passed as a number
        if (col === 1 || col === 2) {
          const amount = instance.getValueFromCoords(1, row);
          const source = instance.getValueFromCoords(2, row);

          let cleanAmount = amount;
          if (cleanAmount) {
            cleanAmount = String(cleanAmount).replace(/[£,\s]/g, '');
          }

          const netIncome = calculateNetIncome(cleanAmount, source);
          instance.setValueFromCoords(4, row, netIncome, true);

          console.log('Updated net income:', { row, amount: cleanAmount, source, netIncome });
        }

        updateTotalNetIncome();
        updateBalance();
      },
      oninsertrow: function(instance) {
        setTimeout(() => {
          updateTotalNetIncome();
          updateBalance();
        }, 100);
      }
    }],
    editable: false
  });

  // Calculate net income for all existing rows
  if (incomingSheet && incomingSheet[0]) {
    const instance = incomingSheet[0];
    const rowCount = instance.getConfig().data.length;

    for (let row = 0; row < rowCount; row++) {
      const amount = instance.getValueFromCoords(1, row);
      const source = instance.getValueFromCoords(2, row);

      if (amount && source) {
        let cleanAmount = String(amount).replace(/[£,\s]/g, '');
        const netIncome = calculateNetIncome(cleanAmount, source);
        instance.setValueFromCoords(4, row, netIncome, true);
      }
    }
  }
}

async function initOutgoingSheet() {
  const data = await loadOutgoingData();

  console.log('Initializing outgoing sheet with data:', data);

  outgoingSheet = jspreadsheet(document.getElementById('outgoingSpreadsheet'), {
    worksheets: [{
      data: data,
      columns: [
        {
          title: 'Date',
          type: 'calendar',
          width: 120,
          options: {
            format: 'DD-MM-YYYY',
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            weekdays_short: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
          }
        },
        {
          title: 'Amount (£)',
          type: 'numeric',
          width: 120,
          mask: '£ #,##0.00',
        },
        {
          title: 'Recipient',
          type: 'text',
          width: 150
        },
        {
          title: 'Purpose',
          type: 'text',
          width: 200
        },
        {
          title: 'Category',
          type: 'dropdown',
          width: 150,
          source: categories
        },
        {
          title: 'Approved By',
          type: 'dropdown',
          width: 150,
          source: approvers
        }
      ],
      minDimensions: [6, 10],
      contextMenu: function(obj, x, y, e, items) {
        // Override the delete row functionality
        const deleteIndex = items.findIndex(item => item && item.title === 'Delete selected rows');
        if (deleteIndex !== -1) {
          const originalOnclick = items[deleteIndex].onclick;
          items[deleteIndex].onclick = function() {
            const selectedRows = obj.getSelectedRows(true); // Get selected row indices
            console.log('Custom delete triggered for outgoing rows:', selectedRows);

            // Delete from database first
            selectedRows.forEach(rowIndex => {
              if (recordIds.outgoing.has(rowIndex)) {
                const recordId = recordIds.outgoing.get(rowIndex);
                console.log('Deleting outgoing record:', recordId, 'at row:', rowIndex);

                deleteRecord('outgoing', recordId)
                  .then(() => {
                    console.log('Successfully deleted outgoing record:', recordId);
                    updateStatusMessage('Record deleted', 'success');
                  })
                  .catch(error => {
                    console.error('Failed to delete outgoing record:', error);
                    updateStatusMessage(`Failed to delete record: ${error.message}`, 'error');
                  });
              }
            });

            // Then call the original delete to remove from UI
            if (originalOnclick) originalOnclick();

            // Update totals
            setTimeout(() => {
              updateTotalOutgoing();
              updateBalance();
            }, 100);
          };
        }
        return items;
      },
      onchange: function(instance, cell, col, row, value) {
        console.log('Cell changed:', { col, row, value });
        updateTotalOutgoing();
        updateBalance();
      },
      oninsertrow: function(instance) {
        setTimeout(() => {
          updateTotalOutgoing();
          updateBalance();
        }, 100);
      }
    }],
    editable: false
  });
}

// ==================================================
// Calculate Totals
// ==================================================

function updateTotalNetIncome() {
  if (!incomingSheet || !incomingSheet[0]) return;

  const data = incomingSheet[0].getData();
  let total = 0;

  data.forEach(row => {
    if (row[4]) {
      let netIncome = String(row[4]).replace(/[£,\s]/g, '');
      total += parseFloat(netIncome) || 0;
    }
  });

  const totalEl = document.getElementById('totalNetIncome');
  if (totalEl) {
    totalEl.textContent = `£ ${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

function updateTotalOutgoing() {
  if (!outgoingSheet || !outgoingSheet[0]) return;

  const data = outgoingSheet[0].getData();
  let total = 0;

  data.forEach(row => {
    if (row[1]) {
      let amount = String(row[1]).replace(/[£,\s]/g, '');
      total += parseFloat(amount) || 0;
    }
  });

  const totalEl = document.getElementById('totalOutgoing');
  if (totalEl) {
    totalEl.textContent = `£ ${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

function updateBalance() {
  const netIncomeEl = document.getElementById('totalNetIncome');
  const outgoingEl = document.getElementById('totalOutgoing');
  const balanceEl = document.getElementById('currentBalance');

  if (!netIncomeEl || !outgoingEl || !balanceEl) return;

  const netIncomeText = netIncomeEl.textContent.replace(/[£,\s]/g, '');
  const outgoingText = outgoingEl.textContent.replace(/[£,\s]/g, '');

  const netIncome = parseFloat(netIncomeText) || 0;
  const outgoing = parseFloat(outgoingText) || 0;
  const balance = netIncome - outgoing;

  balanceEl.textContent = `£ ${balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  // Color code balance
  if (balance > 0) {
    balanceEl.style.color = '#1b5e20';
  } else if (balance < 0) {
    balanceEl.style.color = '#b71c1c';
  } else {
    balanceEl.style.color = '#0d47a1';
  }
}

// ==================================================
// Authentication UI
// ==================================================

function setupPasswordModal() {
  const modal = document.getElementById('passwordModal');
  const userSelect = document.getElementById('userSelect');
  const passwordInput = document.getElementById('passwordInput');
  const submitBtn = document.getElementById('submitPasswordBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  submitBtn.addEventListener('click', async () => {
    const userName = userSelect.value;
    const password = passwordInput.value;

    if (!userName) {
      updateStatusMessage('Please select your name', 'warning');
      return;
    }

    if (!password) {
      updateStatusMessage('Please enter password', 'warning');
      return;
    }

    showLoading('Authenticating...');

    const result = await authenticateUser(userName, password);

    hideLoading();

    if (result.success) {
      modal.classList.remove('active');
      passwordInput.value = '';
      userSelect.value = '';
      toggleEditMode(true);
      updateCurrentUserBanner();
    } else {
      updateStatusMessage(`Authentication failed: ${result.error}`, 'warning');
    }
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    passwordInput.value = '';
    userSelect.value = '';
  });

  // Enter key support
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });
}

function setupEditButton() {
  const editBtn = document.getElementById('editBtn');

  editBtn.addEventListener('click', async () => {
    if (isEditMode) {
      // Disable editing
      await logoutUser();
      toggleEditMode(false);
      updateCurrentUserBanner();
    } else {
      // Show login modal
      const modal = document.getElementById('passwordModal');
      modal.classList.add('active');
    }
  });
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutUser();
      toggleEditMode(false);
      updateCurrentUserBanner();
      updateStatusMessage('Logged out successfully', 'success');
      setTimeout(() => {
        updateStatusMessage('View-only mode. Click "Enable Editing" to make changes (password required).', 'info');
      }, 2000);
    });
  }
}

function toggleEditMode(enabled) {
  isEditMode = enabled;
  console.log('toggleEditMode called with enabled:', enabled);

  if (incomingSheet && incomingSheet[0] && incomingSheet[0].options) {
    incomingSheet[0].options.editable = enabled;
    console.log('Incoming sheet editable set to:', enabled, 'Current value:', incomingSheet[0].options.editable);
  }

  if (outgoingSheet && outgoingSheet[0] && outgoingSheet[0].options) {
    outgoingSheet[0].options.editable = enabled;
    console.log('Outgoing sheet editable set to:', enabled, 'Current value:', outgoingSheet[0].options.editable);
  }

  document.getElementById('saveBtn').disabled = !enabled;
  document.getElementById('addRowBtn').disabled = !enabled;
  document.getElementById('importBtn').disabled = !enabled;
  document.getElementById('editBtn').textContent = enabled ? 'Disable Editing' : 'Enable Editing';

  if (enabled) {
    updateStatusMessage('Edit mode enabled. Make your changes and click "Save Changes".', 'success');
  } else {
    updateStatusMessage('View-only mode. Click "Enable Editing" to make changes (password required).', 'info');
  }
}

// ==================================================
// Save Button
// ==================================================

function setupSaveButton() {
  const saveBtn = document.getElementById('saveBtn');

  saveBtn.addEventListener('click', async () => {
    if (!sessionToken) {
      updateStatusMessage('Not authenticated', 'warning');
      return;
    }

    showLoading('Saving changes...');

    try {
      const incomingData = incomingSheet[0].getData();
      const outgoingData = outgoingSheet[0].getData();

      let totalSaved = 0;
      const errors = [];

      // Filter out empty rows and rows that already exist in database (have a recordId)
      // Only save NEW rows
      const newIncomingRows = incomingData
        .map((row, index) => ({ row, index }))
        .filter(({ row, index }) =>
          row && row[0] && row[1] && !recordIds.incoming.has(index) // Has data and NOT in database
        );

      const newOutgoingRows = outgoingData
        .map((row, index) => ({ row, index }))
        .filter(({ row, index }) =>
          row && row[0] && row[1] && !recordIds.outgoing.has(index) // Has data and NOT in database
        );

      console.log('New rows to save:', {
        incoming: newIncomingRows.length,
        outgoing: newOutgoingRows.length
      });

      // Save incoming funds using batch API
      if (newIncomingRows.length > 0) {
        const operations = newIncomingRows.map(({ row }) => ({
          date: row[0],
          amount: parseFloat(String(row[1]).replace(/[£,\s]/g, '')) || 0,
          source: row[2] || 'Other',
          donor_initials: row[3] || null,
          purpose_note: row[5] || null,
          approved_by: row[6] || currentUserName
        }));

        try {
          const result = await apiRequest('finance-mutate', {
            method: 'POST',
            body: JSON.stringify({
              sessionToken,
              action: 'batch',
              type: 'incoming',
              operations
            })
          });

          if (result.success) {
            totalSaved += result.processed;
            if (result.errors && result.errors.length > 0) {
              errors.push(...result.errors);
            }
          }
        } catch (error) {
          errors.push(`Incoming funds error: ${error.message}`);
        }
      }

      // Save outgoing funds using batch API
      if (newOutgoingRows.length > 0) {
        const operations = newOutgoingRows.map(({ row }) => ({
          date: row[0],
          amount: parseFloat(String(row[1]).replace(/[£,\s]/g, '')) || 0,
          recipient: row[2] || 'Unknown',
          purpose: row[3] || 'No description',
          category: row[4] || 'Other',
          approved_by: row[5] || currentUserName
        }));

        try {
          const result = await apiRequest('finance-mutate', {
            method: 'POST',
            body: JSON.stringify({
              sessionToken,
              action: 'batch',
              type: 'outgoing',
              operations
            })
          });

          if (result.success) {
            totalSaved += result.processed;
            if (result.errors && result.errors.length > 0) {
              errors.push(...result.errors);
            }
          }
        } catch (error) {
          errors.push(`Outgoing funds error: ${error.message}`);
        }
      }

      hideLoading();

      // Show results
      if (errors.length > 0) {
        console.error('Save errors:', errors);
        updateStatusMessage(`Saved ${totalSaved} records with ${errors.length} errors. Check console for details.`, 'warning');
      } else if (totalSaved > 0) {
        updateStatusMessage(`Successfully saved ${totalSaved} record${totalSaved > 1 ? 's' : ''}!`, 'success');

        // Reload data from database to get IDs and audit info
        setTimeout(async () => {
          await initIncomingSheet();
          await initOutgoingSheet();
          updateTotalNetIncome();
          updateTotalOutgoing();
          updateBalance();
        }, 1000);
      } else {
        updateStatusMessage('No changes to save', 'info');
      }

    } catch (error) {
      hideLoading();
      console.error('Save error:', error);
      updateStatusMessage(`Save failed: ${error.message}`, 'warning');
    }
  });
}

// ==================================================
// Add Row Button
// ==================================================

function setupAddRowButton() {
  const addRowBtn = document.getElementById('addRowBtn');

  addRowBtn.addEventListener('click', () => {
    if (!isEditMode) return;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    if (currentTab === 'incoming') {
      if (incomingSheet && incomingSheet[0]) {
        incomingSheet[0].insertRow(1, 0, false);
        incomingSheet[0].setValueFromCoords(0, 0, formattedDate);
      }
    } else {
      if (outgoingSheet && outgoingSheet[0]) {
        outgoingSheet[0].insertRow(1, 0, false);
        outgoingSheet[0].setValueFromCoords(0, 0, formattedDate);
      }
    }
  });
}

// ==================================================
// Tab Switching
// ==================================================

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(tabName).classList.add('active');

      currentTab = tabName;
    });
  });
}

// ==================================================
// Export CSV
// ==================================================

function setupExportButton() {
  const exportBtn = document.getElementById('exportBtn');

  exportBtn.addEventListener('click', () => {
    let sheet, filename;

    if (currentTab === 'incoming') {
      sheet = incomingSheet[0];
      filename = 'incoming_funds.csv';
    } else {
      sheet = outgoingSheet[0];
      filename = 'outgoing_funds.csv';
    }

    const csv = sheet.copy(false, ',', true);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    updateStatusMessage(`Exported ${currentTab} funds to ${filename}`, 'success');
    setTimeout(() => {
      if (isEditMode) {
        updateStatusMessage('Edit mode enabled. Make your changes and click "Save Changes".', 'success');
      } else {
        updateStatusMessage('View-only mode. Click "Enable Editing" to make changes (password required).', 'info');
      }
    }, 2000);
  });
}

// ==================================================
// Export PDF
// ==================================================

function setupExportPdfButton() {
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  exportPdfBtn.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');

    const incomingData = incomingSheet[0].getData();
    const outgoingData = outgoingSheet[0].getData();

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MEPIE Foundation - Financial Transparency Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; }
          h2 { color: #34495e; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; }
          .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2c3e50; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>MEPIE Foundation - Financial Transparency Report</h1>
        <p>Generated: ${new Date().toLocaleDateString('en-GB')}</p>

        <div class="summary">
          <strong>Total Net Income:</strong> ${document.getElementById('totalNetIncome').textContent}<br>
          <strong>Total Outgoing:</strong> ${document.getElementById('totalOutgoing').textContent}<br>
          <strong>Current Balance:</strong> ${document.getElementById('currentBalance').textContent}
        </div>

        <h2>Incoming Funds</h2>
        <table>
          <tr>
            <th>Date</th>
            <th>Amount (£)</th>
            <th>Source</th>
            <th>Donor Initials</th>
            <th>Net Income (£)</th>
            <th>Purpose/Note</th>
            <th>Approved By</th>
          </tr>
          ${incomingData.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell || ''}</td>`).join('')}
            </tr>
          `).join('')}
        </table>

        <h2>Outgoing Funds</h2>
        <table>
          <tr>
            <th>Date</th>
            <th>Amount (£)</th>
            <th>Recipient</th>
            <th>Purpose</th>
            <th>Category</th>
            <th>Approved By</th>
          </tr>
          ${outgoingData.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell || ''}</td>`).join('')}
            </tr>
          `).join('')}
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  });
}

// ==================================================
// Import CSV (Placeholder - will be enhanced with API)
// ==================================================

function setupImportButton() {
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('csvFileInput');

  importBtn.addEventListener('click', () => {
    if (!isEditMode) {
      updateStatusMessage('Please enable editing mode before importing data.', 'warning');
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());

        // Skip header row and parse data
        const data = lines.slice(1).map(line => {
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          return matches ? matches.map(field => field.replace(/^"|"$/g, '').trim()) : [];
        }).filter(row => row.length > 0);

        if (data.length === 0) {
          updateStatusMessage('CSV file is empty or invalid.', 'warning');
          return;
        }

        // Load into spreadsheet
        let sheet;
        if (currentTab === 'incoming') {
          sheet = incomingSheet[0];
        } else {
          sheet = outgoingSheet[0];
        }

        sheet.setData(data);

        // Recalculate if incoming
        if (currentTab === 'incoming') {
          data.forEach((row, rowIndex) => {
            if (row.length >= 3) {
              let amount = row[1];
              const source = row[2];

              if (amount) {
                amount = String(amount).replace(/[£,\s]/g, '');
              }

              const netIncome = calculateNetIncome(amount, source);
              sheet.setValueFromCoords(4, rowIndex, netIncome, true);
            }
          });
        }

        // Update totals
        if (currentTab === 'incoming') {
          updateTotalNetIncome();
        } else {
          updateTotalOutgoing();
        }
        updateBalance();

        updateStatusMessage(`Successfully imported ${data.length} rows from CSV. Remember to save changes!`, 'success');

        // Reset file input
        fileInput.value = '';

      } catch (error) {
        console.error('Error importing CSV:', error);
        updateStatusMessage('Error importing CSV file. Please check the format.', 'warning');
      }
    };

    reader.readAsText(file);
  });
}

// ==================================================
// Check Session on Page Load
// ==================================================

async function checkSessionOnLoad() {
  if (sessionToken) {
    const result = await validateSession();
    if (result.valid) {
      toggleEditMode(true);
      updateCurrentUserBanner();
    } else {
      clearSession();
    }
  }
}

// ==================================================
// Initialize Everything
// ==================================================

async function initializeApp() {
  console.log('Initializing financial transparency app...');

  // Check if user has an existing session
  await checkSessionOnLoad();

  // Initialize spreadsheets
  await initIncomingSheet();
  await initOutgoingSheet();

  // Setup UI handlers
  setupTabs();
  setupPasswordModal();
  setupEditButton();
  setupLogoutButton();
  setupSaveButton();
  setupAddRowButton();
  setupExportButton();
  setupImportButton();
  setupExportPdfButton();

  // Initial totals calculation
  setTimeout(() => {
    updateTotalNetIncome();
    updateTotalOutgoing();
    updateBalance();
  }, 500);

  console.log('App initialized successfully');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
