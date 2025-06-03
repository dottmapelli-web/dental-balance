
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart as RechartsLineChart } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import React from 'react';


const annualChartData = [
  { month: "Gen", income: 45000, expenses: 30000 }, { month: "Feb", income: 42000, expenses: 28000 },
  { month: "Mar", income: 50000, expenses: 32000 }, { month: "Apr", income: 48000, expenses: 31000 },
  { month: "Mag", income: 52000, expenses: 35000 }, { month: "Giu", income: 55000, expenses: 33000 },
  { month: "Lug", income: 53000, expenses: 34000 }, { month: "Ago", income: 40000, expenses: 25000 },
  { month: "Set", income: 58000, expenses: 36000 }, { month: "Ott", income: 60000, expenses: 38000 },
  { month: "Nov", income: 57000, expenses: 37000 }, { month: "Dic", income: 62000, expenses: 40000 },
];

const chartConfig = {
  income: { label: "Entrate Totali", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite Totali", color: "hsl(var(--chart-2))" },
  profit: { label: "Profitto Netto", color: "hsl(var(--chart-3))" },
};

export default function AnnualSummaryPage() {
  const [currentYear, setCurrentYear] = React.useState<string>(new Date().getFullYear().toString());
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  // In a real app, this data would be fetched based on currentYear
  const displayedAnnualData = annualChartData.map(d => ({
    ...d,
    income: d.income * (parseInt(currentYear) / 2024), // Example: Adjust data based on year
    expenses: d.expenses * (parseInt(currentYear) / 2024),
  }));


  return (
    <>
      <PageHeader
        title="Report Annuale"
        description="Analisi storica delle performance finanziarie dello studio."
        actions={
          <Select value={currentYear} onValueChange={setCurrentYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleziona Anno" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Annuali ({currentYear})</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{displayedAnnualData.reduce((acc, item) => acc + item.income, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15% rispetto all'anno precedente (esempio)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Annuali ({currentYear})</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{displayedAnnualData.reduce((acc, item) => acc + item.expenses, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% rispetto all'anno precedente (esempio)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitto Netto ({currentYear})</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold">€{(displayedAnnualData.reduce((acc, item) => acc + item.income, 0) - displayedAnnualData.reduce((acc, item) => acc + item.expenses, 0)).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+21% rispetto all'anno precedente (esempio)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline">Andamento Mensile (Entrate vs Uscite) - {currentYear}</CardTitle>
          <CardDescription>Confronto mensile delle entrate e uscite per l'anno selezionato.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedAnnualData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Andamento Profitto Netto Mensile - {currentYear}</CardTitle>
          <CardDescription>Evoluzione del profitto netto mese per mese.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                  data={displayedAnnualData.map(d => ({ ...d, profit: d.income - d.expenses }))}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-profit)" }} activeDot={{ r: 6 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
