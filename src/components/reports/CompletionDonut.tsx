"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface CompletionDonutProps {
  completed: number;
  todo: number;
  cancelled?: number;
}

export const CompletionDonut: React.FC<CompletionDonutProps> = ({
  completed,
  todo,
  cancelled = 0,
}) => {
  const eligibleTotal = completed + todo;

  if (eligibleTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-center text-text-secondary text-sm border border-dashed border-border rounded-xl">
        <span>No tasks scheduled</span>
        <span className="text-xs text-text-secondary/60 mt-1">Completion rate is not applicable</span>
      </div>
    );
  }

  const rate = Math.round((completed / eligibleTotal) * 100);

  const data = [
    { name: "Completed", value: completed, color: "#2563EB" },
    { name: "Remaining", value: todo, color: "#E2E8F0" },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-surface border border-border rounded-xl">
      <div className="relative w-full min-w-0 h-52 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="bg-surface-elevated border border-border px-3 py-1.5 rounded-lg text-xs shadow-lg">
                      <span className="font-semibold text-text-primary">{item.name}:</span>{" "}
                      <span className="text-accent">{item.value}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-accent tracking-tight">{rate}%</span>
          <span className="text-[11px] text-text-secondary uppercase tracking-wider">Completed</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-text-primary font-medium">{completed} Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="text-text-secondary">{todo} Remaining</span>
        </div>
      </div>
    </div>
  );
};
