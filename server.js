require("dotenv").config();
const express = require("express");
const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const bodyParser = require("body-parser");
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
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

app.listen(process.env.PORT, () =>
  console.log("Server running on port", process.env.PORT)
);

console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY);
