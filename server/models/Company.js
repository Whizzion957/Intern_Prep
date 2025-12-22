const mongoose = require('mongoose');

// Branch constants
const UG_BRANCHES = [
    'B.Arch.',
    'B.Tech. (Chemical Engineering)',
    'B.Tech. (Civil Engineering)',
    'B.Tech. (Computer Science and Engineering)',
    'B.Tech. (Electrical Engineering)',
    'B.Tech. (Electronics & Communication Engineering)',
    'B.Tech. (Mechanical Engineering)',
    'B.Tech. (Metallurgical & Materials Engineering)',
    'B.Tech. (Production and Industrial Engineering)',
    'B.Tech. (Engineering Physics)',
    'B.Tech. Biosciences and Bioengineering',
    'B.Tech. (Data Science and Artificial Intelligence)',
    'BS-MS (Chemical Sciences)',
    'BS-MS (Economics)',
    'BS-MS (Mathematics and Computing)',
    'BS-MS (Physics)',
    'Integrated M.Tech. Geological Technology',
    'Integrated M.Tech. Geophysical Technology'
];

const PG_BRANCHES = [
    'M.Tech. (Computer Science)',
    'M.Tech. (Electrical Engineering)',
    'M.Tech. (Mechanical Engineering)',
    'M.Tech. (Civil Engineering)',
    'M.Tech. (Chemical Engineering)',
    'M.Tech. (Electronics & Communication)',
    'MBA',
    'M.Sc. (Mathematics)',
    'M.Sc. (Physics)',
    'M.Sc. (Chemistry)',
    'M.Arch.',
    'MCA'
];

const PHD_BRANCHES = [
    'Ph.D. (Computer Science)',
    'Ph.D. (Electrical Engineering)',
    'Ph.D. (Mechanical Engineering)',
    'Ph.D. (Civil Engineering)',
    'Ph.D. (Chemical Engineering)',
    'Ph.D. (Mathematics)',
    'Ph.D. (Physics)',
    'Ph.D. (Chemistry)',
    'Ph.D. (Management)'
];

// Stipend breakdown sub-schema
const stipendBreakdownSchema = new mongoose.Schema({
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['monthly', 'one-time'],
        default: 'monthly'
    }
}, { _id: false });

// Role sub-schema
const roleSchema = new mongoose.Schema({
    roleName: { type: String, required: true },
    day: {
        type: String,
        enum: ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Later'],
        default: 'Day 1'
    },
    duration: { type: Number, default: 2 }, // Duration in months
    location: { type: String }, // Office/work location
    totalStipend: { type: Number }, // Monthly stipend in INR (calculated from monthly breakdowns)
    totalOneTime: { type: Number }, // Total one-time payments (bonus, grants etc)
    stipendBreakdown: [stipendBreakdownSchema],
    criteria: { type: String }, // Eligibility criteria text
    perks: { type: String }, // Perks & support details
    hiringFor: {
        ug: [{ type: String, enum: UG_BRANCHES }],
        pg: [{ type: String, enum: PG_BRANCHES }],
        phd: [{ type: String, enum: PHD_BRANCHES }]
    }
}, { _id: true });

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        logo: {
            type: String,
            default: null,
        },
        description: {
            type: String,
            default: null,
        },
        roles: [roleSchema],
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Create text index for search
companySchema.index({ name: 'text' });

const Company = mongoose.model('Company', companySchema);

module.exports = { Company, UG_BRANCHES, PG_BRANCHES, PHD_BRANCHES };
