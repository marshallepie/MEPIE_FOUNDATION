// jspreadsheet is loaded globally via CDN
const EDIT_PASSWORD = window.FINANCE_EDIT_PASSWORD || 'mepie2024admin';
const STORAGE_KEY_INCOMING = 'mepie_incoming_funds';
const STORAGE_KEY_OUTGOING = 'mepie_outgoing_funds';

let incomingSheet = null;
let outgoingSheet = null;
let isEditMode = false;
let currentTab = 'incoming';

const approvers = ['Marshall Epie', 'Aruna Ramineni', 'Fitz Schroeder'];

// Helper function to calculate net income
function calculateNetIncome(amount, source) {
  const numAmount = parseFloat(amount) || 0;
  if (source === 'GoFundMe') {
    return (numAmount * 0.9669).toFixed(2); // Deduct 3.31%
  }
  return numAmount.toFixed(2);
}

// Initial data - empty by default, data comes from localStorage
const initialIncomingData = [];

const initialOutgoingData = [];

// Load data from localStorage or use initial data
function loadData(key, initialData) {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      // Recalculate net income for all rows on load
      if (key === STORAGE_KEY_INCOMING) {
        data.forEach((row, index) => {
          if (row.length >= 3) {
            let amount = row[1];
            const source = row[2];

            // Clean amount - remove currency symbols and commas
            if (amount) {
              amount = String(amount).replace(/[£,\s]/g, '');
            }

            row[4] = calculateNetIncome(amount, source);
          }
        });
      }
      return data;
    } catch (e) {
      console.error('Error loading data:', e);
      return initialData;
    }
  }
  return initialData;
}

// Save data to localStorage
function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving data:', e);
    return false;
  }
}

// Initialize Incoming Funds Spreadsheet
function initIncomingSheet() {
  const data = loadData(STORAGE_KEY_INCOMING, initialIncomingData);

  console.log('Initializing incoming sheet with data:', data);
  console.log('jspreadsheet available:', typeof jspreadsheet);

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
          source: ['GoFundMe', 'Stripe', 'Bank Transfer', 'Check', 'Cash', 'Other']
        },
        {
          title: 'Donor Initials',
          type: 'text',
          width: 120
        },
        {
          title: 'Net Income (£)',
          type: 'text',
          width: 120
        },
        {
          title: 'Purpose/Note',
          type: 'text',
          width: 300
        },
        {
          title: 'Approved By',
          type: 'dropdown',
          width: 150,
          source: approvers
        }
      ],
      minDimensions: [7, 10],
    }],
    tableOverflow: true,
    tableWidth: '100%',
    editable: false,
    onchange: function(instance, cell, x, y, value) {
      console.log('Change detected:', {x, y, value, cell});

      if (isEditMode) {
        updateStatusMessage('Changes detected. Click "Save Changes" to persist.', 'warning');
      }

      // Auto-calculate Net Income when Amount (column 1) or Source (column 2) changes
      if (x == 1 || x == 2) {
        console.log('Amount or Source changed, recalculating net income');
        const rowIndex = y;
        let amount = instance.getValueFromCoords(1, rowIndex);
        const source = instance.getValueFromCoords(2, rowIndex);

        // Clean amount - remove currency symbols and commas
        if (amount) {
          amount = String(amount).replace(/[£,\s]/g, '');
        }

        console.log('Row data:', {amount, source, rowIndex});

        // Calculate and set net income
        const netIncome = calculateNetIncome(amount, source);
        console.log('Calculated net income:', netIncome);

        // Format with currency
        const formatted = '£ ' + parseFloat(netIncome).toLocaleString('en-GB', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

        console.log('Setting value at column 4, row', rowIndex, ':', formatted);
        instance.setValueFromCoords(4, rowIndex, formatted);
      }

      // Update total whenever data changes
      setTimeout(() => {
        updateTotalNetIncome();
      }, 100);
    }
  });

  console.log('Incoming sheet initialized:', incomingSheet);
  console.log('Incoming sheet methods:', Object.keys(incomingSheet));
  console.log('First worksheet:', incomingSheet[0]);

  // Recalculate net income for all existing rows
  setTimeout(() => {
    console.log('Recalculating net income for all rows...');
    const data = incomingSheet[0].getData();
    console.log('Current data:', data);

    data.forEach((row, index) => {
      console.log('Processing row', index, ':', row);
      if (row[1] && row[2]) { // If amount and source exist
        let amount = row[1];
        const source = row[2];

        // Clean amount - remove currency symbols and commas
        if (amount) {
          amount = String(amount).replace(/[£,\s]/g, '');
        }

        const netIncome = calculateNetIncome(amount, source);

        // Format with currency
        const formatted = '£ ' + parseFloat(netIncome).toLocaleString('en-GB', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

        console.log('Setting net income for row', index, ':', formatted);
        incomingSheet[0].setValueFromCoords(4, index, formatted);
      }
    });

    setTimeout(() => {
      console.log('After recalculation:', incomingSheet[0].getData());
      updateTotalNetIncome();
    }, 100);
  }, 300);
}

// Initialize Outgoing Funds Spreadsheet
function initOutgoingSheet() {
  const data = loadData(STORAGE_KEY_OUTGOING, initialOutgoingData);

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
          width: 200
        },
        {
          title: 'Purpose',
          type: 'text',
          width: 250
        },
        {
          title: 'Category',
          type: 'dropdown',
          width: 150,
          source: ['Education', 'Operations', 'Marketing', 'Infrastructure', 'Salaries', 'Other']
        },
        {
          title: 'Approved By',
          type: 'dropdown',
          width: 150,
          source: approvers
        }
      ],
      minDimensions: [6, 10],
    }],
    tableOverflow: true,
    tableWidth: '100%',
    editable: false,
    onchange: function(instance, cell, x, y, value) {
      if (isEditMode) {
        updateStatusMessage('Changes detected. Click "Save Changes" to persist.', 'warning');
      }

      // Update totals when amount changes in outgoing sheet
      if (x == 1) {
        setTimeout(() => {
          updateTotalOutgoing();
        }, 100);
      }
    }
  });

  console.log('Outgoing sheet initialized:', outgoingSheet);
  console.log('Outgoing sheet methods:', Object.keys(outgoingSheet));
  console.log('First worksheet:', outgoingSheet[0]);

  // Calculate initial total outgoing
  setTimeout(() => {
    updateTotalOutgoing();
  }, 300);
}

// Update status message
function updateStatusMessage(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
}

// Calculate and update total net income
function updateTotalNetIncome() {
  if (!incomingSheet || !incomingSheet[0]) return;

  const data = incomingSheet[0].getData();
  let total = 0;

  // Sum up all net income values (column index 4)
  for (let i = 0; i < data.length; i++) {
    const netIncome = data[i][4]; // Net Income column
    if (netIncome) {
      // Remove currency symbol and commas, then parse
      const cleanValue = String(netIncome).replace(/[£,]/g, '').trim();
      const numValue = parseFloat(cleanValue);
      if (!isNaN(numValue)) {
        total += numValue;
      }
    }
  }

  // Format and display total
  const totalElement = document.getElementById('totalNetIncome');
  if (totalElement) {
    totalElement.textContent = '£ ' + total.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Update balance after updating income
  updateBalance();
}

// Calculate and update total outgoing
function updateTotalOutgoing() {
  if (!outgoingSheet || !outgoingSheet[0]) return;

  const data = outgoingSheet[0].getData();
  let total = 0;

  // Sum up all amount values (column index 1)
  for (let i = 0; i < data.length; i++) {
    const amount = data[i][1]; // Amount column
    if (amount) {
      // Remove currency symbol and commas, then parse
      const cleanValue = String(amount).replace(/[£,]/g, '').trim();
      const numValue = parseFloat(cleanValue);
      if (!isNaN(numValue)) {
        total += numValue;
      }
    }
  }

  // Format and display total
  const totalElement = document.getElementById('totalOutgoing');
  if (totalElement) {
    totalElement.textContent = '£ ' + total.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Update balance after updating outgoing
  updateBalance();
}

// Calculate and update balance
function updateBalance() {
  const totalIncomeElement = document.getElementById('totalNetIncome');
  const totalOutgoingElement = document.getElementById('totalOutgoing');
  const balanceElement = document.getElementById('currentBalance');

  if (!totalIncomeElement || !totalOutgoingElement || !balanceElement) return;

  // Parse totals
  const incomeText = totalIncomeElement.textContent;
  const outgoingText = totalOutgoingElement.textContent;

  const income = parseFloat(incomeText.replace(/[£,]/g, '').trim()) || 0;
  const outgoing = parseFloat(outgoingText.replace(/[£,]/g, '').trim()) || 0;

  const balance = income - outgoing;

  // Format and display balance
  balanceElement.textContent = '£ ' + balance.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Change color based on balance (green if positive, red if negative)
  if (balance >= 0) {
    balanceElement.style.color = '#1b5e20';
  } else {
    balanceElement.style.color = '#b71c1c';
  }
}

// Enable/disable editing
function setEditMode(enabled) {
  isEditMode = enabled;

  if (incomingSheet && incomingSheet[0] && incomingSheet[0].options) {
    incomingSheet[0].options.editable = enabled;
  }

  if (outgoingSheet && outgoingSheet[0] && outgoingSheet[0].options) {
    outgoingSheet[0].options.editable = enabled;
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

// Handle tab switching
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

// Handle password modal
function setupPasswordModal() {
  const modal = document.getElementById('passwordModal');
  const passwordInput = document.getElementById('passwordInput');
  const submitBtn = document.getElementById('submitPasswordBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  submitBtn.addEventListener('click', () => {
    const enteredPassword = passwordInput.value;

    if (enteredPassword === EDIT_PASSWORD) {
      modal.classList.remove('active');
      passwordInput.value = '';
      setEditMode(true);
    } else {
      updateStatusMessage('Incorrect password. Please try again.', 'warning');
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    passwordInput.value = '';
  });

  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });
}

// Handle edit button
function setupEditButton() {
  const editBtn = document.getElementById('editBtn');

  editBtn.addEventListener('click', () => {
    if (isEditMode) {
      setEditMode(false);
    } else {
      document.getElementById('passwordModal').classList.add('active');
      document.getElementById('passwordInput').focus();
    }
  });
}

// Handle save button
function setupSaveButton() {
  const saveBtn = document.getElementById('saveBtn');

  saveBtn.addEventListener('click', () => {
    const incomingData = incomingSheet[0].getData();
    const outgoingData = outgoingSheet[0].getData();

    const savedIncoming = saveData(STORAGE_KEY_INCOMING, incomingData);
    const savedOutgoing = saveData(STORAGE_KEY_OUTGOING, outgoingData);

    if (savedIncoming && savedOutgoing) {
      updateStatusMessage('Changes saved successfully!', 'success');
      updateTotalNetIncome(); // Update totals after save
      updateTotalOutgoing();
      setTimeout(() => {
        if (isEditMode) {
          updateStatusMessage('Edit mode enabled. Make your changes and click "Save Changes".', 'success');
        }
      }, 2000);
    } else {
      updateStatusMessage('Error saving changes. Please try again.', 'warning');
    }
  });
}

// Handle add row button
function setupAddRowButton() {
  const addRowBtn = document.getElementById('addRowBtn');

  addRowBtn.addEventListener('click', () => {
    console.log('Add row button clicked');
    console.log('Current tab:', currentTab);
    console.log('incomingSheet:', incomingSheet);
    console.log('incomingSheet[0]:', incomingSheet[0]);
    console.log('outgoingSheet:', outgoingSheet);
    console.log('outgoingSheet[0]:', outgoingSheet[0]);

    // Format today's date as DD-MM-YYYY
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    try {
      if (currentTab === 'incoming') {
        console.log('Adding row to incoming sheet');
        // Insert 1 row at the end
        incomingSheet[0].insertRow(1, null, true);
        // Get the last row index
        const lastRowIndex = incomingSheet[0].getData().length - 1;
        console.log('Last row index:', lastRowIndex);
        // Set the date in the first column of the new row
        incomingSheet[0].setValueFromCoords(0, lastRowIndex, formattedDate);
        // Set initial net income to 0
        incomingSheet[0].setValueFromCoords(4, lastRowIndex, '0.00', true);
        updateStatusMessage('New row added to Incoming Funds. Don\'t forget to save!', 'warning');
      } else {
        console.log('Adding row to outgoing sheet');
        // Insert 1 row at the end
        outgoingSheet[0].insertRow(1, null, true);
        // Get the last row index
        const lastRowIndex = outgoingSheet[0].getData().length - 1;
        console.log('Last row index:', lastRowIndex);
        // Set the date in the first column of the new row
        outgoingSheet[0].setValueFromCoords(0, lastRowIndex, formattedDate);
        updateStatusMessage('New row added to Outgoing Funds. Don\'t forget to save!', 'warning');
      }
    } catch (error) {
      console.error('Error adding row:', error);
      updateStatusMessage('Error adding row: ' + error.message, 'warning');
    }
  });
}

// Handle export button
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

// Handle import from CSV button
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
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());

        // Skip header row and parse data
        const data = lines.slice(1).map(line => {
          // Handle CSV with quoted fields
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          return matches ? matches.map(field => field.replace(/^"|"$/g, '').trim()) : [];
        }).filter(row => row.length > 0);

        if (data.length === 0) {
          updateStatusMessage('CSV file is empty or invalid.', 'warning');
          return;
        }

        // Determine which sheet to import to and validate column count
        let sheet, storageKey, expectedColumns;
        if (currentTab === 'incoming') {
          sheet = incomingSheet[0];
          storageKey = STORAGE_KEY_INCOMING;
          expectedColumns = 7;

          // Recalculate net income for imported data
          data.forEach(row => {
            if (row.length >= 3) {
              let amount = row[1];
              const source = row[2];

              // Clean amount
              if (amount) {
                amount = String(amount).replace(/[£,\s]/g, '');
              }

              row[4] = calculateNetIncome(amount, source);
            }
          });
        } else {
          sheet = outgoingSheet[0];
          storageKey = STORAGE_KEY_OUTGOING;
          expectedColumns = 6;
        }

        // Validate column count
        const invalidRows = data.filter(row => row.length !== expectedColumns);
        if (invalidRows.length > 0) {
          updateStatusMessage(`Warning: ${invalidRows.length} rows have incorrect column count and may not import correctly.`, 'warning');
        }

        // Clear existing data and load new data
        sheet.setData(data);

        // Save to localStorage
        saveData(storageKey, data);

        // Update totals
        if (currentTab === 'incoming') {
          updateTotalNetIncome();
        } else {
          updateTotalOutgoing();
        }
        updateBalance();

        updateStatusMessage(`Successfully imported ${data.length} rows from CSV.`, 'success');

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

// Handle export to PDF button
function setupExportPdfButton() {
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  exportPdfBtn.addEventListener('click', () => {
    // Create a printable HTML content
    const printWindow = window.open('', '_blank');
    const doc = printWindow.document;

    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MEPIE Foundation - Financial Transparency Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 10px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .summary-box {
            padding: 15px;
            border-radius: 8px;
            border: 2px solid;
          }
          .summary-box h3 {
            margin: 0 0 10px 0;
            font-size: 1rem;
          }
          .summary-box .amount {
            font-size: 1.5rem;
            font-weight: bold;
          }
          .income { border-color: #2e7d32; background: #e8f5e9; }
          .outgoing { border-color: #c62828; background: #ffebee; }
          .balance { border-color: #1565c0; background: #e3f2fd; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #2c3e50;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .section-title {
            margin-top: 30px;
            color: #2c3e50;
            font-size: 1.3rem;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>MEPIE Foundation - Financial Transparency Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })}</p>

        <div class="summary">
          <div class="summary-box income">
            <h3>Total Net Income</h3>
            <div class="amount">${document.getElementById('totalNetIncome').textContent}</div>
            <small>After GoFundMe fees (3.31%)</small>
          </div>
          <div class="summary-box outgoing">
            <h3>Total Outgoing</h3>
            <div class="amount">${document.getElementById('totalOutgoing').textContent}</div>
            <small>All expenses and disbursements</small>
          </div>
          <div class="summary-box balance">
            <h3>Current Balance</h3>
            <div class="amount">${document.getElementById('currentBalance').textContent}</div>
            <small>Net Income - Total Outgoing</small>
          </div>
        </div>

        <h2 class="section-title">Incoming Funds</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Source</th>
              <th>Donor Initials</th>
              <th>Net Income</th>
              <th>Purpose/Note</th>
              <th>Approved By</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(incomingSheet[0].getData())}
          </tbody>
        </table>

        <h2 class="section-title">Outgoing Funds</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Recipient</th>
              <th>Purpose</th>
              <th>Category</th>
              <th>Approved By</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(outgoingSheet[0].getData())}
          </tbody>
        </table>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 1rem; cursor: pointer;">Print / Save as PDF</button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 1rem; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `);

    doc.close();

    // Auto-trigger print dialog after a brief delay
    setTimeout(() => {
      printWindow.print();
    }, 500);

    updateStatusMessage('PDF export opened in new window', 'success');
    setTimeout(() => {
      if (isEditMode) {
        updateStatusMessage('Edit mode enabled. Make your changes and click "Save Changes".', 'success');
      } else {
        updateStatusMessage('View-only mode. Click "Enable Editing" to make changes (password required).', 'info');
      }
    }, 2000);
  });
}

// Helper function to generate table rows for PDF
function generateTableRows(data) {
  return data.map(row => {
    if (row.some(cell => cell)) { // Only include rows with data
      return '<tr>' + row.map(cell => `<td>${cell || ''}</td>`).join('') + '</tr>';
    }
    return '';
  }).join('');
}

// Initialize everything when DOM is ready
function init() {
  console.log('Starting initialization...');
  console.log('jspreadsheet:', typeof jspreadsheet);
  console.log('jSuites:', typeof jSuites);

  initIncomingSheet();
  initOutgoingSheet();
  setupTabs();
  setupPasswordModal();
  setupEditButton();
  setupSaveButton();
  setupAddRowButton();
  setupExportButton();
  setupImportButton();
  setupExportPdfButton();

  updateStatusMessage('View-only mode. Click "Enable Editing" to make changes (password required).', 'info');

  // Calculate initial total net income
  setTimeout(() => {
    updateTotalNetIncome();
  }, 100);

  console.log('Initialization complete');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
