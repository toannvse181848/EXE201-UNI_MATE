/**
 * Matching Algorithm Utility for UNI-MATE
 * Weighted Hybrid Model:
 * - 35% Jaccard Interest Similarity
 * - 25% Objective Compatibility
 * - 20% Academic Alignment (University + Major)
 * - 10% Study Habits (Time Slots + Space Preference)
 * - 10% Distance Preference
 */

const jaccardSimilarity = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map(x => String(x).toLowerCase().trim()));
  const setB = new Set(b.map(x => String(x).toLowerCase().trim()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const COMPATIBLE_OBJECTIVES = {
  study_buddy:  ['study_buddy', 'certificate', 'study'],
  study:        ['study', 'study_buddy', 'certificate'],
  project:      ['project', 'study_buddy', 'study'],
  certificate:  ['certificate', 'study_buddy', 'study'],
  activities:   ['activities', 'hangout', 'sports'],
  hangout:      ['hangout', 'activities', 'cafe'],
  cafe:         ['cafe', 'hangout', 'study_buddy'],
  sports:       ['sports', 'activities'],
  workshop:     ['workshop', 'project', 'study_buddy'],
};

const objectiveScore = (myObjs = [], theirObjs = []) => {
  if (!Array.isArray(myObjs) || !Array.isArray(theirObjs)) return 0.5;
  if (myObjs.length === 0 || theirObjs.length === 0) return 0.5;
  let best = 0;
  for (const mine of myObjs) {
    for (const theirs of theirObjs) {
      if (mine === theirs) {
        best = Math.max(best, 1.0);
      } else if (COMPATIBLE_OBJECTIVES[mine]?.includes(theirs)) {
        best = Math.max(best, 0.75);
      }
    }
  }
  return best > 0 ? best : 0.4;
};

const academicScore = (me = {}, them = {}) => {
  let score = 0;
  if (me.university && them.university && me.university.toLowerCase().trim() === them.university.toLowerCase().trim()) {
    score += 0.5;
  }
  if (me.major && them.major && me.major.toLowerCase().trim() === them.major.toLowerCase().trim()) {
    score += 0.5;
  }
  return score;
};

const habitScore = (myHabits = {}, theirHabits = {}) => {
  const timeScore = jaccardSimilarity(myHabits?.timeSlots || [], theirHabits?.timeSlots || []);
  const mySpace = myHabits?.spaceType || 'any';
  const theirSpace = theirHabits?.spaceType || 'any';
  const spaceScore = (mySpace === 'any' || theirSpace === 'any' || mySpace === theirSpace) ? 1 : 0.4;
  return (timeScore * 0.6) + (spaceScore * 0.4);
};

const WEIGHTS = {
  interests:  0.35,
  objective:  0.25,
  academic:   0.20,
  habit:      0.10,
  distance:   0.10,
};

const computeMatchScore = (me, them) => {
  const me_sp  = me?.studentProfile  || {};
  const th_sp  = them?.studentProfile || {};

  const s_interests = jaccardSimilarity(me_sp.interests || [], th_sp.interests || []);
  const s_objective = objectiveScore(me_sp.objectives || [], th_sp.objectives || []);
  const s_academic  = academicScore(me_sp, th_sp);
  const s_habit     = habitScore(me_sp.studyHabits, th_sp.studyHabits);

  const myDist   = me_sp.distancePreference  || 5;
  const theirDist = th_sp.distancePreference || 5;
  const s_distance = Math.min(myDist, theirDist) >= 5 ? 1 : 0.6;

  const rawScore =
    WEIGHTS.interests * s_interests +
    WEIGHTS.objective * s_objective +
    WEIGHTS.academic  * s_academic  +
    WEIGHTS.habit     * s_habit     +
    WEIGHTS.distance  * s_distance;

  // Đảm bảo điểm nằm trong khoảng 50 - 99% để tạo động lực kết nối tích cực
  const scaled = Math.round(50 + rawScore * 48);
  return Math.min(Math.max(scaled, 50), 99);
};

const commonInterests = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return [];
  const setB = new Set(b.map(x => String(x).toLowerCase().trim()));
  return a.filter((x) => setB.has(String(x).toLowerCase().trim()));
};

module.exports = {
  computeMatchScore,
  commonInterests,
  jaccardSimilarity,
  objectiveScore,
  academicScore,
  habitScore,
};
