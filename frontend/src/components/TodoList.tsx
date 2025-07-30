"use client";
import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
  useRef,
} from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/fetcher";

import TaskTable from "./TaskTable";
import TaskDetail from "./TaskDetails";

type Task = {
  id: number;
  title: string;
  status: boolean;
  appName: string;
  hours_perday: string | number;
  deadline: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type TodoListProps = {
  tasks: any[];
  selectedFilter: "all" | "active" | "completed";
  readonly?: boolean;
  userIdOverride?: string;
  onTaskClick?: (taskId: number) => void;
};

export const TodoList = forwardRef(
  (
    {
      selectedFilter,
      readonly = false,
      userIdOverride,
      tasks: propTasks,
    }: TodoListProps,
    ref: ForwardedRef<any>
  ) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [screenTimeData, setScreenTimeData] = useState<
      Record<number, number>
    >({});
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL;

    const socketRef = useRef<WebSocket | null>(null);

    useImperativeHandle(ref, () => ({
      refetchTasks: fetchTasks,
    }));

    const fetchTasks = async () => {
      if (readonly) return;
      setLoading(true);

      let userId = userIdOverride;

      if (!userIdOverride) {
        const user = await supabase.auth.getUser();
        userId = user?.data?.user?.id;
      }

      if (!userId) {
        console.warn("No user ID found.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error", error);
        setLoading(false);
        return;
      }

      if (!readonly) {
        const tasksToDeactivate = data.filter(
          (task) => task.status && task.is_active
        );

        for (const task of tasksToDeactivate) {
          await supabase
            .from("tasks")
            .update({ is_active: false })
            .eq("id", task.id);
        }

        if (tasksToDeactivate.length > 0) return fetchTasks();
      }

      setTasks(data);
      setLoading(false);
    };

    const handleToggle = async (id: number) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const { error } = await supabase
        .from("tasks")
        .update({ status: !task.status })
        .eq("id", id);
      if (!error) fetchTasks();
    };

    const handleDelete = async (id: number) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (!error) fetchTasks();
    };

    const handleActivate = async (id: number) => {
      await supabase.from("tasks").update({ is_active: true }).eq("id", id);
      setTimeout(fetchTasks, 300);
    };

    const handleDeactivate = async (id: number) => {
      await supabase.from("tasks").update({ is_active: false }).eq("id", id);
      setTimeout(fetchTasks, 300);
    };

    const toggleTaskDetail = (id: number) => {
      if (selectedTaskId === id) {
        setShowDetail(false);
        setTimeout(() => setSelectedTaskId(null), 200);
      } else {
        setSelectedTaskId(id);
        setShowDetail(true);
      }
    };

    const selectedTask = tasks.find((t) => t.id === selectedTaskId);
    const loggedSeconds = screenTimeData[selectedTask?.id || 0] ?? 0;

    let lastLoggedTodaySeconds: number = 0;

    if (selectedTask && !selectedTask.is_active && selectedTask.updated_at) {
      const updatedAtStr = format(
        new Date(selectedTask.updated_at),
        "yyyy-MM-dd"
      );

      if (updatedAtStr === todayStr) {
        const todayLogs = (selectedTask as any).duration_minutes?.filter(
          (entry: any) => entry.date === todayStr
        );
        if (todayLogs?.length > 0) {
          const lastEntry = todayLogs[todayLogs.length - 1];
          lastLoggedTodaySeconds = lastEntry.minutes * 60;
        }
      }
    }

    useEffect(() => {
      if (readonly) {
        setTasks(propTasks || []);
        setLoading(false);
      } else {
        fetchTasks();
      }

      const connectWebSocket = () => {
        if (socketRef.current) return;
        socketRef.current = new WebSocket(
          backendURL!.replace("https", "wss") + "/ws/usage"
        );

        socketRef.current.onopen = () => console.log("✅ WebSocket connected");

        socketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const todayDate = new Date().toISOString().split("T")[0];
            const usageMap: Record<number, number> = {};

            data.forEach((entry: any) => {
              const logs = entry.duration_minutes || [];
              const todayLogs = logs.filter(
                (log: any) => log.date === todayDate
              );
              const totalSeconds = todayLogs.reduce(
                (sum: number, log: any) => sum + (log.seconds || 0),
                0
              );
              usageMap[entry.task_id] = totalSeconds;
            });

            setScreenTimeData(usageMap);
          } catch (e) {
            console.error("❌ WebSocket parse error:", e);
          }
        };

        socketRef.current.onclose = () => {
          console.warn("⚠️ WebSocket disconnected. Retrying...");
          setTimeout(connectWebSocket, 3000);
        };

        socketRef.current.onerror = (err) => {
          console.error("🚨 WebSocket error:", err);
          socketRef.current?.close();
        };
      };

      connectWebSocket();

      return () => {
        socketRef.current?.close();
      };
    }, []);

    return (
      <div className="relative w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-4 transition-all duration-200">
        <div className="w-full md:w-1.5/3">
          <TaskTable
            tasks={tasks}
            loading={loading}
            showDetail={showDetail}
            selectedFilter={selectedFilter}
            onToggleDetail={toggleTaskDetail}
            onToggleStatus={readonly ? undefined : handleToggle}
            onDelete={readonly ? undefined : handleDelete}
            onActivate={readonly ? undefined : handleActivate}
            onDeactivate={readonly ? undefined : handleDeactivate}
            readonly={readonly}
            onTaskClick={readonly ? toggleTaskDetail : undefined}
          />
        </div>

        {selectedTask && (
          <div className="w-full md:w-1/3">
            <TaskDetail
              task={selectedTask}
              show={showDetail}
              loggedSeconds={loggedSeconds}
              lastLoggedTodaySeconds={lastLoggedTodaySeconds}
              readonly={readonly}
            />
          </div>
        )}
      </div>
    );
  }
);
