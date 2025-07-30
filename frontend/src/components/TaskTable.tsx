"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { AnimatePresence, motion } from "framer-motion";

type Task = {
  id: number;
  title: string;
  status: boolean;
  is_active: boolean;
};

type TaskTableProps = {
  tasks: Task[];
  loading: boolean;
  showDetail: boolean;
  selectedFilter: "all" | "active" | "completed";
  onToggleDetail: (id: number) => void;
  onToggleStatus?: (id: number) => void;
  onDelete?: (id: number) => void;
  onActivate?: (id: number) => void;
  onDeactivate?: (id: number) => void;
  readonly?: boolean;
  onTaskClick?: (taskId: number) => void;
};

export default function TaskTable({
  tasks,
  loading,
  showDetail,
  selectedFilter,
  onToggleDetail,
  onToggleStatus,
  onDelete,
  onActivate,
  onDeactivate,
  readonly = false,
  onTaskClick,
}: TaskTableProps) {
  const filteredTasks = tasks.filter((task) => {
    if (selectedFilter === "active") return task.is_active;
    if (selectedFilter === "completed") return task.status;
    return true;
  });

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-blue-100 shadow-sm overflow-hidden transition-all duration-100 ${
        showDetail ? " w-[560px]" : "w-[720px]"
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedFilter}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Table className="bg-blue-100">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Status</TableHead>
                <TableHead className="text-left">Tasks</TableHead>
                <TableHead className="text-right">
                  Actions
                  {readonly && (
                    <span className="text-xs italic text-gray-500 ml-1">
                      (view only)
                    </span>
                  )}
                </TableHead>
                {!showDetail && !readonly && (
                  <TableHead className="text-right">Delete</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-gray-400 py-6"
                  >
                    No Task Found
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredTasks.map((task) => (
                    <motion.tr
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="cursor-pointer"
                      onClick={() => {
                        if (readonly && onTaskClick) {
                          onTaskClick(task.id);
                        } else {
                          onToggleDetail(task.id);
                        }
                      }}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={task.status}
                          onCheckedChange={
                            readonly
                              ? undefined
                              : () => onToggleStatus?.(task.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                          disabled={readonly}
                        />
                      </TableCell>

                      <TableCell
                        className={`text-base ${
                          task.status
                            ? "line-through text-gray-500"
                            : "text-gray-800"
                        }`}
                      >
                        {task.title}
                      </TableCell>

                      <TableCell className="text-right">
                        {!readonly && !task.status && (
                          <Button
                            className={`${
                              task.is_active
                                ? "bg-red-500 hover:bg-red-600 text-sm h-[2rem] w-[4.5rem]"
                                : "bg-green-600 hover:bg-green-700 text-sm h-[2rem] w-[4rem]"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              task.is_active
                                ? onDeactivate?.(task.id)
                                : onActivate?.(task.id);
                            }}
                          >
                            {task.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </TableCell>

                      {!readonly && !showDetail && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(task.id);
                            }}
                          >
                            ❌
                          </Button>
                        </TableCell>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
