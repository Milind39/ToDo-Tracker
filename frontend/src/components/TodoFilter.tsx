"use client";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type Props = {
  selectedFilter: "all" | "active" | "completed";
  onTabChange: (value: "all" | "active" | "completed") => void;
  readonly?: boolean;
};

export const TodoFilter = ({
  selectedFilter,
  onTabChange,
  readonly,
}: Props) => {
  if (readonly) return null; // hide filter in readonly mode (e.g. admin)
  return (
    <Tabs
      value={selectedFilter}
      onValueChange={(value) => {
        if (value === "all" || value === "active" || value === "completed") {
          onTabChange(value);
        }
      }}
      className="relative w-full max-w-xl mx-auto p-3"
    >
      <div className="flex justify-center">
        <TabsList className="bg-white border-2 rounded-lg flex shadow-sm w-[290px] justify-self-center">
          <TabsTrigger
            value="all"
            className="p-2 px-8 text-sm font-semibold rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Active
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="py-2 text-sm font-semibold rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Completed
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
};
