const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Student = require('../models/Student');

// Razorpay instance is initialized inside functions to ensure it picks up potentially hot-reloaded env vars
// or we can export a function that gets the instance.
// For now, let's keep it simple.

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Student)
const createOrder = async (req, res) => {
    try {
        const { amount, paymentType } = req.body;

        if (process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
            throw new Error("Razorpay API Keys are not configured in .env file");
        }

        const keyId = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.replace(/"/g, '').trim() : '';
        const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.replace(/"/g, '').trim() : '';

        console.log("Razorpay Init - Key Length:", keyId.length, "Secret Length:", keySecret.length);
        console.log("Using Razorpay Key:", keyId.substring(0, 8) + "...");

        const instance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const options = {
            amount: Math.round(Number(amount) * 100), // amount in paise, ensure integer
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await instance.orders.create(options);

        if (!order) return res.status(500).send("Error creating order");

        res.json(order);

    } catch (error) {
        console.error("Razorpay Order Error:", error);

        if (error.statusCode === 401) {
            return res.status(500).json({ message: "Razorpay Auth Failed: Invalid Key ID or Secret" });
        }

        res.status(500).json({ message: error.error?.description || error.message || "Payment Initialization Failed" });
    }
};

// @desc    Verify Payment
// @route   POST /api/payments/verify
// @access  Private (Student)
const sendEmail = require('../utils/sendEmail');

// ... (rest of imports)

// ...

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            signature,
            paymentType,
            amount,
            examNotificationId
        } = req.body;

        // Handle Test Mode gracefully if secret is default
        if (process.env.RAZORPAY_KEY_SECRET) {
            const secret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.replace(/"/g, '').trim() : '';
            const shasum = crypto.createHmac("sha256", secret);
            shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
            const digest = shasum.digest("hex");

            if (digest !== signature) {
                return res.status(400).json({ msg: "Transaction validation failed!" });
            }
        }

        const student = await Student.findOne({ user: req.user._id }).populate('user');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Save Payment and Update Status
        const payment = new Payment({
            student: student._id,
            amount,
            paymentType,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature: signature,
            status: 'completed',
            examNotificationId: examNotificationId || null
        });

        await payment.save();

        // Auto-update dues if applicable
        let feeTypeLabel = 'Fee';
        if (paymentType === 'college_fee') {
            student.collegeFeeDue = Math.max(0, student.collegeFeeDue - amount);
            await student.save();
            feeTypeLabel = 'College Fee';
        } else if (paymentType === 'transport_fee') {
            student.transportFeeDue = Math.max(0, student.transportFeeDue - amount);
            await student.save();
            feeTypeLabel = 'Transport Fee';
        } else if (paymentType === 'exam_fee') {
            feeTypeLabel = 'Exam Fee';
        }

        // Send Email Notification
        try {
            await sendEmail({
                email: student.user.email,
                subject: `Payment Successful - ${feeTypeLabel}`,
                message: `Dear ${student.user.name},\n\nYour payment of ₹${amount} for ${feeTypeLabel} has been successfully received.\n\nTransaction ID: ${razorpayPaymentId}\nDate: ${new Date().toLocaleString()}\n\nThank you,\nCollege Accounts Dept.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2 style="color: #4f46e5;">Payment Successful</h2>
                        <p>Dear <strong>${student.user.name}</strong>,</p>
                        <p>Your payment has been successfully received.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Fee Type:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${feeTypeLabel}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">₹${amount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Transaction ID:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${razorpayPaymentId}</td>
                            </tr>
                        </table>
                        <p>Thank you,<br>College Accounts Dept.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Don't fail the request, just log it
        }

        res.json({
            msg: "Payment success",
            paymentId: razorpayPaymentId,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Razorpay Key ID
// @route   GET /api/payments/key
// @access  Private
const getRazorpayKey = async (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};

// @desc    Get My Payments
// @route   GET /api/payments/my-history
// @access  Private (Student)
const getMyPayments = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const payments = await Payment.find({ student: student._id }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createOrder, verifyPayment, getRazorpayKey, getMyPayments };
