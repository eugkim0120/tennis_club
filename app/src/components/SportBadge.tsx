"use client";

interface SportBadgeProps {
  sport: string;
  size?: "sm" | "md";
}

const SPORT_ICONS: Record<string, string> = {
  tennis: "🎾",
  padel: "🏓",
  squash: "🏸",
};

const SPORT_NAMES: Record<string, string> = {
  tennis: "Tennis",
  padel: "Padel",
  squash: "Squash",
};

export default function SportBadge({ sport, size = "sm" }: SportBadgeProps) {
  const icon = SPORT_ICONS[sport] || "🎾";
  const name = SPORT_NAMES[sport] || sport;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={"inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/50 " + sizeClass}>
      <span>{icon}</span>
      <span>{name}</span>
    </span>
  );
}
