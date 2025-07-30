"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AppSelectDropdown from "./AppSelectDropdown";
import { Loader2 } from "lucide-react";
import { Label } from "./ui/label";

type TodoInputProps = {
  onAdd: (task: {
    title: string;
    appname: string;
    perDayHours: string;
    deadline: string;
  }) => void;
};

type AppRegistryItem = {
  appname: string;
  name: string;
  icon_url: string;
  category: string;
};

export const TodoInput = ({ onAdd }: TodoInputProps) => {
  const [text, setText] = useState("");
  const [appName, setAppName] = useState("");
  const [perDayHoursRaw, setPerDayHoursRaw] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [appRegistry, setAppRegistry] = useState<AppRegistryItem[]>([]);

  useEffect(() => {
    const fetchAppRegistry = async () => {
      const { data, error } = await supabase.from("app_registry").select("*");
      if (error) {
        console.error("Error fetching app registry:", error.message);
      } else {
        setAppRegistry(data);
      }
    };

    fetchAppRegistry();
  }, []);

  const decimalToTimeString = (input: string): string => {
    const num = parseFloat(input);
    if (isNaN(num)) return "00:00:00";
    const hours = Math.floor(num);
    const minutes = Math.floor((num - hours) * 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:00`;
  };

  const handleAdd = async () => {
    const trimmedText = text.trim();
    const trimmedApp = appName.trim();
    const rawTime = perDayHoursRaw.trim();

    if (!trimmedText || !trimmedApp || !rawTime || !deadline) {
      setMessage("⚠️ Please fill all fields correctly.");
      return;
    }

    const formattedTime = decimalToTimeString(rawTime);

    setLoading(true);
    setMessage("");

    await onAdd({
      title: trimmedText,
      appname: trimmedApp,
      perDayHours: formattedTime,
      deadline,
    });

    setMessage("✅ Task added successfully!");
    setText("");
    setAppName("");
    setPerDayHoursRaw("");
    setDeadline("");
    setLoading(false);
  };

  // Group apps by category
  const groupedApps = appRegistry.reduce<Record<string, AppRegistryItem[]>>(
    (groups, app) => {
      if (!groups[app.category]) {
        groups[app.category] = [];
      }
      groups[app.category].push(app);
      return groups;
    },
    {}
  );

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-md max-w-xl mx-auto bg-blue-100 w-full">
      {/* To-Do Input */}
      <input
        className="w-full p-3 border rounded text-lg"
        placeholder="Enter To-Do"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* App Dropdown */}
      <AppSelectDropdown
        groupedApps={groupedApps}
        appName={appName}
        setAppName={setAppName}
      />

      {/* Daily Hours Input */}
      <input
        className="w-full p-3 border rounded text-lg"
        type="number"
        step="0.01"
        placeholder="Enter daily hours (e.g., 2 or 2.5)"
        value={perDayHoursRaw}
        onChange={(e) => setPerDayHoursRaw(e.target.value)}
      />

      {/* Deadline Row */}
      <div className="flex flex-col sm:flex-row w-full items-start sm:items-center gap-2">
        <Label className="text-lg text-black/60">Deadline:</Label>
        <input
          className="w-full sm:w-auto flex-1 p-3 border rounded text-lg"
          type="date"
          placeholder="Enter Deadline"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <button
        className="bg-blue-600 text-white w-full px-4 py-3 rounded hover:bg-blue-700 transition"
        onClick={handleAdd}
        type="button"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Adding...</span>
          </div>
        ) : (
          "Add Task"
        )}
      </button>
    </div>
  );
};
