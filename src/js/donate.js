/**
 * Donation Page with Stripe Integration
 * MEPIE Foundation
 */

// Initialize Stripe with your publishable key
// IMPORTANT: Replace with your actual Stripe publishable key
// Get this from: https://dashboard.stripe.com/apikeys
const stripe = Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE');

let selectedAmount = null;
let isMonthly = false;

// Donation amount buttons
const amountButtons = document.querySelectorAll('.donation-amount');
const customAmountInput = document.getElementById('custom-amount');
const monthlyCheckbox = document.getElementById('monthly-donation');
const donateButton = document.getElementById('donate-button');

// Handle preset amount selection
amountButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons
    amountButtons.forEach(btn => btn.classList.remove('btn-primary'));
    amountButtons.forEach(btn => btn.classList.add('btn-outline'));

    // Add active class to selected button
    button.classList.remove('btn-outline');
    button.classList.add('btn-primary');

    // Set selected amount (in pence)
    selectedAmount = parseInt(button.dataset.amount);

    // Clear custom amount input
    customAmountInput.value = '';

    // Update button text
    updateDonateButtonText();
  });
});

// Handle custom amount input
customAmountInput.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);

  if (value && value >= 5) {
    // Convert pounds to pence
    selectedAmount = Math.round(value * 100);

    // Deselect preset buttons
    amountButtons.forEach(btn => btn.classList.remove('btn-primary'));
    amountButtons.forEach(btn => btn.classList.add('btn-outline'));

    // Update button text
    updateDonateButtonText();
  } else if (value && value < 5) {
    selectedAmount = null;
  }
});

// Handle monthly checkbox
monthlyCheckbox.addEventListener('change', (e) => {
  isMonthly = e.target.checked;
  updateDonateButtonText();
});

// Update donate button text
function updateDonateButtonText() {
  if (!selectedAmount) {
    donateButton.textContent = 'Donate Securely with Stripe';
    return;
  }

  const pounds = (selectedAmount / 100).toFixed(2);
  const frequency = isMonthly ? '/month' : '';
  donateButton.textContent = `Donate £${pounds}${frequency}`;
}

// Handle donation submission
donateButton.addEventListener('click', async () => {
  if (!selectedAmount || selectedAmount < 500) {
    alert('Please select or enter a donation amount of at least £5');
    return;
  }

  // Disable button and show loading state
  donateButton.disabled = true;
  donateButton.textContent = 'Processing...';

  try {
    // Call your backend to create a Checkout Session
    // For now, this will redirect to a test Stripe Checkout
    // You'll need to implement the backend endpoint

    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: selectedAmount,
        isMonthly: isMonthly,
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId: sessionId,
    });

    if (error) {
      console.error('Stripe error:', error);
      alert('Payment failed. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);

    // Fallback: Show manual donation instructions
    showManualDonationInstructions();
  } finally {
    // Re-enable button
    donateButton.disabled = false;
    updateDonateButtonText();
  }
});

// Fallback: Show manual donation instructions if Stripe fails
function showManualDonationInstructions() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 40px;
      border-radius: 12px;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    ">
      <h2 style="margin-bottom: 20px; color: #1a5490;">Online Payments Temporarily Unavailable</h2>
      <p style="margin-bottom: 20px;">We're currently setting up our online payment system. In the meantime, you can still donate via bank transfer:</p>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin-bottom: 10px;"><strong>Account Name:</strong> MEPIE Foundation</p>
        <p style="margin-bottom: 10px;"><strong>Bank:</strong> NatWest Bank</p>
        <p style="margin-bottom: 10px;"><strong>Sort Code:</strong> [To be provided]</p>
        <p style="margin-bottom: 10px;"><strong>Account Number:</strong> [To be provided]</p>
        <p style="margin-bottom: 0;"><strong>Amount:</strong> £${(selectedAmount / 100).toFixed(2)}</p>
      </div>

      <p style="margin-bottom: 20px; font-size: 14px; color: #666;">Please email <a href="mailto:contact@mepie-foundation.org" style="color: #1a5490;">contact@mepie-foundation.org</a> after making your transfer so we can acknowledge your donation.</p>

      <button onclick="this.parentElement.parentElement.remove()" style="
        background: #1a5490;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
      ">Close</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}
