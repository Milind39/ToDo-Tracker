"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TodoList } from "@/components/TodoList";
import TaskProgress from "@/components/TaskProgress";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<
    { id: string; full_name: string | null }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User fetch error or not logged in:", userError);
        router.push("/admin-login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        router.push("/admin-login");
        return;
      }

      if (profile.role !== "admin") {
        console.warn("User is not admin.");
        router.push("/admin-login");
        return;
      }

      setIsAdmin(true);
      fetchUsers();
    };

    checkAdminAccess();
  }, []);

  const fetchUsers = async () => {
    console.log("❌ Calling fetchUsers()");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("role", "user");

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      console.log("Fetched users:", data);
      setUsers(data);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedUser) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", selectedUser);

      if (error) {
        console.error("Error fetching tasks:", error);
      } else {
        setTasks(data);
        console.log("📝 Fetching tasks for:", data);
      }
    };

    fetchTasks();
  }, [selectedUser]);

  if (isAdmin === null) {
    return (
      <div className="flex justify-center items-center h-screen text-xl">
        Checking admin access...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/admin");
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      {/* User Dropdown */}
      {isAdmin && users.length > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <label className="min-w-[100px] font-medium text-gray-700">
            Select User:
          </label>
          <select
            value={selectedUser || ""}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="p-2 border border-blue-400 rounded w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>
              -- Choose a user --
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Task List */}
      {selectedUser && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-gray-500">No tasks found for this user.</p>
          ) : (
            <TodoList
              tasks={tasks}
              readonly={true}
              selectedFilter="all"
              onTaskClick={(taskId: number) => setSelectedTaskId(taskId)}
            />
          )}
        </div>
      )}

      {/* Task Progress */}
      {/* {selectedUser && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-2">Progress</h3>
          <TaskProgress userId={selectedUser} />
        </div>
      )} */}
    </div>
  );
}
