require("dotenv").config();
const express = require("express");
const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const bodyParser = require("body-parser");
const port = process.env.PORT || 5000;
const app = express();

// Configure CORS for production
const allowedOrigins = [
  'ecommerce-backend-production-a727.up.railway.app',
  'http://localhost:5173', // For local development
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(bodyParser.json());

// Create Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "usd" } = req.body;

    const paymentIntent = await Stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Confirm Payment (optional, for additional processing)
app.post("/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await Stripe.paymentIntents.retrieve(paymentIntentId);

    res.send({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
// Webhook endpoint for Stripe events
app.post("/webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = Stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    switch(event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        // Add your logic here (update database, send confirmation email, etc)
        break;
      
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        // Handle failed payment
        break;
    }

    res.json({received: true});
  } catch (err) {
    console.log('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
app.listen(process.env.PORT, () =>
  console.log("Server running on port", process.env.PORT)
);

console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY);
