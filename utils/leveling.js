const EARLY_LEVEL_STEPS = [20, 25, 35, 50];
const POST_WEEK_BASE_STEP = 90;
const POST_WEEK_STEP_GROWTH = 30;

export function getXpRequiredForLevel(level) {
  if (level <= 1) return 0;

  let total = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel++) {
    if (currentLevel <= EARLY_LEVEL_STEPS.length) {
      total += EARLY_LEVEL_STEPS[currentLevel - 1];
    } else {
      total += POST_WEEK_BASE_STEP + ((currentLevel - EARLY_LEVEL_STEPS.length - 1) * POST_WEEK_STEP_GROWTH);
    }
  }

  return total;
}

export function getLevelInfo(totalXP = 0) {
  const safeXp = Math.max(0, totalXP);
  let level = 1;

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
