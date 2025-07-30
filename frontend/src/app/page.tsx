"use client";

import { TodoFilter } from "@/components/TodoFilter";
import { TodoInput } from "@/components/TodoInput";
import { TodoList } from "@/components/TodoList";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ModeToggle } from "@/components/ThemeToggle";

export type Task = {
  id: number;
  title: string;
  appname: string;
  hours_perday: number;
  deadline: string;
  status: boolean;
  created_at?: string;
  is_active: boolean;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "completed"
  >("all");
  const [loading, setLoading] = useState(true);

  const listRef = useRef<any>(null);
  const router = useRouter();

  // ✅ Check user auth and role
  useEffect(() => {
    const checkAuthAndRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch role:", error.message);
        return;
      }

      if (profile?.role === "admin") {
        router.push("/admin-dashboard");
        return;
      }

      setLoading(false); // Normal user
    };

    checkAuthAndRole();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (selectedFilter === "active") return task.is_active === true;
    if (selectedFilter === "completed") return task.status === true;
    return true;
  });

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error.message);
      return;
    }
    if (listRef.current) listRef.current.refetchTasks();
  };

  const handleToggle = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ status: !task.status })
      .eq("id", id);

    if (error) {
      console.error("Toggle error:", error.message);
      return;
    }

    if (listRef.current) listRef.current.refetchTasks();
  };

  const addTask = async (task: {
    title: string;
    appname: string;
    perDayHours: string;
    deadline: string;
  }) => {
    const user = await supabase.auth.getUser();
    const userId = user?.data?.user?.id;

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: task.title,
          appname: task.appname,
          hours_perday: task.perDayHours,
          deadline: task.deadline,
          status: false,
          user_id: userId,
        },
      ])
      .select("*");

    if (error) {
      console.error("Error adding task to Supabase:", error.message);
      return;
    }

    if (listRef.current) listRef.current.refetchTasks();
  };

  if (loading) {
    return <div className="text-center p-8">Checking login...</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3">
        <h2 className="text-3xl font-bold text-black text-center">
          ToDo-Track
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (user) {
                const { error } = await supabase
                  .from("tasks")
                  .update({ is_active: false })
                  .eq("user_id", user.id);

                if (error) {
                  console.error("Failed to deactivate tasks:", error.message);
                }
              }

              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition w-full sm:w-auto"
          >
            Logout
          </button>
          <ModeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <TodoInput onAdd={addTask} />
        <TodoFilter
          selectedFilter={selectedFilter}
          onTabChange={setSelectedFilter}
        />
        <div className="mx-auto">
          <TodoList
            ref={listRef}
            selectedFilter={selectedFilter}
            tasks={filteredTasks}
          />
        </div>
      </div>
    </div>
  );
}
