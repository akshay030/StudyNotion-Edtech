require('dotenv').config({ path: './server/.env' });
 // Ensure this is the very first line

const Razorpay = require('razorpay');

// Check if environment variables are loaded correctly (for debugging purposes)
console.log("Razorpay Key:", process.env.RAZORPAY_KEY);
console.log("Razorpay Secret:", process.env.RAZORPAY_SECRET);

// Create Razorpay instance
exports.instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,      // Fetch the key from .env
  key_secret: process.env.RAZORPAY_SECRET // Fetch the secret from .env
});
