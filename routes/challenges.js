import express from 'express';
import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();
const MAX_ACTIVE_CHALLENGES = 3;
const DEFAULT_CHALLENGES = [
  { _id: '100000000000000000000001', title: '75 Hard Challenge', description: 'Two workouts, a gallon of water, 10 pages of reading, no cheat meals, progress pic daily. No compromises.', duration: 75, baseDifficulty: 3, category: 'Fitness', tags: ['Hardcore', 'Trending'], isPublic: true },
  { _id: '100000000000000000000002', title: '30-Day Push-Up Progression', description: 'Build upper body strength by following a progressive push-up plan for 30 days.', duration: 30, baseDifficulty: 2, category: 'Fitness', tags: ['Strength'], isPublic: true },
  { _id: '100000000000000000000003', title: 'Cold Shower 21-Day Challenge', description: 'Build mental resilience and boost your energy by taking a cold shower every day for 21 days.', duration: 21, baseDifficulty: 2, category: 'Fitness', tags: ['Discipline', 'Reset'], isPublic: true },
  { _id: '100000000000000000000004', title: '10,000 Steps Daily', description: 'Improve your overall health and activity levels by walking at least 10,000 steps every day.', duration: 30, baseDifficulty: 1, category: 'Fitness', tags: ['Activity', 'Beginner'], isPublic: true },
  { _id: '100000000000000000000005', title: 'No Junk Food 30 Days', description: 'Reset your diet and break bad habits by eliminating all junk food for 30 days.', duration: 30, baseDifficulty: 2, category: 'Fitness', tags: ['Nutrition', 'Reset'], isPublic: true },
  { _id: '100000000000000000000006', title: 'Sleep Optimization Protocol', description: 'Improve your sleep quality and energy levels by following a strict sleep hygiene protocol for 21 days.', duration: 21, baseDifficulty: 2, category: 'Fitness', tags: ['Recovery', 'Health'], isPublic: true },
  { _id: '100000000000000000000007', title: 'Morning Workout Streak', description: 'Start your day strong by completing a workout every morning for 30 days straight.', duration: 30, baseDifficulty: 2, category: 'Fitness', tags: ['Habit', 'Fitness'], isPublic: true },
  { _id: '100000000000000000000008', title: 'Winter Arc (Bulk & Build)', description: 'Use the winter season to build serious muscle and strength. A 90-day plan for bulking and building.', duration: 90, baseDifficulty: 3, category: 'Fitness', tags: ['Seasonal', 'Body'], isPublic: true },
  { _id: '100000000000000000000009', title: 'Summer Shred Challenge', description: 'Get lean and defined for the summer. A 90-day challenge focused on fat loss and conditioning.', duration: 90, baseDifficulty: 3, category: 'Fitness', tags: ['Seasonal', 'Body'], isPublic: true },
  { _id: '100000000000000000000010', title: 'Hydration Reset (3L/day)', description: 'Boost your energy and health by ensuring you drink at least 3 liters of water every day.', duration: 14, baseDifficulty: 1, category: 'Fitness', tags: ['Health', 'Beginner'], isPublic: true },
  { _id: '100000000000000000000011', title: 'Intermittent Fasting Sprint', description: 'Experiment with intermittent fasting to improve metabolic health and discipline. 14-day sprint.', duration: 14, baseDifficulty: 2, category: 'Fitness', tags: ['Nutrition', 'Intermediate'], isPublic: true },
  { _id: '100000000000000000000012', title: '6-Week Body Recomposition', description: 'A 6-week intensive program to simultaneously build muscle and lose fat.', duration: 42, baseDifficulty: 3, category: 'Fitness', tags: ['Transformation', 'Hardcore'], isPublic: true },
  { _id: '100000000000000000000013', title: 'Dopamine Detox', description: 'Starve your brain of cheap pleasure. No scrolling, junk food, or mindless entertainment. Reset your receptors.', duration: 7, baseDifficulty: 2, category: 'Mind', tags: ['Reset', 'Discipline'], isPublic: true },
  { _id: '100000000000000000000014', title: 'No Social Media 30-Day Challenge', description: 'Delete the apps. Reclaim your attention span and reconnect with the real world around you.', duration: 30, baseDifficulty: 2, category: 'Mind', tags: ['Digital Minimalism'], isPublic: true },
  { _id: '100000000000000000000015', title: '30-Day Meditation Streak', description: 'Cultivate inner peace and focus by meditating every day for 30 days.', duration: 30, baseDifficulty: 1, category: 'Mind', tags: ['Habit', 'Mindfulness'], isPublic: true },
  { _id: '100000000000000000000016', title: 'Journaling Every Day for 21 Days', description: 'Gain mental clarity and self-awareness by journaling your thoughts every day for 21 days.', duration: 21, baseDifficulty: 1, category: 'Mind', tags: ['Clarity', 'Habit'], isPublic: true },
  { _id: '100000000000000000000017', title: 'Digital Minimalism Challenge', description: 'Radically reduce your digital consumption and reclaim your time and attention.', duration: 30, baseDifficulty: 2, category: 'Mind', tags: ['Focus', 'Lifestyle'], isPublic: true },
  { _id: '100000000000000000000018', title: 'Read 1 Book Per Week', description: 'Expand your mind by committing to reading one full book every week for a month.', duration: 28, baseDifficulty: 2, category: 'Mind', tags: ['Learning', 'Knowledge'], isPublic: true },
  { _id: '100000000000000000000019', title: 'Focus Blocks (90-min deep sessions)', description: 'Train your focus by completing one uninterrupted 90-minute deep work session daily.', duration: 14, baseDifficulty: 2, category: 'Mind', tags: ['Productivity', 'Deep Work'], isPublic: true },
  { _id: '100000000000000000000020', title: 'No Negativity 30 Days', description: 'Rewire your brain for positivity by consciously avoiding all forms of negative self-talk and complaining.', duration: 30, baseDifficulty: 2, category: 'Mind', tags: ['Mindset', 'Positive Psychology'], isPublic: true },
  { _id: '100000000000000000000021', title: 'Gratitude Practice 21 Days', description: 'Improve your well-being by writing down three things you are grateful for each day.', duration: 21, baseDifficulty: 1, category: 'Mind', tags: ['Mindset', 'Beginner'], isPublic: true },
  { _id: '100000000000000000000022', title: 'Stoicism 30-Day Practice', description: 'Apply stoic principles to your daily life to build emotional resilience and wisdom.', duration: 30, baseDifficulty: 2, category: 'Mind', tags: ['Philosophy', 'Resilience'], isPublic: true },
  { _id: '100000000000000000000023', title: 'Brain Dump + Mental Clarity Reset', description: 'A 7-day challenge to clear your mind by externalizing all your thoughts, tasks, and worries.', duration: 7, baseDifficulty: 1, category: 'Mind', tags: ['Clarity', 'Reset'], isPublic: true },
  { _id: '100000000000000000000024', title: '7-Day Silence Challenge', description: 'Experience profound inner quiet and self-reflection by committing to a week of silence.', duration: 7, baseDifficulty: 3, category: 'Mind', tags: ['Hardcore', 'Mindfulness'], isPublic: true },
  { _id: '100000000000000000000025', title: 'Deep Work Sprint', description: 'Achieve massive output by dedicating 4 hours to uninterrupted deep work every day for 30 days.', duration: 30, baseDifficulty: 3, category: 'Work', tags: ['Productivity', 'Hardcore'], isPublic: true },
  { _id: '100000000000000000000026', title: 'Learn One Skill in 30 Days', description: 'Dedicate focused effort to acquiring a new valuable skill in just 30 days.', duration: 30, baseDifficulty: 2, category: 'Work', tags: ['Skill', 'Growth'], isPublic: true },
  { _id: '100000000000000000000027', title: 'Ship One Project in 30 Days', description: 'Go from idea to launch. Build and ship a personal or professional project in 30 days.', duration: 30, baseDifficulty: 2, category: 'Work', tags: ['Execution', 'Project'], isPublic: true },
  { _id: '100000000000000000000028', title: 'No Procrastination Week', description: 'Break the cycle of procrastination by tackling tasks immediately for one full week.', duration: 7, baseDifficulty: 2, category: 'Work', tags: ['Productivity', 'Reset'], isPublic: true },
  { _id: '100000000000000000000029', title: 'Inbox Zero Challenge', description: 'Reclaim control over your email by achieving and maintaining an empty inbox for 7 days.', duration: 7, baseDifficulty: 1, category: 'Work', tags: ['Organization', 'Productivity'], isPublic: true },
  { _id: '100000000000000000000030', title: '90-Day Career Leveling Plan', description: 'Execute a 90-day strategic plan to significantly advance your career and skills.', duration: 90, baseDifficulty: 3, category: 'Work', tags: ['Career', 'Growth'], isPublic: true },
  { _id: '100000000000000000000031', title: 'Wake Up at 5 AM for 21 Days', description: 'Build an iron will and gain extra productive hours by waking up at 5 AM every day.', duration: 21, baseDifficulty: 2, category: 'Work', tags: ['Discipline', 'Habit'], isPublic: true },
  { _id: '100000000000000000000032', title: 'Time Audit Week', description: 'Track every minute of your time for a week to understand where it goes and how to optimize it.', duration: 7, baseDifficulty: 1, category: 'Work', tags: ['Productivity', 'Clarity'], isPublic: true },
  { _id: '100000000000000000000033', title: 'No Meetings Week (async only)', description: 'Experience a full week of deep work by replacing all meetings with asynchronous communication.', duration: 7, baseDifficulty: 2, category: 'Work', tags: ['Productivity', 'Focus'], isPublic: true },
  { _id: '100000000000000000000034', title: 'Build in Public 30-Day Challenge', description: 'Share your progress, wins, and losses publicly as you build a project for 30 days.', duration: 30, baseDifficulty: 2, category: 'Work', tags: ['Accountability', 'Project'], isPublic: true },
  { _id: '100000000000000000000035', title: 'Side Project Launch Challenge', description: 'Take a side project from concept to launch in 30 days. No excuses.', duration: 30, baseDifficulty: 3, category: 'Work', tags: ['Execution', 'Entrepreneurship'], isPublic: true },
  { _id: '100000000000000000000036', title: '100-Day Consistency Sprint', description: 'Prove your commitment by showing up and doing the work on one key goal for 100 days straight.', duration: 100, baseDifficulty: 3, category: 'Work', tags: ['Discipline', 'Hardcore'], isPublic: true },
  { _id: '100000000000000000000037', title: 'Reach Out to 1 Person Daily', description: 'Strengthen your network and relationships by intentionally reaching out to one person every day.', duration: 30, baseDifficulty: 1, category: 'Social', tags: ['Networking', 'Connection'], isPublic: true },
  { _id: '100000000000000000000038', title: 'No Phone During Meals (30 Days)', description: 'Be more present with your food and companions by putting your phone away during all meals.', duration: 30, baseDifficulty: 1, category: 'Social', tags: ['Presence', 'Habit'], isPublic: true },
  { _id: '100000000000000000000039', title: 'Compliment Someone Every Day', description: 'Brighten someone\'s day and build positive social habits by giving a genuine compliment daily.', duration: 21, baseDifficulty: 1, category: 'Social', tags: ['Positivity', 'Connection'], isPublic: true },
  { _id: '100000000000000000000040', title: 'Reconnect with 5 Old Friends', description: 'Rekindle old friendships by reaching out to 5 people you\'ve lost touch with over 14 days.', duration: 14, baseDifficulty: 1, category: 'Social', tags: ['Relationships', 'Connection'], isPublic: true },
  { _id: '100000000000000000000041', title: 'Say No 30-Day Boundary Challenge', description: 'Learn to protect your time and energy by practicing saying \'no\' to non-essential requests.', duration: 30, baseDifficulty: 2, category: 'Social', tags: ['Boundaries', 'Self-respect'], isPublic: true },
  { _id: '100000000000000000000042', title: 'Public Speaking Practice (weekly)', description: 'Overcome your fear of public speaking by practicing once a week for a month.', duration: 28, baseDifficulty: 2, category: 'Social', tags: ['Confidence', 'Skill'], isPublic: true },
  { _id: '100000000000000000000043', title: 'Weekly Date/Quality Time Commitment', description: 'Nurture your primary relationship by committing to one dedicated block of quality time each week.', duration: 28, baseDifficulty: 1, category: 'Social', tags: ['Relationships', 'Connection'], isPublic: true },
  { _id: '100000000000000000000044', title: 'Network: Message 1 New Person Daily', description: 'Expand your professional circle by sending a thoughtful message to one new person in your field daily.', duration: 30, baseDifficulty: 2, category: 'Social', tags: ['Networking', 'Career'], isPublic: true },
  { _id: '100000000000000000000045', title: 'Gratitude Letters (write 10 in 30 days)', description: 'Deepen your relationships by writing and sending 10 heartfelt gratitude letters.', duration: 30, baseDifficulty: 1, category: 'Social', tags: ['Relationships', 'Gratitude'], isPublic: true },
  { _id: '100000000000000000000046', title: 'Listen More Challenge (30 days, no interrupting)', description: 'Become a better communicator by practicing active listening and not interrupting others.', duration: 30, baseDifficulty: 2, category: 'Social', tags: ['Communication', 'Presence'], isPublic: true },
  { _id: '100000000000000000000047', title: 'Social Confidence 21-Day Sprint', description: 'Systematically build your social confidence through a series of daily challenges.', duration: 21, baseDifficulty: 2, category: 'Social', tags: ['Confidence', 'Growth'], isPublic: true },
  { _id: '100000000000000000000048', title: 'Mentor Someone for 30 Days', description: 'Give back and develop your leadership skills by mentoring someone for 30 days.', duration: 30, baseDifficulty: 2, category: 'Social', tags: ['Leadership', 'Contribution'], isPublic: true },
  { _id: '100000000000000000000049', title: 'Monk Mode 30-Day Challenge', description: 'A period of intense focus and discipline. Isolate yourself from distractions and work on your goals.', duration: 30, baseDifficulty: 3, category: 'Lifestyle', tags: ['Discipline', 'Hardcore'], isPublic: true },
  { _id: '100000000000000000000050', title: 'Clean Space Every Night (21 Days)', description: 'Bring order to your environment and mind by tidying up your space every night before bed.', duration: 21, baseDifficulty: 1, category: 'Lifestyle', tags: ['Habit', 'Organization'], isPublic: true },
  { _id: '100000000000000000000051', title: 'No Alcohol 30 Days', description: 'Experience improved clarity, energy, and health by abstaining from alcohol for 30 days.', duration: 30, baseDifficulty: 2, category: 'Lifestyle', tags: ['Health', 'Reset'], isPublic: true },
  { _id: '100000000000000000000052', title: 'No Porn / NoFap 90-Day Reset', description: 'Reclaim your focus, energy, and sexual health with a 90-day reset from porn and masturbation.', duration: 90, baseDifficulty: 3, category: 'Lifestyle', tags: ['Discipline', 'Hardcore'], isPublic: true },
  { _id: '100000000000000000000053', title: 'Financial Audit + No Spend Week', description: 'Gain control of your finances by auditing your spending and completing a \'no spend\' week.', duration: 7, baseDifficulty: 2, category: 'Lifestyle', tags: ['Finance', 'Reset'], isPublic: true },
  { _id: '100000000000000000000054', title: 'Morning Routine Lock-In (21 Days)', description: 'Design and execute your ideal morning routine without fail for 21 days to lock it in.', duration: 21, baseDifficulty: 2, category: 'Lifestyle', tags: ['Habit', 'Productivity'], isPublic: true },
  { _id: '100000000000000000000055', title: 'Night Routine Challenge', description: 'Optimize your sleep and recovery by creating and sticking to a relaxing night routine.', duration: 21, baseDifficulty: 1, category: 'Lifestyle', tags: ['Habit', 'Sleep'], isPublic: true },
  { _id: '100000000000000000000056', title: 'Minimalism 30-Day Declutter', description: 'Simplify your life and reduce stress by decluttering one area of your home each day.', duration: 30, baseDifficulty: 2, category: 'Lifestyle', tags: ['Minimalism', 'Organization'], isPublic: true },
  { _id: '100000000000000000000057', title: 'Screen Time Under 2 Hours Daily', description: 'Reclaim your time and attention by limiting non-work screen time to under 2 hours per day.', duration: 30, baseDifficulty: 2, category: 'Lifestyle', tags: ['Digital Minimalism', 'Focus'], isPublic: true },
  { _id: '100000000000000000000058', title: 'Cook Every Meal for 30 Days', description: 'Take full control of your diet and improve your cooking skills by preparing every meal at home.', duration: 30, baseDifficulty: 2, category: 'Lifestyle', tags: ['Nutrition', 'Skill'], isPublic: true },
  { _id: '100000000000000000000059', title: 'No Complaining 21-Day Challenge', description: 'Rewire your brain for proactivity and positivity by eliminating all complaining for 21 days.', duration: 21, baseDifficulty: 2, category: 'Lifestyle', tags: ['Mindset', 'Positivity'], isPublic: true },
  { _id: '100000000000000000000060', title: 'Capsule Wardrobe Challenge', description: 'Simplify your life and reduce decision fatigue by living with a limited, curated wardrobe for 30 days.', duration: 30, baseDifficulty: 1, category: 'Lifestyle', tags: ['Minimalism', 'Simplicity'], isPublic: true },
  { _id: '100000000000000000000061', title: 'Identity Reset 21-Day Challenge', description: 'A 21-day deep dive to consciously redefine and step into your desired identity.', duration: 21, baseDifficulty: 3, category: 'Purpose', tags: ['Transformation', 'Identity'], isPublic: true },
  { _id: '100000000000000000000062', title: 'Hero Arc Journey', description: 'Frame your self-improvement as a hero\'s journey, with clear stages, trials, and triumphs.', duration: 90, baseDifficulty: 3, category: 'Purpose', tags: ['Story', 'Transformation'], isPublic: true },
  { _id: '100000000000000000000063', title: 'Define Your 5-Year Vision', description: 'Dedicate a week of deep work to create a clear and compelling vision for your life in 5 years.', duration: 7, baseDifficulty: 2, category: 'Purpose', tags: ['Clarity', 'Vision'], isPublic: true },
  { _id: '100000000000000000000064', title: 'Ikigai Discovery Challenge', description: 'A 14-day guided process to find your Ikigai - your reason for being.', duration: 14, baseDifficulty: 2, category: 'Purpose', tags: ['Purpose', 'Clarity'], isPublic: true },
  { _id: '100000000000000000000065', title: 'Value Clarification Week', description: 'Spend a week identifying and prioritizing your core values to guide your decisions.', duration: 7, baseDifficulty: 1, category: 'Purpose', tags: ['Clarity', 'Values'], isPublic: true },
  { _id: '100000000000000000000066', title: 'Create Your Personal Mission Statement', description: 'Craft a powerful personal mission statement that acts as your life\'s constitution.', duration: 7, baseDifficulty: 1, category: 'Purpose', tags: ['Vision', 'Clarity'], isPublic: true },
  { _id: '100000000000000000000067', title: 'Fear-Facing 30-Day Challenge', description: 'Systematically identify and face your fears, big and small, every day for 30 days.', duration: 30, baseDifficulty: 3, category: 'Purpose', tags: ['Courage', 'Growth'], isPublic: true },
  { _id: '100000000000000000000068', title: 'Legacy Building 90-Day Plan', description: 'A 90-day sprint to start building a project or body of work that will outlast you.', duration: 90, baseDifficulty: 3, category: 'Purpose', tags: ['Vision', 'Impact'], isPublic: true },
  { _id: '100000000000000000000069', title: 'Gratitude + Abundance Mindset 30 Days', description: 'Shift from a scarcity to an abundance mindset through daily gratitude and visualization practices.', duration: 30, baseDifficulty: 1, category: 'Purpose', tags: ['Mindset', 'Gratitude'], isPublic: true },
  { _id: '100000000000000000000070', title: 'Life Audit (all 6 domains in one week)', description: 'A comprehensive one-week audit of all major life domains to identify strengths and areas for growth.', duration: 7, baseDifficulty: 2, category: 'Purpose', tags: ['Clarity', 'Reset'], isPublic: true },
  { _id: '100000000000000000000071', title: 'Forgiveness & Letting Go 21 Days', description: 'A 21-day practice to release past grudges and emotional baggage for greater peace.', duration: 21, baseDifficulty: 2, category: 'Purpose', tags: ['Healing', 'Mindset'], isPublic: true },
  { _id: '100000000000000000000072', title: 'Design Your Ideal Day', description: 'Consciously design your perfect daily schedule and then live it out for 30 consecutive days.', duration: 30, baseDifficulty: 2, category: 'Purpose', tags: ['Lifestyle', 'Design'], isPublic: true }
];

let defaultChallengesEnsured = false;

async function ensureDefaultChallenges() {
  if (defaultChallengesEnsured) return;
  
  for (const challenge of DEFAULT_CHALLENGES) {
    await Challenge.updateOne(
      { _id: challenge._id },
      { $set: challenge },
      { upsert: true, strict: false }
    );
  }
  
  defaultChallengesEnsured = true;
}

async function enrollInChallenge({ userId, challengeId, mode }) {
  if (!['easy', 'medium', 'hard'].includes(mode)) {
    const err = new Error('Invalid mode');
    err.status = 400;
    throw err;
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    const err = new Error('Challenge not found');
    err.status = 404;
    throw err;
  }

  const existing = await UserChallenge.findOne({
    userId,
    challengeId,
    status: 'active'
  });
  if (existing) {
    const err = new Error('Already have an active version of this challenge');
    err.status = 400;
    throw err;
  }

  const activeCount = await UserChallenge.countDocuments({
    userId,
    status: 'active'
  });
  if (activeCount >= MAX_ACTIVE_CHALLENGES) {
    const err = new Error(`You can only have ${MAX_ACTIVE_CHALLENGES} active challenges at a time`);
    err.status = 400;
    throw err;
  }

  const durationMap = { easy: Math.floor(challenge.duration * 0.6), medium: Math.floor(challenge.duration * 0.8), hard: challenge.duration };
  const userChallenge = new UserChallenge({
    userId,
    challengeId,
    mode,
    startDate: new Date(),
    requiredDays: durationMap[mode]
  });

  await userChallenge.save();
  await userChallenge.populate('challengeId');
  return userChallenge;
}

// Get all public challenges - PUBLIC, no auth required
router.get('/', async (req, res) => {
  try {
    await ensureDefaultChallenges();
    const challenges = await Challenge.find({ isPublic: true }).lean();
    res.json(challenges);
  } catch (err) {
    console.error('Error fetching challenges:', err.message);
    res.status(500).json({ error: 'Failed to load challenges', details: err.message });
  }
});

// Get public challenges with current user's active enrollment state.
router.get('/enrollable', verifyJWT, async (req, res) => {
  try {
    await ensureDefaultChallenges();
    const [challenges, activeEnrollments] = await Promise.all([
      Challenge.find({ isPublic: true }).lean(),
      UserChallenge.find({ userId: req.user._id, status: 'active' }).lean()
    ]);

    const enrollmentsByChallengeId = new Map(
      activeEnrollments.map(enrollment => [enrollment.challengeId.toString(), enrollment])
    );

    res.json(challenges.map(challenge => {
      const enrollment = enrollmentsByChallengeId.get(challenge._id.toString());
      return {
        ...challenge,
        isJoined: !!enrollment,
        enrollmentId: enrollment?._id || null,
        enrollmentMode: enrollment?.mode || null,
        activeEnrollmentCount: activeEnrollments.length,
        maxActiveChallenges: MAX_ACTIVE_CHALLENGES
      };
    }));
  } catch (err) {
    console.error('Error fetching enrollable challenges:', err.message);
    res.status(500).json({ error: 'Failed to load challenges', details: err.message });
  }
});

// Get user's active challenges - REQUIRES LOGIN
router.get('/my-challenges', verifyJWT, async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({ userId: req.user._id })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    console.error('Error fetching user challenges:', err.message);
    res.status(500).json({ error: 'Failed to load user challenges', details: err.message });
  }
});

// Get specific user's completed challenges - PUBLIC, no auth required
router.get('/user/:userId/completed', async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({
      userId: req.params.userId,
      status: 'completed'
    })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    console.error('Error fetching completed challenges:', err.message);
    res.status(500).json({ error: 'Failed to load completed challenges', details: err.message });
  }
});

// Get specific user's active challenges - PUBLIC, no auth required
router.get('/user/:userId/active', async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({
      userId: req.params.userId,
      status: 'active'
    })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    console.error('Error fetching active challenges:', err.message);
    res.status(500).json({ error: 'Failed to load active challenges', details: err.message });
  }
});

// Join a challenge - REQUIRES LOGIN
router.post('/:id/join', verifyJWT, async (req, res) => {
  try {
    const userChallenge = await enrollInChallenge({
      userId: req.user._id,
      challengeId: req.params.id,
      mode: req.body.mode
    });
    res.status(201).json(userChallenge);
  } catch (err) {
    console.error('Error joining challenge:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to join challenge', details: err.message });
  }
});

router.post('/enroll', verifyJWT, async (req, res) => {
  try {
    const userChallenge = await enrollInChallenge({
      userId: req.user._id,
      challengeId: req.body.challengeId,
      mode: req.body.mode
    });
    res.status(201).json(userChallenge);
  } catch (err) {
    console.error('Error enrolling challenge:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to enroll challenge', details: err.message });
  }
});

router.delete('/enroll/:userChallengeId', verifyJWT, async (req, res) => {
  try {
    const userChallenge = await UserChallenge.findById(req.params.userChallengeId);
    if (!userChallenge) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    if (userChallenge.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (userChallenge.status === 'completed') {
      return res.status(400).json({ error: 'Completed challenges cannot be de-enrolled' });
    }
    if (userChallenge.status !== 'active') {
      return res.status(400).json({ error: 'This challenge is no longer active' });
    }

    userChallenge.status = 'abandoned';
    await userChallenge.save();

    res.json({ success: true, userChallenge });
  } catch (err) {
    console.error('Error de-enrolling challenge:', err.message);
    res.status(500).json({ error: 'Failed to de-enroll challenge', details: err.message });
  }
});

export default router;
