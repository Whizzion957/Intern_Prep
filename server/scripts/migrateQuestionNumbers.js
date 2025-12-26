/**
 * Migration Script: Assign Question Numbers
 * 
 * This script assigns sequential question numbers to existing questions,
 * grouped by company and ordered by creation date.
 * 
 * Run with: node scripts/migrateQuestionNumbers.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Question = require('../models/Question');

const migrateQuestionNumbers = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('ERROR: No MongoDB URI found in environment variables.');
            console.error('Please ensure MONGO_URI or MONGODB_URI is set in your .env file.');
            process.exit(1);
        }

        // Connect to database
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Get all unique company IDs
        const companies = await Question.distinct('company');
        console.log(`Found ${companies.length} companies with questions`);

        let totalUpdated = 0;

        for (const companyId of companies) {
            // Get all questions for this company, ordered by creation date
            const questions = await Question.find({ company: companyId })
                .sort({ createdAt: 1 })
                .select('_id questionNumber');

            console.log(`Processing company ${companyId}: ${questions.length} questions`);

            // Assign sequential numbers
            for (let i = 0; i < questions.length; i++) {
                const questionNumber = i + 1;

                // Only update if number is different or null
                if (questions[i].questionNumber !== questionNumber) {
                    await Question.findByIdAndUpdate(questions[i]._id, {
                        questionNumber: questionNumber
                    });
                    totalUpdated++;
                }
            }
        }

        console.log(`\nMigration complete! Updated ${totalUpdated} questions.`);

        // Disconnect
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

migrateQuestionNumbers();
