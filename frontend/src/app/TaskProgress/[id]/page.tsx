"use client";

import { useParams } from "next/navigation";
import TaskProgress from "@/components/TaskProgress";

export default function TaskProgressPage() {
  const params = useParams();
  const taskId = parseInt(params.id as string);

  if (isNaN(taskId)) {
    return <div className="p-4">Invalid Task ID</div>;
  }

  return <TaskProgress taskId={taskId} />;
}
