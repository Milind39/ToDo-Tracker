"use client";

import { useScreenTime } from "@/hooks/useScreenTime";

export default function TodoUsage() {
  const { screenTime, loading } = useScreenTime();

  return (
    <div className="relative w-[720px] mx-auto">
      <h2 className="text-xl font-bold pt-3">Screen Time Today</h2>

      {loading ? (
        <p className="mt-4 text-gray-600">Loading usage data...</p>
      ) : (
        <div className="mt-4">
          {screenTime.length === 0 ? (
            <p>No usage data yet.</p>
          ) : (
            screenTime.map((entry) => (
              <div key={entry.id} className="flex justify-between py-1">
                <span className="capitalize">{entry.app_name}</span>
                <span>{entry.time_spent} min</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
