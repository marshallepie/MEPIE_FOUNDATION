# Stripe Integration Setup Guide
## MEPIE Foundation Donation System

This guide will help you set up Stripe to accept donations on your website.

---

## Prerequisites

- A Stripe account (free to create)
- Your website deployed to Netlify (or running locally)
- Access to your project's environment variables

---

## Step 1: Create a Stripe Account

1. Go to **https://stripe.com**
2. Click **Sign Up** (it's free)
3. Complete the registration process
4. Verify your email address

**Note:** You can start with Stripe's **test mode** and switch to live mode when ready.

---

## Step 2: Get Your API Keys

1. Log in to your Stripe Dashboard: **https://dashboard.stripe.com**
2. Click on **Developers** in the left sidebar
3. Click on **API keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret key** (starts with `sk_test_...` or `sk_live_...`)

**⚠️ IMPORTANT:** Keep your secret key private! Never commit it to Git or share it publicly.

---

## Step 3: Set Up Environment Variables

### For Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Stripe keys:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   URL=http://localhost:3000
   ```

3. **Make sure `.env` is in your `.gitignore`** (it should already be there)

### For Netlify Production

1. Go to your Netlify site dashboard
2. Click **Site settings** → **Environment variables**
3. Add these variables:

   | Variable Name | Value |
   |---------------|-------|
   | `VITE_STRIPE_PUBLISHABLE_KEY` | Your publishable key (pk_...) |
   | `STRIPE_SECRET_KEY` | Your secret key (sk_...) |
   | `URL` | https://mepie-foundation.org |

4. Click **Save**
5. Redeploy your site (Netlify → Deploys → Trigger deploy)

---

## Step 4: Install Dependencies

Run this command to install Stripe and Netlify CLI:

```bash
npm install
```

This will install:
- `stripe` - Stripe Node.js library
- `netlify-cli` - For testing serverless functions locally

---

## Step 5: Test Locally (Optional)

To test the full donation flow locally with Netlify Functions:

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Start the Netlify dev server (includes functions)
netlify dev
```

This will start your site at `http://localhost:8888` with working serverless functions.

### Test Card Numbers

When in **test mode**, use these cards:

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0025 0000 3155 | 3D Secure required |

- Use any future expiry date (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)
- Use any postal code (e.g., 12345)

---

## Step 6: Go Live

When you're ready to accept real donations:

### 1. Complete Stripe Onboarding

1. In Stripe Dashboard, click **Activate your account**
2. Provide required business information:
   - Business name: **MEPIE Foundation**
   - Business type: **Non-profit**
   - Country: **United Kingdom**
   - Bank account details (for receiving donations)
   - Charity registration number

3. Submit required documents (if requested)

### 2. Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Get your **live API keys** (they start with `pk_live_...` and `sk_live_...`)
3. Update your Netlify environment variables with live keys
4. Redeploy your site

---

## Step 7: Set Up Webhooks (Recommended)

Webhooks notify your site when donations succeed or fail.

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://mepie-foundation.org/.netlify/functions/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add it to Netlify environment variables as `STRIPE_WEBHOOK_SECRET`

---

## Monitoring Donations

### View Donations in Stripe

1. Log in to **Stripe Dashboard**
2. Go to **Payments** to see all donations
3. Go to **Customers** to see donor information
4. Go to **Subscriptions** to see monthly recurring donations

### Export Donation Data

1. In Stripe Dashboard, go to **Payments**
2. Click **Export**
3. Choose date range and format (CSV or JSON)
4. Use this for your monthly financial transparency reports

---

## Troubleshooting

### "Stripe is not defined" Error

**Solution:** Make sure Stripe.js is loaded in your HTML:
```html
<script src="https://js.stripe.com/v3/"></script>
```

### "No such checkout session" Error

**Possible causes:**
- Wrong API key (test vs live)
- Netlify function not deployed
- Environment variables not set

**Solution:** Check your Netlify deploy logs and verify environment variables.

### Donations Not Working

1. **Check browser console** for JavaScript errors
2. **Check Netlify function logs**:
   - Go to Netlify Dashboard → Functions → Logs
3. **Verify API keys** are correct and active
4. **Test in Stripe test mode** first

---

## Security Best Practices

✅ **DO:**
- Keep secret keys in environment variables only
- Use HTTPS in production (Netlify provides this automatically)
- Regularly review Stripe logs for suspicious activity
- Set up email notifications for large donations

❌ **DON'T:**
- Commit `.env` file to Git
- Share your secret key with anyone
- Use test keys in production
- Store card details on your server (Stripe handles this)

---

## Charity-Specific Features

### Gift Aid (UK)

To collect Gift Aid declarations:

1. Add a checkbox to your donate form
2. Store declarations in a spreadsheet or CRM
3. Submit to HMRC quarterly

**Note:** Stripe doesn't automatically handle Gift Aid, but you can add it to your donation form.

### Donation Receipts

Stripe automatically sends email receipts to donors. To customize them:

1. Go to **Stripe Dashboard → Settings → Emails**
2. Customize the receipt template
3. Add your charity logo and information

---

## Cost

Stripe charges:
- **1.5% + 20p** per transaction (UK non-profit rate)
- **No monthly fees**
- **No setup fees**

Example: £100 donation = £98.30 received (£1.70 fee)

To apply for non-profit pricing:
1. Go to **Stripe Dashboard → Settings → Account details**
2. Update business type to **Non-profit**
3. Provide charity registration documents

---

## Support

- **Stripe Support:** https://support.stripe.com
- **Stripe Docs:** https://stripe.com/docs
- **Netlify Support:** https://www.netlify.com/support

---

## Next Steps

After setting up Stripe:

1. ✅ Test donations in test mode
2. ✅ Complete Stripe onboarding
3. ✅ Switch to live mode
4. ✅ Make a test donation
5. ✅ Set up webhooks
6. ✅ Update financial transparency page with donation tracking

---

**Questions?** Contact the development team or email contact@mepie-foundation.org
