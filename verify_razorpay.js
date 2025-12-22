require('dotenv').config();
const Razorpay = require('razorpay');

console.log("Testing Razorpay Config...");
console.log("Key ID:", process.env.RAZORPAY_KEY_ID);
// Mask secret for safety in logs, show first 4 and length
const secret = process.env.RAZORPAY_KEY_SECRET || "";
console.log("Key Secret:", secret.substring(0, 4) + "..." + " (Length: " + secret.length + ")");

if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
    console.error("ERROR: Invalid Key ID placeholder detected.");
    process.exit(1);
}

try {
    const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID.replace(/"/g, '').trim(),
        key_secret: process.env.RAZORPAY_KEY_SECRET.replace(/"/g, '').trim(),
    });

    // Try to fetch paymnets (or just check auth by creating a dummy order)
    console.log("Attempting to authenticate with Razorpay...");

    // Attempt to create a small dummy order
    instance.orders.create({
        amount: 100, // 1 INR
        currency: "INR",
        receipt: "test_verification_script"
    }).then(order => {
        console.log("SUCCESS: Razorpay Authentication Worked!");
        console.log("Order Created ID:", order.id);
    }).catch(err => {
        console.error("FAILURE: Razorpay Error:");
        console.error("Status Code:", err.statusCode);
        console.error("Error Code:", err.error ? err.error.code : "N/A");
        console.error("Description:", err.error ? err.error.description : err.message);
    });

} catch (e) {
    console.error("Initialization Error:", e.message);
}
