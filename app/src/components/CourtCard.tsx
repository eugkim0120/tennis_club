"use client";

interface Court {
  id: string;
  name: string;
  address: string;
  city: string;
  surface: string;
  available_slots: string[];
}

interface Props {
  court: Court;
}

export default function CourtCard({ court }: Props) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">{court.name}</h3>
      <p className="text-gray-500 text-sm mb-2">{court.address}</p>
      <div className="flex gap-2 mb-3">
        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium capitalize">
          {court.surface}
        </span>
        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
          {court.available_slots.length} slots available
        </span>
      </div>
      {court.available_slots.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {court.available_slots.slice(0, 8).map((slot) => (
            <span key={slot} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              {new Date(slot).toLocaleDateString("en-US", { weekday: "short" })}{" "}
              {new Date(slot).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          ))}
          {court.available_slots.length > 8 && (
            <span className="text-gray-400 text-xs py-0.5">+{court.available_slots.length - 8} more</span>
          )}
        </div>
      )}
    </div>
  );
}
