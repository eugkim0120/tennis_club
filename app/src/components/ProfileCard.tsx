"use client";

interface Profile {
  id: string;
  name: string;
  age: number;
  languages: string[];
  skill_level: number;
  city: string | null;
  bio: string;
}

interface ScoreBreakdown {
  criteria: number;
  skill: number;
  behavioral: number;
}

interface Props {
  profile: Profile;
  score?: number;
  breakdown?: ScoreBreakdown;
  onInterested?: () => void;
  onPass?: () => void;
  showActions?: boolean;
}

function skillLabel(level: number): string {
  if (level <= 1.5) return "Beginner";
  if (level <= 2.5) return "Intermediate";
  if (level <= 3.5) return "Advanced";
  if (level <= 4.5) return "Expert";
  return "Pro";
}

export default function ProfileCard({ profile, score, breakdown, onInterested, onPass, showActions = false }: Props) {
  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
          <p className="text-gray-500 text-sm">
            {profile.age} years old {profile.city && `· ${profile.city}`}
          </p>
        </div>
        {score !== undefined && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
            {Math.round(score * 100)}% match
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium">
          {skillLabel(profile.skill_level)} ({profile.skill_level.toFixed(1)})
        </span>
        {profile.languages.map((lang) => (
          <span key={lang} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
            {lang}
          </span>
        ))}
      </div>

      {profile.bio && <p className="text-gray-600 text-sm mb-3">{profile.bio}</p>}

      {breakdown && (
        <div className="flex gap-4 text-xs text-gray-400 mb-4">
          <span>Criteria: {Math.round(breakdown.criteria * 100)}%</span>
          <span>Skill: {Math.round(breakdown.skill * 100)}%</span>
          <span>Behavioral: {Math.round(breakdown.behavioral * 100)}%</span>
        </div>
      )}

      {showActions && (
        <div className="flex gap-3">
          <button
            onClick={onInterested}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Interested
          </button>
          <button
            onClick={onPass}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Pass
          </button>
        </div>
      )}
    </div>
  );
}
