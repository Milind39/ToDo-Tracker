"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
} from "recharts";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type DurationEntry = {
  date: string;
  time: string;
  seconds: number;
};

type AggregatedData = {
  date: string;
  actualMinutes: number;
  actualLabel: string;
  targetMinutes: number;
  targetLabel: string;
  efficiency: number;
};

type Props = {
  taskId?: number;
  userId?: string;
};

function formatTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hrs = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;

  if (hrs >= 1) {
    return `${hrs} hr${hrs > 1 ? "s" : ""}${min > 0 ? ` ${min} min` : ""}`;
  } else if (totalMinutes >= 1) {
    return `${totalMinutes} min`;
  } else {
    return `${seconds} sec`;
  }
}

function getPerformanceBadge(efficiency: number): {
  label: string;
  color: string;
} {
  if (efficiency >= 100)
    return { label: "Excellent", color: "bg-green-200 text-green-800" };
  if (efficiency >= 75)
    return { label: "Good", color: "bg-yellow-200 text-yellow-800" };
  return { label: "Needs Work", color: "bg-red-200 text-red-800" };
}

export default function TaskProgress({ taskId, userId }: Props) {
  const [chartData, setChartData] = useState<AggregatedData[]>([]);
  const [task, setTask] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  const router = useRouter();

  const fetchUserRole = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!error && data?.role === "admin") setIsAdmin(true);
  };

  const fetchScreenTimeAndTarget = async () => {
    if (!taskId) return;

    const { data: screenData, error: screenError } = await supabase
      .from("screen_time")
      .select("duration_minutes")
      .eq("task_id", taskId)
      .single();

    if (screenError) {
      console.error("Error fetching screen time:", screenError);
      return;
    }

    const raw: DurationEntry[] = screenData?.duration_minutes || [];
    const grouped: Record<string, number> = {};

    raw.forEach(({ date, seconds }) => {
      grouped[date] = (grouped[date] || 0) + seconds;
    });

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task:", taskError);
      return;
    }

    setTask(taskData.title || "Untitled Task");

    let hoursPerDay = 0;
    if (typeof taskData?.hours_perday === "string") {
      const [h, m] = taskData.hours_perday.split(":").map(Number);
      hoursPerDay = h + (m || 0) / 60;
    } else {
      hoursPerDay = Number(taskData?.hours_perday);
    }

    const aggregated: AggregatedData[] = Object.entries(grouped).map(
      ([date, seconds]) => {
        const actualMinutes = +(seconds / 60).toFixed(2);
        const actualLabel = formatTime(seconds);
        const targetMinutes = +(hoursPerDay * 60).toFixed(2);
        const targetLabel = formatTime(targetMinutes * 60);
        const efficiency = +((actualMinutes / targetMinutes) * 100).toFixed(1);

        return {
          date,
          actualMinutes,
          actualLabel,
          targetMinutes,
          targetLabel,
          efficiency,
        };
      }
    );

    aggregated.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setChartData(aggregated);
  };

  useEffect(() => {
    fetchScreenTimeAndTarget();
    fetchUserRole();

    const screenChannel = supabase
      .channel("screen_time_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "screen_time",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchScreenTimeAndTarget();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(screenChannel);
    };
  }, [taskId, userId]);

  const paginatedData = chartData.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );
  const totalPages = Math.ceil(chartData.length / rowsPerPage);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded shadow text-sm">
          <p className="font-bold">{label}</p>
          <p className="text-[#8884d8]">Actual: {data.actualLabel}</p>
          <p className="text-[#82ca9d]">Target: {data.targetLabel}</p>
        </div>
      );
    }
    return null;
  };

  const avgEfficiency =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length
      : 0;

  return (
    <div className="p-4">
      <div className="relative flex items-center justify-center mb-4">
        {!isAdmin && (
          <button
            onClick={() => router.push("/")}
            className="absolute left-0 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Home
          </button>
        )}
        <h2 className="text-xl font-bold text-center">
          {task
            ? `Task: ${task} (Actual vs Target)`
            : "Task Progress (Actual vs Target)"}
        </h2>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-10 text-gray-400 animate-pulse">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m4 2v-4m-7 4V7a2 2 0 012-2h6a2 2 0 012 2v10m4 0H5"
            />
          </svg>
          <p className="text-lg mt-3">No records yet for this task.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                label={{
                  value: "Minutes",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[0, "dataMax + 30"]}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar
                dataKey="actualMinutes"
                fill="#8884d8"
                name="Actual"
                barSize={40}
              />
              <Bar
                dataKey="targetMinutes"
                fill="#82ca9d"
                name="Target"
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 flex flex-col lg:flex-row gap-6">
            {/* Table */}
            <div className="w-full lg:w-2/3 border rounded-md shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="px-4 text-left sticky left-0 bg-gray-100 z-10">
                      Date
                    </TableHead>
                    <TableHead className="px-9 text-right">Actual</TableHead>
                    <TableHead className="pl-3 text-right">Target</TableHead>
                    <TableHead className="pl-9 text-right">
                      Efficiency
                    </TableHead>
                    <TableHead className="px-4 text-center">
                      Performance
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableBody>
                    {paginatedData.map((d) => {
                      const badge = getPerformanceBadge(d.efficiency);
                      const bgColor =
                        d.efficiency >= 100
                          ? "bg-green-50"
                          : d.efficiency >= 75
                          ? "bg-yellow-50"
                          : "bg-red-50";

                      return (
                        <TableRow
                          key={d.date}
                          className={`${bgColor} hover:bg-gray-50 transition`}
                        >
                          <TableCell className="px-4 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                            {d.date}
                          </TableCell>
                          <TableCell className="px-4">
                            {d.actualLabel}
                          </TableCell>
                          <TableCell className="px-4">
                            {d.targetLabel}
                          </TableCell>
                          <TableCell className="px-4 text-center">
                            {d.efficiency}%
                          </TableCell>
                          <TableCell className="px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 === totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(p + 1, totalPages - 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Efficiency Line Chart */}
            <div className="w-full lg:w-1/3 border rounded-md shadow-sm p-4">
              <h3 className="text-center text-md font-semibold mb-2">
                Efficiency Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  {/* Hide X-axis */}
                  <XAxis dataKey="date" tick={false} axisLine={false} />

                  {/* Show "Minutes" on Y-axis */}
                  <YAxis
                    domain={[0, 150]}
                    label={{
                      value: "Minutes",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                    }}
                  />

                  {/* Tooltip */}
                  <Tooltip />

                  {/* Line showing efficiency */}
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#ff7300"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />

                  {/* Dashed reference line at average */}
                  <ReferenceLine
                    y={avgEfficiency}
                    stroke="#888"
                    strokeDasharray="5 5"
                    label={{
                      value: `Avg: ${avgEfficiency.toFixed(1)}%`,
                      position: "insideTopRight",
                      fill: "#666",
                      fontSize: 12,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
