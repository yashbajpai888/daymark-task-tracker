"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface TrendDataPoint {
  date: string;
  label: string;
  rate: number | null; // null if no tasks
  completed: number;
  total: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-text-secondary border border-dashed border-border rounded-xl">
        No task data recorded in this period.
      </div>
    );
  }

  // Format data with safe defaults for charts
  const chartData = data.map((d) => ({
    ...d,
    displayRate: d.rate !== null ? d.rate : 0,
    hasData: d.rate !== null,
  }));

  return (
    <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-text-primary">Completion Trend (%)</h4>
        <p className="text-xs text-text-secondary mt-0.5">
          Daily percentage of eligible tasks completed over time
        </p>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as (typeof chartData)[0];
                  return (
                    <div className="bg-surface border border-border p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                      <div className="font-semibold text-text-primary">{item.date}</div>
                      {item.hasData ? (
                        <>
                          <div className="text-blue-600 font-bold">{item.rate}% completed</div>
                          <div className="text-text-secondary">
                            {item.completed} of {item.total} tasks
                          </div>
                        </>
                      ) : (
                        <div className="text-text-secondary italic">No tasks scheduled</div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="displayRate"
              stroke="#2563EB"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#blueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
