
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, CircleDollarSign, BotMessageSquare, Loader2, AlertCircle, Wand2, FileText } from "lucide-react";
import type { ChartConfig } from "@/components/ui/chart";
import DashboardBarChart from "@/components/charts/dashboard-bar-chart";
import { generateDashboardInsight, type GenerateDashboardInsightInput, type GenerateDashboardInsightOutput } from '@/ai/flows/generate-dashboard-insight-flow';
import { type Transaction } from '@/data/transactions-data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { format, parseISO, isValid, getMonth, getYear, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { siteConfig } from '@/config/site';
import { useRouter } from 'next/navigation';

const dashboardChartConfig = {
  income: { label: "Entrate", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [currentMonthSummary, setCurrentMonthSummary] = useState<{ income: number; expenses: number; balance: number }>({ income: 0, expenses: 0, balance: 0 });
  const [lastSixMonthsChartData, setLastSixMonthsChartData] = useState<Array<{ month: string; income: number; expenses: number }>>([]);

  const [dashboardInsight, setDashboardInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchFirestoreTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const oneYearAgo = subMonths(new Date(), 12);
      const q = query(
        transactionsCollectionRef,
        where("date", ">=", Timestamp.fromDate(oneYearAgo)),
        orderBy("date", "desc")
      );
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
    } catch (error: any) {
      console.error("Errore caricamento transazioni da Firestore (Dashboard):", error);
      let detailedError = "Impossibile caricare le transazioni da Firestore per la dashboard.";
      if (error.message) detailedError += ` Dettaglio: ${error.message}`;
      if (error.code) detailedError += ` (Codice: ${error.code})`;
      setTransactionsError(detailedError);
      toast({
        title: "Errore Caricamento Dati Dashboard",
        description: detailedError,
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
    if (isLoadingTransactions || transactionsError || transactions.length === 0) {
      setCurrentMonthSummary({ income: 0, expenses: 0, balance: 0 });
      setLastSixMonthsChartData([]);
      return;
    }

    const today = new Date();
    const currentMonth = getMonth(today);
    const currentYearValue = getYear(today);

    let cmIncome = 0;
    let cmExpenses = 0;

    transactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (isValid(transactionDate) && getYear(transactionDate) === currentYearValue && getMonth(transactionDate) === currentMonth) {
        if (t.type === 'Entrata' && t.status === 'Completato') {
          cmIncome += t.amount;
        } else if (t.type === 'Uscita' && t.status === 'Completato') {
          cmExpenses += Math.abs(t.amount);
        }
      }
    });
    setCurrentMonthSummary({ income: cmIncome, expenses: cmExpenses, balance: cmIncome - cmExpenses });

    const chartData: Array<{ month: string; income: number; expenses: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const dateIterator = subMonths(today, i);
      const monthForChart = getMonth(dateIterator);
      const yearForChart = getYear(dateIterator);
      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      transactions.forEach(t => {
        const transactionDate = parseISO(t.date);
        if (isValid(transactionDate) && getYear(transactionDate) === yearForChart && getMonth(transactionDate) === monthForChart) {
          if (t.type === 'Entrata' && t.status === 'Completato') {
            monthlyIncome += t.amount;
          } else if (t.type === 'Uscita' && t.status === 'Completato') {
            monthlyExpenses += Math.abs(t.amount);
          }
        }
      });
      chartData.push({
        month: format(dateIterator, "MMM", { locale: it }),
        income: monthlyIncome,
        expenses: monthlyExpenses,
      });
    }
    setLastSixMonthsChartData(chartData);

  }, [transactions, isLoadingTransactions, transactionsError]);

  const handleGenerateInsight = useCallback(async () => {
    if (currentMonthSummary.income === 0 && currentMonthSummary.expenses === 0 && !isLoadingTransactions) {
        setDashboardInsight("Nessun dato di entrate o uscite per il mese corrente per generare un insight dettagliato.");
        setInsightError(null);
        return;
    }
    setIsLoadingInsight(true);
    setInsightError(null);
    setDashboardInsight(null); 
    try {
      const input: GenerateDashboardInsightInput = {
        totalIncome: currentMonthSummary.income,
        totalExpenses: currentMonthSummary.expenses,
        balance: currentMonthSummary.balance,
      };
      const result = await generateDashboardInsight(input);
      setDashboardInsight(result.insightText);
      toast({ title: "Insight Generato", description: "L'insight AI per la dashboard è pronto." });
    } catch (e: any) {
      console.error("Error generating dashboard insight:", e);
      const errorMessage = e.message || "Errore sconosciuto durante la generazione dell'insight.";
      setInsightError(`Errore AI: ${errorMessage}`);
      setDashboardInsight(null); 
      toast({ title: "Errore Generazione Insight", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingInsight(false);
    }
  }, [currentMonthSummary, toast, setIsLoadingInsight, setInsightError, setDashboardInsight, isLoadingTransactions]);
  
  useEffect(() => {
    if (
      !isLoadingTransactions &&
      !transactionsError &&
      (currentMonthSummary.income !== 0 || currentMonthSummary.expenses !== 0) &&
      !dashboardInsight && 
      !isLoadingInsight && 
      !insightError        
    ) {
      handleGenerateInsight();
    }
  }, [
    currentMonthSummary,
    dashboardInsight,
    isLoadingInsight,
    insightError,
    handleGenerateInsight,
    isLoadingTransactions,
    transactionsError
  ]);
  
  if (isLoadingTransactions && isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight md:text-4xl">
            Dashboard Principale
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Riepilogo finanziario per {format(new Date(), "MMMM yyyy", { locale: it })}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:ml-auto sm:items-end mt-4 sm:mt-0">
          <Button onClick={() => router.push('/monthly-summary')} variant="outline" size="sm" className="w-full sm:w-auto justify-start sm:justify-center">
            <FileText className="mr-2 h-4 w-4" /> Report Mensile
          </Button>
          <Button onClick={() => router.push('/annual-summary')} variant="outline" size="sm" className="w-full sm:w-auto justify-start sm:justify-center">
            <FileText className="mr-2 h-4 w-4" /> Report Annuale
          </Button>
        </div>
      </div>

      {transactionsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore Caricamento Dati</AlertTitle>
          <AlertDescription>{transactionsError}</AlertDescription>
        </Alert>
      )}

      {!transactionsError && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entrate del Mese</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  €{isClient ? currentMonthSummary.income.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentMonthSummary.income.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Entrate totali registrate questo mese.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uscite del Mese</CardTitle>
                <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  €{isClient ? currentMonthSummary.expenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentMonthSummary.expenses.toFixed(2)}
                </div>
                 <p className="text-xs text-muted-foreground">Uscite totali registrate questo mese.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo del Mese</CardTitle>
                <CircleDollarSign className={`h-5 w-5 ${currentMonthSummary.balance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${currentMonthSummary.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  €{isClient ? currentMonthSummary.balance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentMonthSummary.balance.toFixed(2)}
                </div>
                 <p className="text-xs text-muted-foreground">Differenza tra entrate e uscite (Saldo attuale studio).</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                <BotMessageSquare className="mr-2 h-5 w-5 text-primary" />
                Insight Finanziario AI (Mese Corrente)
              </CardTitle>
              <CardDescription>
                Un breve commento generato dall'AI sulla salute finanziaria di questo mese.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateInsight} 
                disabled={isLoadingInsight || isLoadingTransactions || (!isLoadingTransactions && currentMonthSummary.income === 0 && currentMonthSummary.expenses === 0)}
              >
                {isLoadingInsight ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Genera Insight AI
              </Button>
              {isLoadingInsight && (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generazione insight in corso...
                </div>
              )}
              {insightError && !isLoadingInsight && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errore Generazione Insight AI</AlertTitle>
                  <AlertDescription>{insightError}</AlertDescription>
                </Alert>
              )}
              {dashboardInsight && !isLoadingInsight && !insightError && (
                <Textarea
                  value={dashboardInsight}
                  readOnly
                  className="min-h-[80px] bg-muted/30 border-dashed"
                  rows={4}
                />
              )}
              {!dashboardInsight && !isLoadingInsight && !insightError && (
                 <p className="text-sm text-muted-foreground text-center py-4">
                  {isLoadingTransactions 
                      ? "Caricamento dati transazioni in corso..."
                      : (currentMonthSummary.income === 0 && currentMonthSummary.expenses === 0)
                          ? `Nessun dato finanziario per il mese corrente per generare un insight.`
                          : `Insight AI non ancora disponibile. Prova a generarlo manualmente.`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Andamento Entrate/Uscite (Ultimi 6 Mesi)</CardTitle>
              <CardDescription>Confronto delle entrate e uscite mensili (transazioni completate).</CardDescription>
            </CardHeader>
            <CardContent>
              {lastSixMonthsChartData.length > 0 && lastSixMonthsChartData.some(d => d.income > 0 || d.expenses > 0) ? (
                <DashboardBarChart data={lastSixMonthsChartData} config={dashboardChartConfig} />
              ) : (
                <p className="text-muted-foreground h-[300px] flex items-center justify-center">
                  {isLoadingTransactions ? "Caricamento dati per il grafico..." : "Nessun dato sufficiente per il grafico degli ultimi 6 mesi."}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
    
