const { razorpay, currency, webhook_secret } = require('../config/razorpay');
const crypto = require('crypto');
const { donationService } = require('./supabase');

async function createOrder(amount, donationId, notes = {}) {
  // Ensure amount is in paise (multiply by 100 if it's not already)
  const amountInPaise = typeof amount === 'number' && amount < 100 ? Math.round(amount * 100) : amount;
  
  console.log('Creating Razorpay order:', { amountInPaise, donationId });
  
  const options = {
    amount: amountInPaise,
    currency,
    receipt: `donation_${donationId}`,
    notes: {
      ...notes,
      donationId: donationId
    },
    payment_capture: 1
  };

  try {
    const response = await razorpay.orders.create(options);
    console.log('Razorpay order created:', response);
    
    return {
      success: true,
      orderId: response.id,
      id: response.id, // Adding id for compatibility
      amount: response.amount,
      currency: response.currency,
      receipt: response.receipt,
      status: response.status,
      created_at: new Date(response.created_at * 1000).toISOString(),
      razorpayOrder: response
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order: ' + error.message);
  }
}

async function verifyPayment(paymentId) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: payment.status === 'captured',
      payment
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    throw new Error('Payment verification failed');
  }
}

function validateWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', webhook_secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return expectedSignature === signature;
}

module.exports = {
  createOrder,
  verifyPayment,
  validateWebhookSignature
};
