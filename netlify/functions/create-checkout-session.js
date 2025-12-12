/**
 * Netlify Function: Create Stripe Checkout Session
 * MEPIE Foundation
 *
 * This serverless function creates a Stripe Checkout Session for donations
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { amount, isMonthly } = JSON.parse(event.body);

    // Validate amount (minimum £5 = 500 pence)
    if (!amount || amount < 500) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid donation amount. Minimum is £5.' }),
      };
    }

    // Create Checkout Session parameters
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Donation to MEPIE Foundation',
              description: 'Supporting technical education and skills development in underserved communities',
              images: ['https://mepie-foundation.org/images/logos/logo.svg'],
            },
            unit_amount: amount,
            ...(isMonthly && {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: isMonthly ? 'subscription' : 'payment',
      success_url: `${process.env.SITE_URL || 'https://storied-pika-7c404d.netlify.app'}/donate-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'https://storied-pika-7c404d.netlify.app'}/donate.html`,
      metadata: {
        donation_type: isMonthly ? 'monthly' : 'one-time',
        charity: 'MEPIE Foundation',
      },
    };

    // Create the Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
      }),
    };
  } catch (error) {
    console.error('Stripe error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to create checkout session',
      }),
    };
  }
};
