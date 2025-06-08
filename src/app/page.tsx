
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, CircleDollarSign, BotMessageSquare, Loader2, AlertCircle, Wand2, FileText, Landmark, Edit, PieChart as PieChartIcon, LineChart as LineChartIcon, ListChecks, Target as TargetIcon } from "lucide-react";
import type { ChartConfig } from "@/components/ui/chart";
import DashboardBarChart from "@/components/charts/dashboard-bar-chart";
import DashboardPieChart from "@/components/charts/dashboard-pie-chart";
import DashboardCashflowLineChart from "@/components/charts/dashboard-cashflow-line-chart";
import { generateDashboardInsight, type GenerateDashboardInsightInput, type GenerateDashboardInsightOutput } from '@/ai/flows/generate-dashboard-insight-flow';
import { type Transaction } from '@/data/transactions-data';
import type { ObjectiveListItem } from '@/app/budget-objectives/page'; // Assuming this type is exported
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, orderBy, doc, getDoc, setDoc, limit } from 'firebase/firestore';
import { format, parseISO, isValid, getMonth, getYear, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, getDate, isBefore, isEqual } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { siteConfig } from '@/config/site';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const dashboardChartConfig = {
  income: { label: "Entrate", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const cashflowChartConfig = {
  cashflow: { label: "Flusso di Cassa", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const BANK_BALANCE_DOC_PATH = "studioInfo/mainBalance";
const pieChartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];


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

  const [bankBalance, setBankBalance] = useState<number>(0);
  const [isLoadingBankBalance, setIsLoadingBankBalance] = useState<boolean>(true);
  const [isEditingBankBalance, setIsEditingBankBalance] = useState<boolean>(false);
  const [newBankBalanceValue, setNewBankBalanceValue] = useState<string>("");

  // State for new dashboard sections
  const [expenseBreakdownCurrentMonth, setExpenseBreakdownCurrentMonth] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [isLoadingExpenseBreakdown, setIsLoadingExpenseBreakdown] = useState(true);
  
  const [cashflowCurrentMonth, setCashflowCurrentMonth] = useState<Array<{ date: string; cashflow: number }>>([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(true);
  
  const [topExpenseCategoriesCurrentMonth, setTopExpenseCategoriesCurrentMonth] = useState<Array<{ category: string; amount: number }>>([]);
  const [isLoadingTopCategories, setIsLoadingTopCategories] = useState(true);
  
  const [keyFinancialObjectives, setKeyFinancialObjectives] = useState<ObjectiveListItem[]>([]);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchBankBalance = useCallback(async () => {
    setIsLoadingBankBalance(true);
    try {
      const balanceDocRef = doc(db, BANK_BALANCE_DOC_PATH);
      const docSnap = await getDoc(balanceDocRef);
      if (docSnap.exists()) {
        setBankBalance(docSnap.data().balance || 0);
        setNewBankBalanceValue((docSnap.data().balance || 0).toString());
      } else {
        setBankBalance(0);
        setNewBankBalanceValue("0");
      }
    } catch (error) {
      console.error("Errore caricamento giacenza bancaria:", error);
      toast({
        title: "Errore Giacenza Bancaria",
        description: "Impossibile caricare la giacenza bancaria da Firestore.",
        variant: "destructive",
      });
      setBankBalance(0);
      setNewBankBalanceValue("0");
    } finally {
      setIsLoadingBankBalance(false);
    }
  }, [toast]);

  const handleUpdateBankBalance = async () => {
    const newBalance = parseFloat(newBankBalanceValue);
    if (isNaN(newBalance) || newBalance < 0) {
      toast({
        title: "Valore Non Valido",
        description: "Inserisci un importo valido per la giacenza bancaria.",
        variant: "destructive",
      });
      return;
    }
    setIsLoadingBankBalance(true);
    try {
      const balanceDocRef = doc(db, BANK_BALANCE_DOC_PATH);
      await setDoc(balanceDocRef, { balance: newBalance }, { merge: true });
      setBankBalance(newBalance);
      toast({
        title: "Giacenza Aggiornata",
        description: `La giacenza bancaria è stata aggiornata a €${newBalance.toFixed(2)}.`,
      });
      setIsEditingBankBalance(false);
    } catch (error) {
      console.error("Errore aggiornamento giacenza bancaria:", error);
      toast({
        title: "Errore Aggiornamento Giacenza",
        description: "Impossibile aggiornare la giacenza bancaria in Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBankBalance(false);
    }
  };

  const fetchFirestoreTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      // const oneYearAgo = subMonths(new Date(), 12); // Consider fetching all for more accurate cashflow if needed
      const q = query(
        transactionsCollectionRef,
        orderBy("date", "asc") // Order by date ascending for cash flow calculation
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

  const fetchKeyObjectives = useCallback(async () => {
    setIsLoadingObjectives(true);
    try {
      const objectivesCol = collection(db, "objectives");
      // Fetch top 3, ordered by name for consistency, could be by progress or target date later
      const qObjectives = query(objectivesCol, orderBy("name"), limit(3));
      const objectivesSnapshot = await getDocs(qObjectives);
      const fetchedObjectives: ObjectiveListItem[] = [];
      objectivesSnapshot.forEach(docSnap => {
        fetchedObjectives.push({ id: docSnap.id, ...docSnap.data() } as ObjectiveListItem);
      });
      setKeyFinancialObjectives(fetchedObjectives);
    } catch (error) {
      console.error("Errore caricamento obiettivi chiave:", error);
      toast({ title: "Errore Obiettivi", description: "Impossibile caricare gli obiettivi finanziari.", variant: "destructive" });
    } finally {
      setIsLoadingObjectives(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchFirestoreTransactions();
    fetchBankBalance();
    fetchKeyObjectives();
  }, [fetchFirestoreTransactions, fetchBankBalance, fetchKeyObjectives]);

  useEffect(() => {
    if (isLoadingTransactions || transactionsError) {
      setCurrentMonthSummary({ income: 0, expenses: 0, balance: 0 });
      setLastSixMonthsChartData([]);
      setExpenseBreakdownCurrentMonth([]);
      setCashflowCurrentMonth([]);
      setTopExpenseCategoriesCurrentMonth([]);
      setIsLoadingExpenseBreakdown(false);
      setIsLoadingCashflow(false);
      setIsLoadingTopCategories(false);
      return;
    }

    const today = new Date();
    const currentMonthValue = getMonth(today);
    const currentYearValue = getYear(today);

    // Calculate Current Month Summary (Income, Expenses, Balance)
    let cmIncome = 0;
    let cmExpenses = 0;
    transactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (isValid(transactionDate) && getYear(transactionDate) === currentYearValue && getMonth(transactionDate) === currentMonthValue) {
        if (t.type === 'Entrata' && t.status === 'Completato') cmIncome += t.amount;
        else if (t.type === 'Uscita' && t.status === 'Completato') cmExpenses += Math.abs(t.amount);
      }
    });
    setCurrentMonthSummary({ income: cmIncome, expenses: cmExpenses, balance: cmIncome - cmExpenses });

    // Calculate Last Six Months Chart Data
    const sixMonthChartData: Array<{ month: string; income: number; expenses: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const dateIterator = subMonths(today, i);
      const monthForChart = getMonth(dateIterator);
      const yearForChart = getYear(dateIterator);
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      transactions.forEach(t => {
        const transactionDate = parseISO(t.date);
        if (isValid(transactionDate) && getYear(transactionDate) === yearForChart && getMonth(transactionDate) === monthForChart) {
          if (t.type === 'Entrata' && t.status === 'Completato') monthlyIncome += t.amount;
          else if (t.type === 'Uscita' && t.status === 'Completato') monthlyExpenses += Math.abs(t.amount);
        }
      });
      sixMonthChartData.push({ month: format(dateIterator, "MMM", { locale: it }), income: monthlyIncome, expenses: monthlyExpenses });
    }
    setLastSixMonthsChartData(sixMonthChartData);

    // Calculate Expense Breakdown for Current Month (Pie Chart)
    setIsLoadingExpenseBreakdown(true);
    const currentMonthExpensesByCategory: Record<string, number> = {};
    transactions
      .filter(t => {
        const transactionDate = parseISO(t.date);
        return isValid(transactionDate) && getYear(transactionDate) === currentYearValue && getMonth(transactionDate) === currentMonthValue && t.type === 'Uscita' && t.status === 'Completato';
      })
      .forEach(t => {
        currentMonthExpensesByCategory[t.category] = (currentMonthExpensesByCategory[t.category] || 0) + Math.abs(t.amount);
      });
    setExpenseBreakdownCurrentMonth(
      Object.entries(currentMonthExpensesByCategory)
        .map(([name, value], index) => ({ name, value, fill: pieChartColors[index % pieChartColors.length] }))
        .filter(item => item.value > 0)
    );
    setIsLoadingExpenseBreakdown(false);
    
    // Calculate Cash Flow for Current Month (Line Chart)
    setIsLoadingCashflow(true);
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    
    let dailyRunningBalance = 0; 
    const cashflowData = daysInMonth.map(day => {
        let dailyNet = 0;
        transactions.forEach(t => {
            const transactionDate = parseISO(t.date);
            if (isValid(transactionDate) && isEqual(transactionDate, day) && t.status === 'Completato') {
                dailyNet += t.amount; // Amount is signed
            }
        });
        dailyRunningBalance += dailyNet;
        return { date: format(day, "dd/MM"), cashflow: dailyRunningBalance };
    });
    setCashflowCurrentMonth(cashflowData);
    setIsLoadingCashflow(false);

    // Calculate Top Expense Categories for Current Month (Table)
    setIsLoadingTopCategories(true);
    setTopExpenseCategoriesCurrentMonth(
      Object.entries(currentMonthExpensesByCategory)
        .sort(([, a], [, b]) => b - a) 
        .map(([category, amount]) => ({ category, amount }))
    );
    setIsLoadingTopCategories(false);


  }, [transactions, isLoadingTransactions, transactionsError, bankBalance]); // Removed isClient from deps, not needed here

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
    } catch (e: any) {
      console.error("Error generating dashboard insight:", e);
      const errorMessage = e.message || "Errore sconosciuto durante la generazione dell'insight.";
      setInsightError(`Errore AI: ${errorMessage}`);
      setDashboardInsight(null); 
      toast({ title: "Errore Generazione Insight", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingInsight(false);
    }
  }, [currentMonthSummary, toast, isLoadingTransactions]); // Added isLoadingTransactions dependency
  
  useEffect(() => {
    if (
      isClient && // Ensure we are on client-side
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
    isClient,
    currentMonthSummary,
    dashboardInsight,
    isLoadingInsight,
    insightError,
    handleGenerateInsight,
    isLoadingTransactions,
    transactionsError
  ]);
  
  const mainContentLoading = isLoadingTransactions || isLoadingBankBalance;

  if (mainContentLoading && isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl font-medium flex items-center">
                  <Landmark className="mr-2 h-5 w-5 text-primary" />
                  Giacenza Bancaria Totale
                </CardTitle>
                <CardDescription>Liquidità attuale disponibile nel conto dello studio.</CardDescription>
              </div>
              <AlertDialog open={isEditingBankBalance} onOpenChange={setIsEditingBankBalance}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setNewBankBalanceValue(bankBalance.toString())}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifica
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Modifica Giacenza Bancaria</AlertDialogTitle>
                    <AlertDialogDescription>
                      Inserisci il nuovo importo totale della liquidità disponibile.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="bankBalanceInput" className="sr-only">Nuova Giacenza</Label>
                    <Input
                      id="bankBalanceInput"
                      type="number"
                      step="0.01"
                      value={newBankBalanceValue}
                      onChange={(e) => setNewBankBalanceValue(e.target.value)}
                      placeholder="Es. 15000.00"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUpdateBankBalance} disabled={isLoadingBankBalance}>
                      {isLoadingBankBalance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salva Giacenza
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              {isLoadingBankBalance ? (
                <div className="flex items-center justify-center h-10">
                   <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-4xl font-bold text-primary">
                  €{isClient ? bankBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : bankBalance.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>

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
                 <p className="text-xs text-muted-foreground">Differenza tra entrate e uscite.</p>
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
                Rigenera Insight AI
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
                          : `Insight AI non ancora disponibile. Prova a generarlo.`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Distribuzione Spese (Mese Corrente)
                </CardTitle>
                <CardDescription>Ripartizione delle uscite per categoria nel mese corrente.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {isLoadingExpenseBreakdown ? <Loader2 className="h-8 w-8 animate-spin" /> : 
                  expenseBreakdownCurrentMonth.length > 0 ? (
                  <DashboardPieChart data={expenseBreakdownCurrentMonth} />
                ) : (
                  <p className="text-muted-foreground h-[250px] flex items-center justify-center">Nessuna spesa registrata per il mese corrente (da Firestore) per il grafico a torta.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Flusso di Cassa (Mese Corrente)
                </CardTitle>
                <CardDescription>Andamento del saldo giornaliero (variazione) nel mese corrente.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCashflow ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                  <DashboardCashflowLineChart data={cashflowCurrentMonth} config={cashflowChartConfig} />
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-primary" />
                Categorie di Uscite (Mese Corrente)
              </CardTitle>
              <CardDescription>Dettaglio delle uscite per categoria nel mese corrente.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTopCategories ? <Loader2 className="h-8 w-8 animate-spin" /> : 
                topExpenseCategoriesCurrentMonth.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Importo Speso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topExpenseCategoriesCurrentMonth.map(cat => (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          €{isClient ? cat.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : cat.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nessuna uscita registrata per il mese corrente (da Firestore) per le categorie.</p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                  <TargetIcon className="mr-2 h-5 w-5 text-primary" />
                  Obiettivi Finanziari Chiave
              </CardTitle>
              <CardDescription>Monitoraggio dei primi obiettivi impostati (da Firestore).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingObjectives ? <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                keyFinancialObjectives.length > 0 ? (
                  keyFinancialObjectives.map(obj => (
                    <div key={obj.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold">{obj.name}</h4>
                        <Badge variant={obj.current >= obj.target ? "default" : "secondary"} className={obj.current >= obj.target ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300" : ""}>
                          {obj.current >= obj.target ? "Completato" : "In Corso"}
                        </Badge>
                      </div>
                      <Progress value={obj.target > 0 ? (obj.current / obj.target) * 100 : 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {isClient ? obj.current.toLocaleString('it-IT') : obj.current}{obj.unit} / {isClient ? obj.target.toLocaleString('it-IT') : obj.target}{obj.unit}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Nessun obiettivo finanziario trovato in Firestore.</p>
              )}
              <Button variant="link" onClick={() => router.push('/budget-objectives')} className="w-full">
                Vedi tutti gli obiettivi nella sezione 'Budget & Obiettivi'
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
    

    


