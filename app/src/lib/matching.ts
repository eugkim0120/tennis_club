import { getDb } from "./db";
import crypto from "crypto";
const uuid = () => crypto.randomUUID();
import { Profile, getAllProfiles } from "./profiles";

export interface MatchInterest {
  id: string;
  profile_id: string;
  target_profile_id: string;
  score: number;
  status: "suggested" | "interested" | "passed" | "mutual";
  created_at: string;
}

export interface ScoredMatch {
  profile: Profile;
  score: number;
  breakdown: {
    criteria: number;
    skill: number;
    behavioral: number;
  };
}

/**
 * Hinge-style standout matching. Computes a composite score from:
 * 1) Criteria match (age range, languages overlap)
 * 2) Skill similarity
 * 3) Behavioral similarity (shared match patterns)
 */
export function computeStandouts(profileId: string, limit = 10): ScoredMatch[] {
  const allProfiles = getAllProfiles();
  const me = allProfiles.find((p) => p.id === profileId);
  if (!me) return [];

  const candidates = allProfiles.filter((p) => p.id !== profileId);
  const scored: ScoredMatch[] = candidates.map((candidate) => {
    const criteria = scoreCriteria(me, candidate);
    const skill = scoreSkill(me, candidate);
    const behavioral = scoreBehavioral(me, candidate);

    const score = criteria * 0.3 + skill * 0.4 + behavioral * 0.3;

    return {
      profile: candidate,
      score,
      breakdown: { criteria, skill, behavioral },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function scoreCriteria(me: Profile, them: Profile): number {
  let score = 0;

  // Age within preferred range (bidirectional)
  const meInTheirRange = them.age >= me.preferred_age_min && them.age <= me.preferred_age_max;
  const themInMyRange = me.age >= them.preferred_age_min && me.age <= them.preferred_age_max;
  if (meInTheirRange && themInMyRange) score += 0.5;
  else if (meInTheirRange || themInMyRange) score += 0.25;

  // Language overlap
  const myLangs = new Set(me.languages.map((l) => l.toLowerCase()));
  const theirLangs = them.languages.map((l) => l.toLowerCase());
  const overlap = theirLangs.filter((l) => myLangs.has(l)).length;
  const total = new Set([...me.languages, ...them.languages]).size;
  if (total > 0) score += 0.5 * (overlap / total);

  return Math.min(score, 1);
}

function scoreSkill(me: Profile, them: Profile): number {
  const diff = Math.abs(me.skill_level - them.skill_level);
  // 0 diff = 1.0 score, 4 diff = 0.0
  return Math.max(0, 1 - diff / 4);
}

function scoreBehavioral(me: Profile, them: Profile): number {
  const db = getDb();

  // Find how many people we've both shown interest in
  const myInterests = db
    .prepare("SELECT target_profile_id FROM match_interests WHERE profile_id = ? AND status = 'interested'")
    .all(me.id) as { target_profile_id: string }[];
  const theirInterests = db
    .prepare("SELECT target_profile_id FROM match_interests WHERE profile_id = ? AND status = 'interested'")
    .all(them.id) as { target_profile_id: string }[];

  if (myInterests.length === 0 || theirInterests.length === 0) return 0.5; // neutral

  const mySet = new Set(myInterests.map((r) => r.target_profile_id));
  const overlap = theirInterests.filter((r) => mySet.has(r.target_profile_id)).length;
  const union = new Set([...myInterests.map((r) => r.target_profile_id), ...theirInterests.map((r) => r.target_profile_id)]).size;

  return union > 0 ? overlap / union : 0.5;
}

export function expressInterest(profileId: string, targetId: string): MatchInterest {
  const db = getDb();
  const id = uuid();

  // Check if target already expressed interest in us
  const existing = db
    .prepare("SELECT * FROM match_interests WHERE profile_id = ? AND target_profile_id = ?")
    .get(targetId, profileId) as Record<string, unknown> | undefined;

  const isMutual = existing && existing.status === "interested";

  db.prepare(`
    INSERT INTO match_interests (id, profile_id, target_profile_id, score, status)
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(profile_id, target_profile_id) DO UPDATE SET status = ?
  `).run(id, profileId, targetId, isMutual ? "mutual" : "interested", isMutual ? "mutual" : "interested");

  if (isMutual) {
    db.prepare("UPDATE match_interests SET status = 'mutual' WHERE profile_id = ? AND target_profile_id = ?").run(
      targetId,
      profileId
    );
  }

  return {
    id,
    profile_id: profileId,
    target_profile_id: targetId,
    score: 0,
    status: isMutual ? "mutual" : "interested",
    created_at: new Date().toISOString(),
  };
}

export function passOnProfile(profileId: string, targetId: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO match_interests (id, profile_id, target_profile_id, score, status)
    VALUES (?, ?, ?, 0, 'passed')
    ON CONFLICT(profile_id, target_profile_id) DO UPDATE SET status = 'passed'
  `).run(uuid(), profileId, targetId);
}

export function getMutualMatches(profileId: string): MatchInterest[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM match_interests WHERE profile_id = ? AND status = 'mutual'")
    .all(profileId) as MatchInterest[];
}
