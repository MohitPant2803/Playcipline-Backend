const LEVEL_1_XP = 100;
const EARLY_LEVEL_STEPS = [120, 140, 160, 180, 200, 220, 240, 260, 280];
const POST_LEVEL_10_BASE_STEP = 320;
const POST_LEVEL_10_STEP_GROWTH = 40;

export function getXpRequiredForLevel(level) {
  if (level <= 0) return 0;
  if (level === 1) return LEVEL_1_XP;

  let total = LEVEL_1_XP;
  for (let currentLevel = 1; currentLevel < level; currentLevel++) {
    if (currentLevel <= EARLY_LEVEL_STEPS.length) {
      total += EARLY_LEVEL_STEPS[currentLevel - 1];
    } else {
      total += POST_LEVEL_10_BASE_STEP + ((currentLevel - EARLY_LEVEL_STEPS.length - 1) * POST_LEVEL_10_STEP_GROWTH);
    }
  }

  return total;
}

export function getLevelInfo(totalXP = 0) {
  const safeXp = Math.max(0, totalXP);
  let level = 0;

  while (safeXp >= getXpRequiredForLevel(level + 1)) {
    level++;
  }

  const currentLevelXp = getXpRequiredForLevel(level);
  const nextLevelXp = getXpRequiredForLevel(level + 1);

  return {
    level,
    totalXP: safeXp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: safeXp - currentLevelXp,
    xpNeededForNextLevel: nextLevelXp - safeXp,
    xpRange: nextLevelXp - currentLevelXp
  };
}

export function getLevelGuide(maxLevel = 10) {
  return Array.from({ length: maxLevel }, (_, index) => {
    const level = index + 1;
    return {
      level,
      totalXPRequired: getXpRequiredForLevel(level),
      xpToNextLevel: getXpRequiredForLevel(level + 1) - getXpRequiredForLevel(level)
    };
  });
}
