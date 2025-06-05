
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRight, Upload, Download, Edit, CalendarClock, Info, Target, CheckCircle, BotMessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardBarChart from "@/components/charts/dashboard-bar-chart";
import DashboardPieChart from "@/components/charts/dashboard-pie-chart";
import DashboardCashflowLineChart from "@/components/charts/dashboard-cashflow-line-chart";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, isValid, getMonth, getYear, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, formatISO, isFuture, isEqual, startOfToday } from "date-fns";
import { it } from "date-fns/locale";
import type { Transaction } from '@/data/transactions-data'; // Keep type definition
import { expenseCategories as expenseCategoryConfig } from '@/config/transaction-categories';
import { type ObjectiveListItem } from '@/app/budget-objectives/page'; // Keep type for objectives
import { generateDashboardInsight } from '@/ai/flows/generate-dashboard-insight-flow';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';


const barChartConfig = {
  income: { label: "Entrate", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite", color: "hsl(var(--chart-2))" },
};

const lineChartConfig = {
  cashflow: { label: "Flusso di Cassa", color: "hsl(var(--chart-1))" },
};

interface ExpenseCategoryDisplayData {
  title: string;
  value: number;
  itemCount: number;
  topItems: Array<{ name: string; amount: number }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
  pieFill: string;
}

const initialExpenseCategoriesDisplayData: ExpenseCategoryDisplayData[] = (Object.keys(expenseCategoryConfig) as Array<keyof typeof expenseCategoryConfig>).map((categoryKey, index) => {
    const colors = [
      { pieFill: "hsl(260 70% 75%)", bgColor: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-700 dark:text-purple-300", borderColor: "border-purple-300 dark:border-purple-700" },
      { pieFill: "hsl(150 60% 70%)", bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-700 dark:text-green-300", borderColor: "border-green-300 dark:border-green-700" },
      { pieFill: "hsl(340 80% 75%)", bgColor: "bg-pink-100 dark:bg-pink-900/30", textColor: "text-pink-700 dark:text-pink-300", borderColor: "border-pink-300 dark:border-pink-700" },
      { pieFill: "hsl(50 80% 70%)", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", textColor: "text-yellow-700 dark:text-yellow-300", borderColor: "border-yellow-300 dark:border-yellow-700" },
      { pieFill: "hsl(0 75% 72%)", bgColor: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-700 dark:text-red-300", borderColor: "border-red-300 dark:border-red-700" },
      { pieFill: "hsl(200 75% 70%)", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-700 dark:text-blue-300", borderColor: "border-blue-300 dark:border-blue-700" },
      { pieFill: "hsl(20 80% 72%)", bgColor: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-700 dark:text-orange-300", borderColor: "border-orange-300 dark:border-orange-700" },
    ];
    const color = colors[index % colors.length];
    return {
      title: categoryKey,
      value: 0, 
      itemCount: 0, 
      topItems: [], 
      ...color,
    };
});


interface ExpenseCategoryCardProps {
  title: string;
  value: number;
  itemCount: number;
  topItems: Array<{ name: string; amount: number }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
  onViewAllClick: (categoryName: string) => void;
  isClient: boolean;
}

const ExpenseCategoryCard: React.FC<ExpenseCategoryCardProps> = ({ title, value, itemCount, topItems, bgColor, textColor, borderColor, onViewAllClick, isClient }) => {
  return (
    <Card className={`${bgColor} ${borderColor} border shadow-lg hover:shadow-xl transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className={`text-xl font-headline ${textColor}`}>{title}</CardTitle>
          <Badge variant="secondary" className={`${textColor} ${bgColor.replace('bg-', 'bg-opacity-50 dark:bg-opacity-50').replace('-100', '-200').replace('-900/30', '-700')} border-none`}>
            {itemCount} voci
          </Badge>
        </div>
         <p className={`text-sm font-semibold ${textColor}`}>Totale: €{isClient ? value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1.5 text-sm">
          {topItems.slice(0, 3).map((item, index) => (
            <li key={index} className="flex justify-between items-center">
              <span className="text-muted-foreground truncate pr-2" title={item.name}>{item.name}</span>
              <span className={`font-medium ${textColor}`}>€{isClient ? item.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.amount.toFixed(2)}</span>
            </li>
          ))}
          {topItems.length === 0 && <li className="text-muted-foreground">Nessuna spesa registrata.</li>}
        </ul>
        <button
            onClick={() => onViewAllClick(title)}
            className={`mt-4 inline-flex items-center text-sm font-medium ${textColor} hover:underline focus:outline-none`}
        >
          Vedi tutte <ArrowRight className="ml-1 h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
};

const getObjectiveIcon = (iconName?: ObjectiveListItem['iconName']) => {
  switch (iconName) {
    case 'TrendingUp': return <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400"/>;
    case 'Target': return <Target className="h-5 w-5 text-blue-500 dark:text-blue-400"/>;
    case 'CheckCircle': return <CheckCircle className="h-5 w-5 text-primary"/>;
    default: return <Target className="h-5 w-5 text-gray-500 dark:text-gray-400"/>;
  }
};

// Static objectives data for now, as Firestore integration for objectives is separate
const staticObjectives: ObjectiveListItem[] = [
  { id: "obj1", name: "Aumentare Entrate del 15%", target: 15, current: 10, unit: "%", status: "In Corso", iconName: 'TrendingUp' },
  { id: "obj2", name: "Ridurre Sprechi Materiali del 5%", target: 5, current: 2, unit: "%", status: "In Corso", iconName: 'Target' },
];


export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogCategoryName, setDetailDialogCategoryName] = useState<string | null>(null);
  const [detailDialogTitle, setDetailDialogTitle] = useState<string>("");
  const [detailDialogDescription, setDetailDialogDescription] = useState<string>("");
  const [transactionsForDialog, setTransactionsForDialog] = useState<Transaction[]>([]);
  
  const [studioTotalBalance, setStudioTotalBalance] = useState<number>(50000); // Static for now
  const [isEditBalanceDialogOpen, setIsEditBalanceDialogOpen] = useState<boolean>(false);
  const [newBalanceInputValue, setNewBalanceInputValue] = useState<string>("50000");

  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState(0);
  const [currentMonthlyBalance, setCurrentMonthlyBalance] = useState(0);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [cashflowChartData, setCashflowChartData] = useState<any[]>([]);
  const [expenseCategoriesDisplay, setExpenseCategoriesDisplay] = useState<ExpenseCategoryDisplayData[]>(initialExpenseCategoriesDisplayData);
  const [upcomingTransactions, setUpcomingTransactions] = useState<Transaction[]>([]);
  const [dashboardObjectives, setDashboardObjectives] = useState<ObjectiveListItem[]>([]);

  const [dashboardInsight, setDashboardInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);

  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
    setDashboardObjectives(staticObjectives.slice(0, 2)); 
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
          amount: data.amount, // Firestore stores amount with correct sign
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
      console.error("Errore caricamento transazioni da Firestore:", error);
      toast({
        title: "Errore Caricamento Dati",
        description: "Impossibile caricare le transazioni da Firestore.",
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
    if (isClient) {
        setNewBalanceInputValue(studioTotalBalance.toLocaleString('it-IT', {minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: false}));
    } else {
        setNewBalanceInputValue(studioTotalBalance.toString());
    }
  }, [studioTotalBalance, isClient]);

  useEffect(() => {
    if (isLoadingTransactions || transactions.length === 0) return;

    const todayDate = startOfToday();
    const currentMonthNum = getMonth(todayDate);
    const currentYearNum = getYear(todayDate);

    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isValid(transactionDate) && getMonth(transactionDate) === currentMonthNum && getYear(transactionDate) === currentYearNum;
    });

    const incomeCurrentMonth = currentMonthTransactions
      .filter(t => t.type === 'Entrata')
      .reduce((sum, t) => sum + t.amount, 0);
    setTotalMonthlyIncome(incomeCurrentMonth);

    const expensesCurrentMonth = currentMonthTransactions
      .filter(t => t.type === 'Uscita')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0); // Use Math.abs for expenses
    setTotalMonthlyExpenses(expensesCurrentMonth);
    setCurrentMonthlyBalance(incomeCurrentMonth - expensesCurrentMonth);

    const monthlySummaries: { [key: string]: { income: number; expenses: number } } = {};
    for (let i = 5; i >= 0; i--) {
      const dateToProcess = subMonths(todayDate, i);
      const monthName = format(dateToProcess, "MMM", { locale: it });
      const year = getYear(dateToProcess);
      const monthKey = `${monthName}-${year}`;
      monthlySummaries[monthKey] = { income: 0, expenses: 0 };
    }

    transactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (isValid(transactionDate)) {
        const monthName = format(transactionDate, "MMM", { locale: it });
        const year = getYear(transactionDate);
        const monthKey = `${monthName}-${year}`;
        if (monthlySummaries[monthKey]) {
          if (t.type === 'Entrata') {
            monthlySummaries[monthKey].income += t.amount;
          } else if (t.type === 'Uscita') { // Ensure this check is correct for signed amounts
            monthlySummaries[monthKey].expenses += Math.abs(t.amount);
          }
        }
      }
    });
    const barData = Object.entries(monthlySummaries)
      .map(([monthYear, data]) => ({ month: monthYear.split('-')[0], income: data.income, expenses: data.expenses }))
      .slice(-6); 
    setBarChartData(barData);

    const currentMonthExpensesOnly = currentMonthTransactions.filter(t => t.type === 'Uscita');
    const expensesByCategory: { [category: string]: number } = {};
    currentMonthExpensesOnly.forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Math.abs(t.amount);
    });
    
    const updatedExpenseCategoriesDisplay = initialExpenseCategoriesDisplayData.map(catDisplay => {
        const totalForCategory = expensesByCategory[catDisplay.title] || 0;
        const categoryTransactions = currentMonthExpensesOnly.filter(t => t.category === catDisplay.title);
        const topItems = categoryTransactions
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 3)
            .map(t => ({ name: t.description || t.subcategory || 'N/D', amount: Math.abs(t.amount) }));

        return {
            ...catDisplay,
            value: totalForCategory,
            itemCount: categoryTransactions.length,
            topItems: topItems,
        };
    });
    setExpenseCategoriesDisplay(updatedExpenseCategoriesDisplay);
    setPieChartData(updatedExpenseCategoriesDisplay.filter(cat => cat.value > 0).map(cat => ({ name: cat.title, value: cat.value, fill: cat.pieFill })));

    const firstDayOfMonth = startOfMonth(todayDate);
    const lastDayOfMonth = endOfMonth(todayDate);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    let runningBalance = 0; // This needs a starting point, perhaps from previous month's balance or total balance

    const cashflowData = daysInMonth.map(day => {
        const dailyTransactions = transactions.filter(t => {
            const transactionDate = parseISO(t.date);
            return isValid(transactionDate) && format(transactionDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });
        // Amount is stored with sign in Firestore
        const dailyNet = dailyTransactions.reduce((sum, t) => sum + t.amount, 0); 
        runningBalance += dailyNet;
        return { date: format(day, "dd/MM"), cashflow: runningBalance };
    });
    setCashflowChartData(cashflowData);

    const upcoming = transactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return isValid(transactionDate) &&
               (t.status === 'Pianificato' || t.status === 'In Attesa') &&
               (isFuture(transactionDate) || isEqual(transactionDate, todayDate));
      }).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0,3);
    setUpcomingTransactions(upcoming);

  }, [transactions, isClient, isLoadingTransactions]); 

  useEffect(() => {
    const fetchInsight = async () => {
      if (isClient && !isLoadingTransactions && (totalMonthlyIncome > 0 || totalMonthlyExpenses > 0)) {
        setIsLoadingInsight(true);
        setDashboardInsight(null);
        try {
          const result = await generateDashboardInsight({
            totalIncome: totalMonthlyIncome,
            totalExpenses: totalMonthlyExpenses,
            balance: currentMonthlyBalance,
          });
          setDashboardInsight(result.insightText);
        } catch (error) {
          console.error("Error fetching dashboard insight:", error);
          setDashboardInsight("Impossibile caricare l'analisi AI al momento.");
        } finally {
          setIsLoadingInsight(false);
        }
      } else if (isClient && !isLoadingTransactions) {
         setDashboardInsight("Non ci sono dati sufficienti per un'analisi AI del mese corrente o nessuna transazione caricata.");
         setIsLoadingInsight(false);
      }
    };

    if (!isLoadingTransactions) {
        fetchInsight();
    }
  }, [isClient, totalMonthlyIncome, totalMonthlyExpenses, currentMonthlyBalance, isLoadingTransactions]);


  const handleOpenEditBalanceDialog = () => {
    if (isClient) {
        setNewBalanceInputValue(studioTotalBalance.toLocaleString('it-IT', {minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: false}));
    } else {
        setNewBalanceInputValue(studioTotalBalance.toString());
    }
    setIsEditBalanceDialogOpen(true);
  };

  const handleSaveBalance = () => {
    const newBalance = parseFloat(newBalanceInputValue.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(newBalance) && newBalance >= 0) {
      setStudioTotalBalance(newBalance);
      toast({
        title: "Saldo Studio Aggiornato",
        description: `Il nuovo saldo dello studio è €${isClient ? newBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : newBalance.toFixed(2)}. (Nota: Questo è un valore statico dimostrativo)`,
      });
      setIsEditBalanceDialogOpen(false);
    } else {
      toast({
        title: "Errore Input",
        description: "Inserisci un importo valido.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = () => {
    toast({
        title: "Importa Dati",
        description: "La funzionalità di importazione dati non è ancora implementata.",
        className: "text-blue-600 dark:text-blue-400",
    });
  };

  const handleExportData = () => {
     toast({
        title: "Esporta Dati",
        description: "La funzionalità di esportazione dati non è ancora implementata.",
        className: "text-purple-600 dark:text-purple-400",
    });
  };

  const filterTransactionsForDialog = (categoryName: string): Transaction[] => {
    const currentMonth = getMonth(new Date());
    const currentYearValue = getYear(new Date());

    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      if (!isValid(transactionDate)) return false;
      return t.category === categoryName &&
             t.type === 'Uscita' &&
             getMonth(transactionDate) === currentMonth &&
             getYear(transactionDate) === currentYearValue;
    });
  };

  const handlePieSliceClick = (sliceData: any) => {
    const categoryName = sliceData.name;
    setDetailDialogCategoryName(categoryName);
    setDetailDialogTitle(`Dettaglio Categoria: ${categoryName}`);
    setDetailDialogDescription(`Elenco delle transazioni di tipo "Uscita" per la categoria ${categoryName} nel mese corrente.`);
    setTransactionsForDialog(filterTransactionsForDialog(categoryName));
    setIsDetailDialogOpen(true);
  };

  const handleViewAllClick = (categoryName: string) => {
    setDetailDialogCategoryName(categoryName);
    setDetailDialogTitle(`Transazioni per: ${categoryName}`);
    setDetailDialogDescription(`Elenco completo delle transazioni di tipo "Uscita" per la categoria ${categoryName} nel mese corrente.`);
    setTransactionsForDialog(filterTransactionsForDialog(categoryName));
    setIsDetailDialogOpen(true);
  };

  if (isLoadingTransactions && isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati dashboard...</p>
      </div>
    );
  }


  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Panoramica finanziaria dello Studio De Vecchi & Mapelli."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleImportData} variant="outline" className="text-blue-600 dark:text-blue-400">
              <Upload className="mr-2 h-4 w-4" />
              Importa
            </Button>
            <Button onClick={handleExportData} variant="outline" className="text-purple-600 dark:text-purple-400">
              <Download className="mr-2 h-4 w-4" />
              Esporta
            </Button>
          </div>
        }
      />

      <Card className="mb-6 bg-primary text-primary-foreground p-2 rounded-lg shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Saldo Attuale Studio (Dimostrativo)</h2>
            <p className="text-4xl font-bold mt-1">
              €{isClient ? studioTotalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : studioTotalBalance.toFixed(2)}
            </p>
            <p className="text-xs text-primary-foreground/80 mt-1">Giacenza bancaria e liquidità totali.</p>
          </div>
          <Button variant="secondary" onClick={handleOpenEditBalanceDialog} className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground">
            <Edit className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        </div>
      </Card>

      <Dialog open={isEditBalanceDialogOpen} onOpenChange={setIsEditBalanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Saldo Attuale Studio (Dimostrativo)</DialogTitle>
            <DialogDescriptionComponent>
              Aggiorna la giacenza bancaria e la liquidità totale dello studio. (Valore solo dimostrativo)
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newBalance" className="mb-2 block">Nuovo Saldo Totale (€)</Label>
            <Input
              id="newBalance"
              type="text" 
              value={newBalanceInputValue}
              onChange={(e) => setNewBalanceInputValue(e.target.value)}
              placeholder="Es. 50000"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveBalance}>Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Totali (Mese)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">€{isClient? totalMonthlyIncome.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : totalMonthlyIncome.toFixed(2)}</div>
            {/* <p className="text-xs text-muted-foreground">+5.2% rispetto al mese scorso (esempio)</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Totali (Mese)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">€{isClient ? totalMonthlyExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : totalMonthlyExpenses.toFixed(2)}</div>
            {/* <p className="text-xs text-muted-foreground">-1.8% rispetto al mese scorso (esempio)</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Attuale (Mese)</CardTitle> 
            {currentMonthlyBalance >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentMonthlyBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              €{isClient ? currentMonthlyBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentMonthlyBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonthlyBalance >=0 ? "Bilancio mensile positivo" : "Bilancio mensile negativo"}
            </p>
          </CardContent>
        </Card>
      </div>
      
       <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <BotMessageSquare className="mr-2 h-5 w-5 text-primary" />
              Analisi Rapida AI (Mese Corrente)
            </CardTitle>
            <CardDescription>Un breve commento sulla situazione finanziaria mensile, basato sui dati di Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingInsight ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">L'AI sta analizzando i dati...</p>
              </div>
            ) : (
              <p className="text-sm text-foreground">{dashboardInsight || "Nessuna analisi disponibile o dati insufficienti."}</p>
            )}
          </CardContent>
        </Card>

      <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
         <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Entrate vs Uscite (Ultimi 6 Mesi)</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? 
                <DashboardBarChart data={barChartData} config={barChartConfig} />
                : <p className="text-muted-foreground text-center py-10">Dati insufficienti per il grafico a barre.</p>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <CalendarClock className="mr-2 h-5 w-5 text-primary" />
                Prossime Scadenze/Impegni
            </CardTitle>
            <CardDescription>Eventi finanziari pianificati o in attesa (da Firestore).</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTransactions.length > 0 ? (
              <ul className="space-y-3">
                {upcomingTransactions.map(t => (
                  <li key={t.id} className="flex items-start justify-between gap-2 p-2 border-b last:border-b-0">
                    <div className="flex-grow">
                      <p className="text-sm font-medium truncate" title={t.description}>{t.description || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isValid(parseISO(t.date)) ? format(parseISO(t.date), "dd MMM yyyy", { locale: it }) : "Data non valida"} - {t.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.type === 'Entrata' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t.type === 'Entrata' ? '+' : '-'}€{isClient ? Math.abs(t.amount).toLocaleString('it-IT', {minimumFractionDigits:2,maximumFractionDigits:2}) : Math.abs(t.amount).toFixed(2)}
                      </p>
                      <Badge variant={t.status === 'Pianificato' ? 'outline' : 'secondary'} className="text-xs mt-1">
                        {t.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Info className="w-8 h-8 text-muted-foreground mb-2"/>
                  <p className="text-sm text-muted-foreground">Nessuna scadenza imminente trovata in Firestore.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Distribuzione Spese (Mese Corrente)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieChartData.length > 0 ?
                <DashboardPieChart data={pieChartData} onSliceClick={handlePieSliceClick} />
                : <p className="text-muted-foreground text-center py-10">Nessuna spesa registrata per il mese corrente per il grafico a torta.</p>
            }
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle className="font-headline">Flusso di Cassa (Mese Corrente)</CardTitle>
          </CardHeader>
          <CardContent>
            {cashflowChartData.length > 0 ?
                <DashboardCashflowLineChart data={cashflowChartData} config={lineChartConfig} />
                : <p className="text-muted-foreground text-center py-10">Dati insufficienti per il grafico del flusso di cassa.</p>
            }
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-headline font-semibold mb-4 text-foreground">Categorie di Uscite (Mese Corrente)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenseCategoriesDisplay.map((category) => (
            <ExpenseCategoryCard 
              key={category.title} 
              {...category} 
              onViewAllClick={handleViewAllClick}
              isClient={isClient}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Obiettivi Finanziari Chiave (Dimostrativo)</CardTitle>
            <CardDescription>Monitoraggio dei primi obiettivi impostati (dati statici).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {dashboardObjectives.length > 0 ? dashboardObjectives.map((obj) => (
              <div key={obj.id} className="p-4 border rounded-lg shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getObjectiveIcon(obj.iconName)}
                    <h3 className="text-md font-semibold">{obj.name}</h3>
                  </div>
                  <Badge variant={obj.status === "Completato" ? "default" : "secondary"} className={obj.status === "Completato" ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-800/50 dark:text-green-300 dark:border-green-700" : ""}>
                    {obj.status}
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{isClient ? obj.current.toLocaleString('it-IT') : obj.current}{obj.unit} / {isClient ? obj.target.toLocaleString('it-IT') : obj.target}{obj.unit}</span>
                  </div>
                  <Progress value={obj.target > 0 ? (obj.current / obj.target) * 100 : 0} aria-label={`Progresso obiettivo ${obj.name}`} className={obj.status === "Completato" ? "[&>div]:bg-green-500 dark:[&>div]:bg-green-400" : ""} />
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-10">Nessun obiettivo finanziario impostato (dati dimostrativi).</p>
            )}
             <Badge variant="outline">Vedi tutti gli obiettivi nella sezione 'Budget & Obiettivi' (attualmente con dati statici).</Badge>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl"> 
          <DialogHeader>
            <DialogTitle>{detailDialogTitle}</DialogTitle>
            <DialogDescriptionComponent>
              {detailDialogDescription}
            </DialogDescriptionComponent>
          </DialogHeader>
          {transactionsForDialog && transactionsForDialog.length > 0 ? (
            <ScrollArea className="h-[400px] mt-4 border rounded-md"> 
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Sottocategoria</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsForDialog.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{isValid(parseISO(transaction.date)) ? format(parseISO(transaction.date), "dd/MM/yyyy", { locale: it }) : "Data non valida"}</TableCell>
                      <TableCell>{transaction.subcategory || "N/A"}</TableCell>
                      <TableCell>{transaction.description || "N/A"}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        -€{isClient ? Math.abs(transaction.amount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.abs(transaction.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Nessuna transazione di spesa trovata per la categoria "{detailDialogCategoryName}" nel mese corrente in Firestore.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

