/**
 * Scheduled jobs for the application
 */
import cron from 'node-cron';
import User from '../models/User.js';
import { getWeekStart } from '../utils/weeklyReset.js';

let cronJobs = [];

/**
 * Initialize all scheduled jobs
 */
export const initializeJobs = () => {
  console.log('Initializing scheduled jobs...');
  
  // Run every Sunday at 00:00:00 UTC
  // Schedule: "0 0 * * 0" means at 00:00 on Sunday
  const weeklyResetJob = cron.schedule('0 0 * * 0', async () => {
    try {
      console.log('🔄 Running weekly leaderboard reset job...');
      const currentWeekStart = getWeekStart();
      
      const result = await User.updateMany(
        {},
        { 
          $set: { 
            weeklyXP: 0,
            lastWeeklyReset: currentWeekStart
          }
        }
      );
      
      console.log(`✅ Weekly reset complete: ${result.modifiedCount} users updated`);
    } catch (err) {
      console.error('❌ Error in weekly reset job:', err.message);
    }
  });

  cronJobs.push(weeklyResetJob);
  console.log('✅ Weekly reset job scheduled for every Sunday 00:00 UTC');

  // Optional: Run every hour to catch users who need reset
  const checkResetJob = cron.schedule('0 * * * *', async () => {
    try {
      const currentWeekStart = getWeekStart();
      const result = await User.updateMany(
        { lastWeeklyReset: { $lt: currentWeekStart } },
        { 
          $set: { 
            weeklyXP: 0,
            lastWeeklyReset: currentWeekStart
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🔄 Hourly reset check: ${result.modifiedCount} users caught and reset`);
      }
    } catch (err) {
      console.error('❌ Error in hourly reset check:', err.message);
    }
  });

  cronJobs.push(checkResetJob);
  console.log('✅ Hourly reset check scheduled');
};

/**
 * Gracefully stop all jobs
 */
export const stopJobs = () => {
  cronJobs.forEach(job => job.stop());
  console.log('✅ All scheduled jobs stopped');
};

export default { initializeJobs, stopJobs };
