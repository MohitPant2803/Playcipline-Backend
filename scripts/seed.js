import mongoose from 'mongoose';
import Challenge from '../models/Challenge.js';
import dotenv from 'dotenv';

dotenv.config();

const seedChallenges = [
  { title: "No Sugar", description: "Eliminate added sugar from your diet", duration: 7, baseDifficulty: 2 },
  { title: "Daily Meditation", description: "10 minutes of mindfulness every day", duration: 21, baseDifficulty: 1 },
  { title: "75 Hard", description: "Follow the 75 Hard protocol every day", duration: 75, baseDifficulty: 3 },
  { title: "Cold Shower", description: "End every shower with 60 seconds cold", duration: 21, baseDifficulty: 2 },
  { title: "No Social Media", description: "No Instagram, Twitter, or TikTok", duration: 7, baseDifficulty: 1 },
  { title: "Daily Run", description: "Run at least 2km every single day", duration: 21, baseDifficulty: 2 }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingCount = await Challenge.countDocuments();
    if (existingCount > 0) {
      console.log('Challenges already exist, skipping seed');
      process.exit(0);
    }

    await Challenge.insertMany(seedChallenges);
    console.log('Seeded challenges successfully');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
