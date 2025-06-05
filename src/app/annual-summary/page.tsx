
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart as RechartsLineChart, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, BotMessageSquare, Loader2, AlertCircle, Wand2 } from "lucide-react";
import { type Transaction } from '@/data/transactions-data'; // Keep type definition
import { getYear, getMonth, parseISO, isValid, format } from "date-fns";
import { it } from "date-fns/locale";
import DashboardPieChart from '@/components/charts/dashboard-pie-chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateAnnualFinancialNarrative, type GenerateAnnualFinancialNarrativeInput } from '@/ai/flows/generate-annual-financial-narrative';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const annualBarChartConfig = {
  totalIncome: { label: "Entrate Totali Annuali", color: "hsl(var(--chart-1))" },
  totalExpenses: { label: "Uscite Totali Annuali", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const monthlyBarForYearChartConfig = {
  income: { label: "Entrate Mensili", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite Mensili", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const monthlyProfitChartConfig = {
  profit: { label: "Profitto Netto Mensile", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const expensePieChartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-1)/0.7)", "hsl(var(--chart-2)/0.7)"
];

const generateAvailableYearsFromTransactions = (transactions: Transaction[]): string[] => {
  if (transactions.length === 0) return [getYear(new Date()).toString()];
  const years = new Set<string>();
  transactions.forEach(t => {
    const date = parseISO(t.date);
    if (isValid(date)) {
      years.add(getYear(date).toString());
    }
  });
  if (years.size === 0) return [getYear(new Date()).toString()];
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
};

export default function AnnualSummaryPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const { toast } = useToast();

  const availableYears = useMemo(() => generateAvailableYearsFromTransactions(transactions), [transactions]);
  const [currentYear, setCurrentYear] = useState<string>(availableYears[0] || getYear(new Date()).toString());

  const [annualOverviewData, setAnnualOverviewData] = useState<Array<{ year: string; totalIncome: number; totalExpenses: number; netProfit: number }>>([]);
  const [summaryCardData, setSummaryCardData] = useState<{ income: number; expenses: number; profit: number }>({ income: 0, expenses: 0, profit: 0 });
  const [monthlyProfitDataForSelectedYear, setMonthlyProfitDataForSelectedYear] = useState<Array<{ month: string; profit: number }>>([]);
  const [monthlyBarChartDataForSelectedYear, setMonthlyBarChartDataForSelectedYear] = useState<Array<{ month: string; income: number; expenses: number }>>([]);
  const [expenseBreakdownForSelectedYear, setExpenseBreakdownForSelectedYear] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  
  const [annualNarrative, setAnnualNarrative] = useState<string | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState<boolean>(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchFirestoreTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const q = query(transactionsCollectionRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTransactions.push({
          id: doc.id,
          date: data.date instanceof Timestamp ? format(data.date.toDate(), "yyyy-MM-dd") : data.date,
          description: data.description,
          category: data.category,
          subcategory: data.subcategory,
          type: data.type,
          amount: data.amount,
          status: data.status as Transaction['status'],
          isRecurring: data.isRecurring || false,
          recurrenceDetails: data.recurrenceDetails ? {
            ...data.recurrenceDetails,
            startDate: data.recurrenceDetails.startDate instanceof Timestamp ? format(data.recurrenceDetails.startDate.toDate(), "yyyy-MM-dd") : data.recurrenceDetails.startDate,
            endDate: data.recurrenceDetails.endDate && data.recurrenceDetails.endDate instanceof Timestamp ? format(data.recurrenceDetails.endDate.toDate(), "yyyy-MM-dd") : undefined,
          } : undefined,
          originalRecurringId: data.originalRecurringId,
        });
      });
      setTransactions(fetchedTransactions);
      if (fetchedTransactions.length > 0) {
        const yearsFromData = generateAvailableYearsFromTransactions(fetchedTransactions);
        setCurrentYear(yearsFromData[0] || getYear(new Date()).toString());
      }
    } catch (error: any) {
      console.error("Errore caricamento transazioni da Firestore:", error);
      toast({
        title: "Errore Caricamento Dati",
        description: "Impossibile caricare le transazioni da Firestore per il report annuale.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFirestoreTransactions();
  }, [fetchFirestoreTransactions]);

  useEffect(() => {
    if (isLoadingTransactions || transactions.length === 0) {
       // Se non ci sono transazioni o stanno caricando, potremmo impostare i dati a zero o a valori di default
        setAnnualOverviewData([]);
        setSummaryCardData({ income: 0, expenses: 0, profit: 0 });
        setMonthlyProfitDataForSelectedYear(Array(12).fill(null).map((_, i) => ({ month: format(new Date(parseInt(currentYear), i), "MMM", { locale: it }), profit: 0 })));
        setMonthlyBarChartDataForSelectedYear(Array(12).fill(null).map((_, i) => ({ month: format(new Date(parseInt(currentYear), i), "MMM", { locale: it }), income: 0, expenses: 0 })));
        setExpenseBreakdownForSelectedYear([]);
        return;
    }

    const yearlyData: Record<string, { totalIncome: number; totalExpenses: number }> = {};
    transactions.forEach(t => {
      const date = parseISO(t.date);
      if (isValid(date)) {
        const year = getYear(date).toString();
        if (!yearlyData[year]) {
          yearlyData[year] = { totalIncome: 0, totalExpenses: 0 };
        }
        if (t.type === 'Entrata') {
          yearlyData[year].totalIncome += t.amount;
        } else if (t.type === 'Uscita') {
          yearlyData[year].totalExpenses += Math.abs(t.amount);
        }
      }
    });

    const overview = Object.entries(yearlyData)
      .map(([year, data]) => ({
        year,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        netProfit: data.totalIncome - data.totalExpenses,
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
    setAnnualOverviewData(overview);

  }, [transactions, isLoadingTransactions, currentYear]); // Aggiunto currentYear per ricalcolo se cambia e i dati sono già caricati

  useEffect(() => {
     if (isLoadingTransactions || transactions.length === 0) {
        setSummaryCardData({ income: 0, expenses: 0, profit: 0 });
        const defaultMonthNames = Array(12).fill(null).map((_, i) => format(new Date(parseInt(currentYear), i), "MMM", { locale: it }));
        setMonthlyProfitDataForSelectedYear(defaultMonthNames.map(month => ({ month, profit: 0 })));
        setMonthlyBarChartDataForSelectedYear(defaultMonthNames.map(month => ({ month, income: 0, expenses: 0 })));
        setExpenseBreakdownForSelectedYear([]);
        return;
    }
    const yearToProcess = parseInt(currentYear);

    const transactionsForSelectedYear = transactions.filter(t => {
      const date = parseISO(t.date);
      return isValid(date) && getYear(date) === yearToProcess;
    });

    const totalIncomeSelectedYear = transactionsForSelectedYear
      .filter(t => t.type === 'Entrata')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpensesSelectedYear = transactionsForSelectedYear
      .filter(t => t.type === 'Uscita')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    setSummaryCardData({
      income: totalIncomeSelectedYear,
      expenses: totalExpensesSelectedYear,
      profit: totalIncomeSelectedYear - totalExpensesSelectedYear,
    });

    const monthlyDataArrayForLineChart = Array.from({ length: 12 }).map((_, i) => {
      const monthName = format(new Date(yearToProcess, i), "MMM", { locale: it });
      let income = 0;
      let expenses = 0;
      transactionsForSelectedYear.forEach(t => {
        const transactionDate = parseISO(t.date);
        if (isValid(transactionDate) && getMonth(transactionDate) === i) {
          if (t.type === 'Entrata') income += t.amount;
          else if (t.type === 'Uscita') expenses += Math.abs(t.amount);
        }
      });
      return { month: monthName, profit: income - expenses };
    });
    setMonthlyProfitDataForSelectedYear(monthlyDataArrayForLineChart);

    const monthlyDataArrayForBarChart = Array.from({ length: 12 }).map((_, i) => {
      const monthName = format(new Date(yearToProcess, i), "MMM", { locale: it });
      let income = 0;
      let expenses = 0;
      transactionsForSelectedYear.forEach(t => {
        const transactionDate = parseISO(t.date);
        if (isValid(transactionDate) && getMonth(transactionDate) === i) {
          if (t.type === 'Entrata') income += t.amount;
          else if (t.type === 'Uscita') expenses += Math.abs(t.amount);
        }
      });
      return { month: monthName, income, expenses };
    });
    setMonthlyBarChartDataForSelectedYear(monthlyDataArrayForBarChart);

    const expensesByCategory: Record<string, number> = {};
    transactionsForSelectedYear
      .filter(t => t.type === 'Uscita')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Math.abs(t.amount);
      });
    
    const pieData = Object.entries(expensesByCategory)
        .map(([name, value], index) => ({
            name,
            value,
            fill: expensePieChartColors[index % expensePieChartColors.length],
        }))
        .filter(item => item.value > 0); // Filtra categorie con valore zero
    setExpenseBreakdownForSelectedYear(pieData);

    setAnnualNarrative(null);
    setNarrativeError(null);

  }, [currentYear, transactions, isLoadingTransactions]);

  const handleGenerateNarrative = async () => {
    setIsLoadingNarrative(true);
    setNarrativeError(null);
    setAnnualNarrative(null);

    const currentYearData = annualOverviewData.find(d => d.year === currentYear);
    const previousYearData = annualOverviewData.find(d => d.year === (parseInt(currentYear) - 1).toString());

    if (!currentYearData) {
      setNarrativeError("Dati per l'anno corrente non trovati o non ancora calcolati.");
      setIsLoadingNarrative(false);
      return;
    }
     // Check if income, expenses and profit are all zero
    if (currentYearData.totalIncome === 0 && currentYearData.totalExpenses === 0 && currentYearData.netProfit === 0) {
      setNarrativeError(`Non ci sono dati finanziari significativi per l'anno ${currentYear} per generare un commento.`);
      setAnnualNarrative(`Non ci sono dati finanziari significativi per l'anno ${currentYear} per generare un commento.`);
      setIsLoadingNarrative(false);
      return;
    }

    const input: GenerateAnnualFinancialNarrativeInput = {
      currentYear: parseInt(currentYear),
      currentYearIncome: currentYearData.totalIncome,
      currentYearExpenses: currentYearData.totalExpenses,
      currentYearNetProfit: currentYearData.netProfit,
      companyName: "Studio De Vecchi & Mapelli",
    };

    if (previousYearData) {
      input.previousYearIncome = previousYearData.totalIncome;
      input.previousYearExpenses = previousYearData.totalExpenses;
      input.previousYearNetProfit = previousYearData.netProfit;
    }
    
    try {
      const result = await generateAnnualFinancialNarrative(input);
      setAnnualNarrative(result.narrativeText);
    } catch (e: any) {
      console.error("Error generating annual narrative:", e);
      setNarrativeError(e.message || "Si è verificato un errore durante la generazione del commento.");
    } finally {
      setIsLoadingNarrative(false);
    }
  };
  
  useEffect(() => {
    // Quando availableYears cambia (dopo il fetch delle transazioni), aggiorna currentYear se necessario
    if (availableYears.length > 0 && !availableYears.includes(currentYear)) {
      setCurrentYear(availableYears[0]);
    } else if (availableYears.length === 0 && currentYear !== getYear(new Date()).toString()) {
      // Se non ci sono anni disponibili (nessuna transazione), imposta all'anno corrente
      setCurrentYear(getYear(new Date()).toString());
    }
  }, [availableYears, currentYear]);


  if (isLoadingTransactions && isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati report annuale...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Report Annuale"
        description="Analisi storica delle performance finanziarie dello studio."
        actions={
          <Select 
            value={currentYear} 
            onValueChange={setCurrentYear} 
            disabled={availableYears.length === 0 || isLoadingTransactions}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleziona Anno" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0 ? 
                availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>) :
                <SelectItem value={getYear(new Date()).toString()} disabled>{getYear(new Date()).toString()}</SelectItem>
              }
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Annuali ({currentYear})</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">€{isClient ? summaryCardData.income.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : summaryCardData.income.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Annuali ({currentYear})</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">€{isClient ? summaryCardData.expenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : summaryCardData.expenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitto Netto ({currentYear})</CardTitle>
            {summaryCardData.profit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
                <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
            )}
          </CardHeader>
          <CardContent>
             <div className={`text-3xl font-bold ${summaryCardData.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                €{isClient ? summaryCardData.profit.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : summaryCardData.profit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <BotMessageSquare className="mr-2 h-5 w-5 text-primary" />
            Commento Finanziario Annuale (AI) - {currentYear}
          </CardTitle>
          <CardDescription>
            Un riepilogo generato dall'AI sulla performance finanziaria dell'anno selezionato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateNarrative} disabled={isLoadingNarrative || isLoadingTransactions || (summaryCardData.income === 0 && summaryCardData.expenses === 0)}>
            {isLoadingNarrative ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Genera Commento AI per il {currentYear}
          </Button>
          {isLoadingNarrative && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generazione commento in corso...
            </div>
          )}
          {narrativeError && !isLoadingNarrative && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errore Generazione</AlertTitle>
              <AlertDescription>{narrativeError}</AlertDescription>
            </Alert>
          )}
          {annualNarrative && !isLoadingNarrative && !narrativeError && (
             <Textarea
                value={annualNarrative}
                readOnly
                className="min-h-[100px] bg-muted/30 border-dashed"
                rows={5}
            />
          )}
           {!annualNarrative && !isLoadingNarrative && !narrativeError && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {(summaryCardData.income === 0 && summaryCardData.expenses === 0 && !isLoadingTransactions) 
                ? `Nessun dato finanziario per l'anno ${currentYear} per generare un commento.`
                : `Clicca il pulsante sopra per generare un commento AI sull'anno ${currentYear}.`}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Andamento Annuale Complessivo (Entrate vs Uscite)</CardTitle>
            <CardDescription>Confronto delle entrate e uscite totali per ogni anno.</CardDescription>
          </CardHeader>
          <CardContent>
            {annualOverviewData.length > 0 ? (
                <ChartContainer config={annualBarChartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualOverviewData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip 
                        content={<ChartTooltipContent formatter={(value, name, props) => {
                            const formattedValue = typeof value === 'number' 
                                ? `€${isClient? value.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : value.toFixed(2)}`
                                : value;
                            let label = props.name;
                            if (props.dataKey === 'totalIncome') label = 'Entrate Totali Annuali';
                            else if (props.dataKey === 'totalExpenses') label = 'Uscite Totali Annuali';
                            return [formattedValue, label];
                            }}/>} 
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="totalIncome" fill="var(--color-totalIncome)" radius={[4, 4, 0, 0]} name="Entrate Totali Annuali" />
                    <Bar dataKey="totalExpenses" fill="var(--color-totalExpenses)" radius={[4, 4, 0, 0]} name="Uscite Totali Annuali" />
                    </BarChart>
                </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <p className="text-muted-foreground h-[400px] flex items-center justify-center">Nessun dato disponibile per il grafico.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Andamento Mensile Entrate/Uscite - {currentYear}</CardTitle>
            <CardDescription>Dettaglio entrate e uscite mese per mese per l'anno selezionato.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyBarChartDataForSelectedYear.some(d => d.income > 0 || d.expenses > 0) ? (
                <ChartContainer config={monthlyBarForYearChartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBarChartDataForSelectedYear} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip 
                        content={<ChartTooltipContent formatter={(value, name, props) => {
                            const formattedValue = typeof value === 'number' 
                                ? `€${isClient ? value.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : value.toFixed(2)}`
                                : value;
                            let label = props.name;
                            if (props.dataKey === 'income') label = 'Entrate Mensili';
                            else if (props.dataKey === 'expenses') label = 'Uscite Mensili';
                            return [formattedValue, label];
                            }}/>} 
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Entrate Mensili" />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} name="Uscite Mensili" />
                    </BarChart>
                </ResponsiveContainer>
                </ChartContainer>
            ) : (
                 <p className="text-muted-foreground h-[400px] flex items-center justify-center">Nessun dato per l'anno {currentYear} per il grafico entrate/uscite mensili.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Andamento Profitto Netto Mensile - {currentYear}</CardTitle>
            <CardDescription>Evoluzione del profitto netto mese per mese per l'anno selezionato.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyProfitDataForSelectedYear.some(d => d.profit !== 0) ? (
                <ChartContainer config={monthlyProfitChartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                        data={monthlyProfitDataForSelectedYear}
                        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip 
                            content={<ChartTooltipContent formatter={(value, name, props) => {
                                    const formattedValue = typeof value === 'number' 
                                        ? `€${isClient? value.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : value.toFixed(2)}`
                                        : value;
                                    return [formattedValue, props.name];
                                }}/>}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-profit)" }} activeDot={{ r: 6 }} name="Profitto Netto Mensile" />
                    </RechartsLineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <p className="text-muted-foreground h-[300px] flex items-center justify-center">Nessun dato per l'anno {currentYear} per il grafico del profitto mensile.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Ripartizione Uscite per Categoria ({currentYear})</CardTitle>
            <CardDescription>Distribuzione delle uscite per l'anno selezionato.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {expenseBreakdownForSelectedYear.length > 0 ? (
              <DashboardPieChart data={expenseBreakdownForSelectedYear} />
            ) : (
              <p className="text-muted-foreground h-[300px] flex items-center justify-center">Nessuna spesa registrata per l'anno {currentYear} per il grafico a torta.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Riepilogo Dettagliato Annuale Complessivo</CardTitle>
          <CardDescription>Entrate, uscite e saldo per ogni anno di attività registrato.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anno</TableHead>
                <TableHead className="text-right">Entrate Totali</TableHead>
                <TableHead className="text-right">Uscite Totali</TableHead>
                <TableHead className="text-right">Saldo Annuale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annualOverviewData.length > 0 ? annualOverviewData.map((yearData) => (
                <TableRow key={yearData.year}>
                  <TableCell className="font-medium">{yearData.year}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">
                    €{isClient ? yearData.totalIncome.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : yearData.totalIncome.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">
                    €{isClient ? yearData.totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : yearData.totalExpenses.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${yearData.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    €{isClient ? yearData.netProfit.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : yearData.netProfit.toFixed(2)}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    Nessun dato annuale disponibile da Firestore. Inserisci alcune transazioni.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

    