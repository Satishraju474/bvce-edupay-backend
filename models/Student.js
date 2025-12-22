const mongoose = require('mongoose');

const studentSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usn: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    currentYear: { type: Number, required: true, min: 1, max: 4 }, // "Years 1,2,3,4"
    quota: { type: String, enum: ['government', 'management'], required: true },
    entry: { type: String, enum: ['regular', 'lateral'], required: true },
    status: { type: String, enum: ['active', 'detained', 'dropout'], default: 'active' },

    // Fees Due Status (Managed by Admin/Accounts/Transport)
    transportOpted: { type: Boolean, default: false },
    collegeFeeDue: { type: Number, default: 0 },
    transportFeeDue: { type: Number, default: 0 },
    lastSemDues: { type: Number, default: 0 }, // Keeping as "Previous Dues" generically

    // Professional Fee Management (Ledger)
    feeRecords: [{
        year: { type: Number, required: true },
        semester: { type: Number, required: true }, // Added Semester tracking
        feeType: { type: String, enum: ['college', 'transport', 'other'], required: true },
        amountDue: { type: Number, required: true },
        amountPaid: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
        transactions: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            mode: String,
            reference: String
        }]
    }],

    // Eligibility Override
    eligibilityOverride: { type: Boolean, default: null }, // true=Force Eligible, false=Force Ineligible

    // Logic will primarily calculate this dynamically
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
