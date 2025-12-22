const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter
    // Note: For real applications, use a real service like SendGrid, AWS SES, or a configured SMTP.
    // Assuming GMAIL slightly insecure app or App Password for now as per minimal setup.
    // If no .env vars provided, this will likely fail or needs Ethereal for testing.

    const transporter = nodemailer.createTransport({
        service: 'gmail', // or 'hotmail', 'yahoo' etc.
        auth: {
            user: process.env.EMAIL_USER || 'test@example.com',
            pass: process.env.EMAIL_PASS || 'password'
        }
    });

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
        console.log("Skipping Email: EMAIL_USER is not configured in .env");
        return;
    }

    // 2. Define email options
    const mailOptions = {
        from: 'College Fee System <noreply@college.edu>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
