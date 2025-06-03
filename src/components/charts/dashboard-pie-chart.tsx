
"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { PieProps } from "recharts";

interface DashboardPieChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  onSliceClick?: (data: any, index: number) => void; // data is the slice payload
}

export default function DashboardPieChart({ data, onSliceClick }: DashboardPieChartProps) {
  const handlePieClick: PieProps['onClick'] = (data, index, e) => {
    if (onSliceClick) {
      onSliceClick(data, index);
    }
  };

  return (
    <ChartContainer config={{}} className="h-[300px] w-full max-w-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            outerRadius={100} 
            labelLine={false}
            // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Etichetta rimossa
            onClick={handlePieClick}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer focus:outline-none" />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

