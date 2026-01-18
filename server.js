require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/* =================== CORS CONFIGURATION =================== */
const corsOptions = {
  origin: [
    "https://ecommerce-frontend-liart-beta.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature']
};

app.use(cors(corsOptions));

/* =================== STRIPE WEBHOOK =================== */
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "payment_intent.succeeded") {
        console.log("✅ Payment succeeded:", event.data.object.id);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

/* =================== NORMAL JSON PARSING =================== */
app.use(express.json());

/* =================== HEALTH CHECK =================== */
app.get("/", (req, res) => {
  res.json({ message: "Payment Server is running!" });
});

/* =================== CREATE PAYMENT INTENT =================== */
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Payment Intent Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =================== 404 HANDLER =================== */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =================== SERVER START =================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});