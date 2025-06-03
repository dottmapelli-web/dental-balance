
"use client";

import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface DashboardCashflowLineChartProps {
  data: Array<Record<string, any>>;
  config: ChartConfig;
}

const cashflowChartData = [
  { date: "01/07", cashflow: 2000 }, { date: "05/07", cashflow: 2500 },
  { date: "10/07", cashflow: 1800 }, { date: "15/07", cashflow: 3000 },
  { date: "20/07", cashflow: 2200 }, { date: "25/07", cashflow: 3500 },
  { date: "30/07", cashflow: 3200 },
];

export default function DashboardCashflowLineChart({ config }: DashboardCashflowLineChartProps) {
  // In a real app, data would be passed as a prop or fetched
  // For now, using the static data defined in the original page
  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={cashflowChartData}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Line type="monotone" dataKey="cashflow" stroke="var(--color-cashflow)" strokeWidth={2} dot={true} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
