"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardDescription, CardHeader } from "./ui/card";
import { apiFetch } from "@/utils/fetch";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

type Task = {
  id: number;
  status: boolean;
  is_active: boolean;
  deadline: string;
  created_at: string;
  hours_perday: string | number;
  updated_at: string;
  appName?: string;
};

type Props = {
  task: Task;
  show: boolean;
  loggedSeconds: number;
  lastLoggedTodaySeconds: number;
  readonly?: boolean;
};

export default function TaskDetail({
  task,
  show,
  loggedSeconds,
  lastLoggedTodaySeconds,
  readonly,
}: Props) {
  const [frozenSeconds, setFrozenSeconds] = useState<number | null>(null);

  const today = new Date();
  const deadline = task.deadline ? new Date(task.deadline) : today;
  const createdAt = task.created_at ? new Date(task.created_at) : today;
  const [loadingProgress, setLoadingProgress] = useState(false);
  const router = useRouter();

  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalDays = Math.max(
    1,
    Math.ceil(
      (deadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const parseHours = (timeStr: string): number => {
    const [h, m, s] = timeStr.split(":").map(Number);
    return h + m / 60 + s / 3600;
  };

  const perDayHours =
    typeof task.hours_perday === "string"
      ? parseHours(task.hours_perday).toFixed(1)
      : task.hours_perday;

  const formatLoggedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} sec`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    return `${(seconds / 3600).toFixed(1)} hr`;
  };

  // ✅ Start or stop tracker when is_active changes
  useEffect(() => {
    const controlTracker = async () => {
      if (!task.id || !task.appName || readonly) return;

      try {
        await fetch(`/${task.is_active ? "start-tracker" : "stop-tracker"}`, {
          method: "POST",
          body: JSON.stringify({
            task_id: task.id,
            appname: task.appName,
          }),
        });
      } catch (err) {
        console.error("❌ Error controlling tracker:", err);
      }
    };

    controlTracker();
  }, [task.id, task.is_active, readonly, task.appName]);

  // ✅ Fetch frozen seconds if task is not active
  useEffect(() => {
    const fetchFrozenSeconds = async () => {
      if (!task.is_active && task.id) {
        const todayStr = new Date().toISOString().split("T")[0];
        console.log(
          "📦 Fetching screen time for task:",
          task.id,
          "on",
          todayStr
        );

        try {
          const data = await apiFetch(
            `/screen-time?task_id=${task.id}&date=${todayStr}`
          );
          console.log("✅ Response from /screen-time:", data);

          const logs = data?.duration_minutes || [];
          const todayLogs = logs.filter((log: any) => log.date === todayStr);
          console.log("📝 Today logs:", todayLogs);

          const total = todayLogs.reduce(
            (sum: number, log: any) => sum + (log.seconds || 0),
            0
          );
          setFrozenSeconds(total);
          console.log("🧊 Frozen seconds set to:", total);
        } catch (error) {
          console.error("❌ Failed to fetch screen time:", error);
          setFrozenSeconds(null);
        }
      }
    };

    fetchFrozenSeconds();
  }, [task?.id, task?.is_active]);

  const displayedSeconds = task.is_active
    ? loggedSeconds
    : frozenSeconds ?? lastLoggedTodaySeconds;

  console.log({
    isActive: task.is_active,
    displayedSeconds,
    frozenSeconds,
    loggedSeconds,
  });

  return (
    <AnimatePresence>
      {show && task && (
        <motion.div
          key="task-detail"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xs md:max-w-sm"
        >
          <Card className="bg-blue-100">
            <CardHeader className="p-2 underline text-l font-bold">
              Log daily hours
            </CardHeader>
            <CardDescription className="px-2 space-y-2 pb-3">
              <div className="w-full">
                <div className="h-2 bg-gray-50 rounded-full">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        (1 - daysLeft / totalDays) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  {daysLeft > 0
                    ? `${daysLeft} day(s) left`
                    : "Deadline reached"}
                </p>
              </div>

              <p className="text-xs text-gray-700">
                Today: {new Date().toDateString()}
              </p>

              <h4 className="text-sm font-semibold text-black">
                {formatLoggedTime(displayedSeconds)} / {perDayHours} hr
              </h4>

              <p
                className={`text-sm font-medium ${
                  task.status ? "text-green-600" : "text-orange-500"
                }`}
              >
                {task.status ? "Completed" : "Pending"}
              </p>

              <Button
                className="w-full mt-2 text-white hover:bg-blue-700  bg-blue-600"
                onClick={() => {
                  setLoadingProgress(true);
                  router.push(`/TaskProgress/${task.id}`);
                }}
                disabled={loadingProgress}
              >
                {loadingProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Loading...</p>
                  </>
                ) : (
                  "View Progress"
                )}
              </Button>
            </CardDescription>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
