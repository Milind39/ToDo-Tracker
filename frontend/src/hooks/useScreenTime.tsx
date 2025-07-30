import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export const useScreenTime = () => {
  const [screenTime, setScreenTime] = useState<
    { id: number; app_name: string; time_spent: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchScreenTime = async () => {
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("screen_time")
      .select(`id, duration_minutes, date, tasks:task_id (appname,is_active)`)
      .eq("date", today);

    if (error) {
      console.error("Error fetching screen time:", error);
      setLoading(false);
      return;
    }

    const processed = data
      .filter((entry) => entry.tasks?.is_active)
      .map((entry) => ({
        id: entry.id,
        app_name: entry.tasks?.appname || "Unknown",
        time_spent: Array.isArray(entry.duration_minutes)
          ? entry.duration_minutes.reduce((a, b) => a + b, 0)
          : entry.duration_minutes || 0,
      }));

    setScreenTime(processed);
    setLoading(false);
  };

  useEffect(() => {
    fetchScreenTime();

    const screenTimeChannel = supabase
      .channel("screen_time_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // "INSERT", "UPDATE", "DELETE"
          schema: "public",
          table: "screen_time",
        },
        async () => {
          await fetchScreenTime(); // ✅ await the async call
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        async () => {
          await fetchScreenTime(); // ✅ await the async call
        }
      ) // ✅ re-fetch when task is activated/deactivated
      .subscribe();

    return () => {
      supabase.removeChannel(screenTimeChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  return { screenTime, loading };
};
