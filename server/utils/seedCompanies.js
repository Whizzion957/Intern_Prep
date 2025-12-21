require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');

const companies = [
    // Tech Giants
    { name: 'Google' },
    { name: 'Microsoft' },
    { name: 'Amazon' },
    { name: 'Meta' },
    { name: 'Apple' },
    { name: 'Netflix' },

    // Finance
    { name: 'Goldman Sachs' },
    { name: 'Morgan Stanley' },
    { name: 'JP Morgan' },
    { name: 'Deutsche Bank' },
    { name: 'Barclays' },
    { name: 'HSBC' },
    { name: 'Credit Suisse' },
    { name: 'Citi' },

    // Indian Tech
    { name: 'Flipkart' },
    { name: 'Uber' },
    { name: 'Ola' },
    { name: 'Swiggy' },
    { name: 'Zomato' },
    { name: 'Paytm' },
    { name: 'PhonePe' },
    { name: 'Razorpay' },
    { name: 'CRED' },
    { name: 'Groww' },
    { name: 'Zerodha' },
    { name: 'Meesho' },
    { name: 'Dream11' },

    // Enterprise Software
    { name: 'Adobe' },
    { name: 'Oracle' },
    { name: 'SAP Labs' },
    { name: 'Cisco' },
    { name: 'VMware' },
    { name: 'Salesforce' },
    { name: 'ServiceNow' },
    { name: 'Atlassian' },
    { name: 'Intuit' },

    // Consulting
    { name: 'McKinsey' },
    { name: 'BCG' },
    { name: 'Bain & Company' },
    { name: 'Deloitte' },
    { name: 'EY' },
    { name: 'KPMG' },
    { name: 'PwC' },
    { name: 'Accenture' },

    // Hardware/Semiconductor
    { name: 'Qualcomm' },
    { name: 'Samsung' },
    { name: 'Intel' },
    { name: 'Nvidia' },
    { name: 'Texas Instruments' },
    { name: 'AMD' },
    { name: 'Arm' },
    { name: 'Broadcom' },
    { name: 'MediaTek' },

    // Trading Firms
    { name: 'Tower Research Capital' },
    { name: 'DE Shaw' },
    { name: 'Graviton Research' },
    { name: 'Quadeye' },
    { name: 'WorldQuant' },
    { name: 'Optiver' },
    { name: 'Jane Street' },
    { name: 'Citadel' },
    { name: 'Two Sigma' },
    { name: 'Jump Trading' },

    // Others
    { name: 'Uber Eats' },
    { name: 'LinkedIn' },
    { name: 'Twitter' },
    { name: 'Snapchat' },
    { name: 'Spotify' },
    { name: 'Airbnb' },
    { name: 'Stripe' },
    { name: 'Shopify' },
    { name: 'Slack' },
    { name: 'Zoom' },
    { name: 'Databricks' },
    { name: 'Snowflake' },
    { name: 'MongoDB' },
    { name: 'Elastic' },
    { name: 'Confluent' },
    { name: 'HashiCorp' },

    // Indian IT
    { name: 'TCS' },
    { name: 'Infosys' },
    { name: 'Wipro' },
    { name: 'HCL' },
    { name: 'Tech Mahindra' },
    { name: 'Cognizant' },

    // Automotive
    { name: 'Tesla' },
    { name: 'Rivian' },
    { name: 'Waymo' },
    { name: 'General Motors' },
    { name: 'Ford' },

    // Gaming
    { name: 'Electronic Arts' },
    { name: 'Activision' },
    { name: 'Riot Games' },
    { name: 'Epic Games' },
    { name: 'Unity' },
];

const seedCompanies = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for seeding');

        // Create a system user for seeding if not exists
        let systemUser = await User.findOne({ enrollmentNumber: 'SYSTEM' });
        if (!systemUser) {
            systemUser = await User.create({
                enrollmentNumber: 'SYSTEM',
                fullName: 'System',
                branch: 'System',
                email: 'system@iitr.ac.in',
                role: 'user',
            });
            console.log('System user created');
        }

        // Insert companies
        let added = 0;
        let skipped = 0;

        for (const company of companies) {
            const exists = await Company.findOne({
                name: { $regex: `^${company.name}$`, $options: 'i' }
            });

            if (!exists) {
                await Company.create({
                    name: company.name,
                    addedBy: systemUser._id,
                });
                added++;
            } else {
                skipped++;
            }
        }

        console.log(`Seeding complete: ${added} companies added, ${skipped} skipped (already exist)`);
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedCompanies();
