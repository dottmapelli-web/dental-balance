
"use client";

import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface DashboardCashflowLineChartProps {
  data: Array<{ date: string; cashflow: number }>; // Updated to expect specific data structure
  config: ChartConfig;
}

export default function DashboardCashflowLineChart({ data, config }: DashboardCashflowLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        Nessun dato disponibile per il flusso di cassa.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis 
            tickFormatter={(value) => {
                if (value === 0) return '€0';
                return `€${(value / 1000).toFixed(1)}k`;
            }} 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8} 
            allowDecimals={false}
          />
          <ChartTooltip 
            cursor={false} 
            content={<ChartTooltipContent 
                        indicator="line" 
                        formatter={(value, name, props) => {
                            const formattedValue = typeof value === 'number' 
                                ? `€${value.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                                : value;
                            return [formattedValue, props.payload.cashflow >=0 ? "Flusso di cassa" : "Flusso di cassa (Negativo)"];
                        }}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                return `Data: ${payload[0].payload.date}`;
                            }
                            return label;
                        }}
                    />} 
            />
          <Line type="monotone" dataKey="cashflow" stroke="var(--color-cashflow)" strokeWidth={2} dot={true} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

    