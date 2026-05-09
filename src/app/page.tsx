"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  BotMessageSquare,
  Loader2,
  AlertCircle,
  Wand2,
  FileText,
  Landmark,
  Edit,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Target as TargetIcon,
  Camera,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import type { ChartConfig } from "@/components/ui/chart";
import DashboardBarChart from "@/components/charts/dashboard-bar-chart";
import DashboardPieChart from "@/components/charts/dashboard-pie-chart";
import DashboardCashflowLineChart from "@/components/charts/dashboard-cashflow-line-chart";
import InvoiceScannerModal from "@/components/invoice-scanner-modal";
import {
  generateDashboardInsight,
  type GenerateDashboardInsightInput,
  type GenerateDashboardInsightOutput,
} from "@/ai/flows/generate-dashboard-insight-flow";
import { type Transaction } from "@/data/transactions-data";
import type { ObjectiveListItem } from "@/app/budget-objectives/page";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  doc,
  getDoc,
  setDoc,
  limit,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import {
  format,
  parseISO,
  isValid,
  getMonth,
  getYear,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
  isEqual,
  isSameMonth,
  isSameYear,
  startOfYear,
} from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { siteConfig } from "@/config/site";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCategories } from "@/contexts/category-context";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const dashboardChartConfig = {
  income: { label: "Entrate", color: "#FFD747" },
  expenses: { label: "Uscite", color: "#1D1D1D" },
} satisfies ChartConfig;

const cashflowChartConfig = {
  cashflow: { label: "Flusso di Cassa", color: "#FFD747" },
} satisfies ChartConfig;

const BANK_BALANCE_DOC_PATH = "studioInfo/mainBalance";
const pieChartColors = [
  "#FFD747", "#1D1D1D", "#A8A29E", "#D4C4A8", "#78716C",
  "#6EE7B7", "#93C5FD", "#FCA5A5", "#C4B5FD", "#FDE68A",
];

// Pastel color palette for category cards — each category gets a distinct style
const categoryPastelPalette = [
  { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-900", header: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", dot: "bg-blue-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-900", header: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-400" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", header: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-400" },
  { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-900", header: "text-rose-700 dark:text-rose-300", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", dot: "bg-rose-400" },
  { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-900", header: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-400" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-900", header: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", dot: "bg-cyan-400" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-900", header: "text-orange-700 dark:text-orange-300", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-400" },
  { bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-900", header: "text-pink-700 dark:text-pink-300", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300", dot: "bg-pink-400" },
  { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-900", header: "text-teal-700 dark:text-teal-300", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300", dot: "bg-teal-400" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-900", header: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", dot: "bg-indigo-400" },
];

interface DetailCardData {
  category: string;
  totalAmount: number;
  itemCount: number;
  topItems: Array<{ name: string; amount: number }>;
}

const generateAvailablePeriodsForCategories = (transactions: Transaction[]) => {
  const periods = new Set<string>();
  if (transactions.length === 0) {
    periods.add(format(new Date(), "yyyy-MM"));
  } else {
    transactions.forEach((t) => {
      const date = parseISO(t.date);
      if (isValid(date)) {
        periods.add(format(date, "yyyy-MM"));
      }
    });
  }

  const sortedPeriods = Array.from(periods).sort().reverse();
  const years = new Set<string>();
  const monthsByYear: Record<string, { value: string; label: string }[]> = {};

  sortedPeriods.forEach((period) => {
    const [yearStr, monthStr] = period.split("-");
    years.add(yearStr);
    if (!monthsByYear[yearStr]) {
      monthsByYear[yearStr] = [];
    }
    const monthIndex = parseInt(monthStr, 10) - 1;
    monthsByYear[yearStr].push({
      value: monthIndex.toString(),
      label: format(new Date(parseInt(yearStr), monthIndex), "MMMM", { locale: it }),
    });
  });

  for (const year in monthsByYear) {
    monthsByYear[year] = Array.from(new Set(monthsByYear[year].map((m) => m.value)))
      .map((value) => monthsByYear[year].find((m) => m.value === value)!)
      .sort((a, b) => parseInt(a.value) - parseInt(b.value));
  }

  const sortedYearsArray = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  if (sortedYearsArray.length === 0 && years.size === 0) {
    const currentYr = getYear(new Date()).toString();
    sortedYearsArray.push(currentYr);
    monthsByYear[currentYr] = [{
      value: getMonth(new Date()).toString(),
      label: format(new Date(), "MMMM", { locale: it }),
    }];
  }

  return { years: sortedYearsArray, monthsByYear };
};

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { transactionsVersion, incrementTransactionsVersion } = useAuth();
  const { expenseCategories } = useCategories();

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  const [currentMonthSummary, setCurrentMonthSummary] = useState<{
    income: number;
    expenses: number;
    balance: number;
  }>({ income: 0, expenses: 0, balance: 0 });

  const [lastSixMonthsChartData, setLastSixMonthsChartData] = useState<
    Array<{ month: string; income: number; expenses: number }>
  >([]);

  const [dashboardInsight, setDashboardInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const [bankBalance, setBankBalance] = useState<number>(0);
  const [isLoadingBankBalance, setIsLoadingBankBalance] = useState<boolean>(true);
  const [isEditingBankBalance, setIsEditingBankBalance] = useState<boolean>(false);
  const [newBankBalanceValue, setNewBankBalanceValue] = useState<string>("");

  const [expenseBreakdownCurrentMonth, setExpenseBreakdownCurrentMonth] = useState<
    Array<{ name: string; value: number; fill: string }>
  >([]);
  const [isLoadingExpenseBreakdown, setIsLoadingExpenseBreakdown] = useState(true);

  const [cashflowCurrentMonth, setCashflowCurrentMonth] = useState<
    Array<{ date: string; cashflow: number }>
  >([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(true);

  const [ytdSummary, setYtdSummary] = useState<{
    income: number;
    expenses: number;
    balance: number;
  }>({ income: 0, expenses: 0, balance: 0 });

  const [detailedExpenseCategoryCards, setDetailedExpenseCategoryCards] = useState<DetailCardData[]>([]);
  const [isLoadingDetailedCategories, setIsLoadingDetailedCategories] = useState(true);

  const [keyFinancialObjectives, setKeyFinancialObjectives] = useState<ObjectiveListItem[]>([]);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);

  const { years: availableYearsForCategories, monthsByYear: monthsByYearForCategories } = useMemo(
    () => generateAvailablePeriodsForCategories(transactions),
    [transactions]
  );

  const [categoriesSelectedYear, setCategoriesSelectedYear] = useState<string>(
    () => availableYearsForCategories[0] || getYear(new Date()).toString()
  );
  const [categoriesSelectedMonth, setCategoriesSelectedMonth] = useState<string>(() => {
    const initialYear = availableYearsForCategories[0] || getYear(new Date()).toString();
    const yearMonths = monthsByYearForCategories[initialYear] || [];
    const currentMonthActual = getMonth(new Date()).toString();
    return (
      yearMonths.find((m) => m.value === currentMonthActual)?.value ||
      yearMonths[0]?.value ||
      getMonth(new Date()).toString()
    );
  });
  const [availableMonthsForCategoriesCard, setAvailableMonthsForCategoriesCard] = useState(
    monthsByYearForCategories[categoriesSelectedYear] || []
  );

  useEffect(() => { setIsClient(true); }, []);

  const handleScannerItemsAccepted = async (items: any[]) => {
    try {
      const batch = writeBatch(db);
      for (const data of items) {
        const transactionDataToSave: any = {
          date: Timestamp.fromDate(data.date),
          description: data.description || "",
          category: data.category,
          subcategory: data.subcategory || "",
          type: data.type,
          amount: data.type === "Uscita" ? -Math.abs(data.amount) : Math.abs(data.amount),
          status: data.status,
          isRecurring: false,
          originalRecurringId: null,
          recurrenceDetails: null,
        };
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, transactionDataToSave);
      }
      await batch.commit();
      toast({ title: "Importazione Completata", description: `${items.length} voci salvate con successo.` });
      incrementTransactionsVersion();
    } catch (error: any) {
      toast({ title: "Errore Importazione", description: error.message, variant: "destructive" });
    }
  };

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
      toast({ title: "Errore Giacenza Bancaria", description: "Impossibile caricare la giacenza bancaria.", variant: "destructive" });
      setBankBalance(0);
      setNewBankBalanceValue("0");
    } finally {
      setIsLoadingBankBalance(false);
    }
  }, [toast]);

  const handleUpdateBankBalance = async () => {
    const newBalance = parseFloat(newBankBalanceValue);
    if (isNaN(newBalance)) {
      toast({ title: "Valore Non Valido", description: "Inserisci un importo valido.", variant: "destructive" });
      return;
    }
    setIsLoadingBankBalance(true);
    try {
      const balanceDocRef = doc(db, BANK_BALANCE_DOC_PATH);
      await runTransaction(db, async (transaction) => {
        transaction.set(balanceDocRef, { balance: newBalance }, { merge: true });
      });
      setBankBalance(newBalance);
      toast({
        title: "Giacenza Aggiornata",
        description: `Giacenza aggiornata a €${newBalance.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      });
      setIsEditingBankBalance(false);
    } catch (error) {
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare la giacenza.", variant: "destructive" });
    } finally {
      setIsLoadingBankBalance(false);
    }
  };

  const fetchFirestoreTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const q = query(transactionsCollectionRef, orderBy("date", "asc"));
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
          status: data.status as Transaction["status"],
          isRecurring: data.isRecurring || false,
          recurrenceDetails: data.recurrenceDetails
            ? {
                ...data.recurrenceDetails,
                startDate: data.recurrenceDetails.startDate instanceof Timestamp
                  ? format(data.recurrenceDetails.startDate.toDate(), "yyyy-MM-dd")
                  : data.recurrenceDetails.startDate,
                endDate: data.recurrenceDetails.endDate && data.recurrenceDetails.endDate instanceof Timestamp
                  ? format(data.recurrenceDetails.endDate.toDate(), "yyyy-MM-dd")
                  : undefined,
              }
            : undefined,
          originalRecurringId: data.originalRecurringId,
        });
      });
      setTransactions(fetchedTransactions);

      const { years: yearsFromDataCat, monthsByYear: monthsFromDataCat } = generateAvailablePeriodsForCategories(fetchedTransactions);
      if (yearsFromDataCat.length > 0) {
        const initialCatYear = yearsFromDataCat.includes(getYear(new Date()).toString())
          ? getYear(new Date()).toString()
          : yearsFromDataCat[0];
        setCategoriesSelectedYear(initialCatYear);
        const initialCatMonths = monthsFromDataCat[initialCatYear] || [];
        const currentActualCatMonth = getMonth(new Date()).toString();
        const defaultCatMonth =
          initialCatMonths.find((m) => m.value === currentActualCatMonth)?.value ||
          initialCatMonths[0]?.value ||
          getMonth(new Date()).toString();
        setCategoriesSelectedMonth(defaultCatMonth);
      }
    } catch (error: any) {
      let detailedError = "Impossibile caricare le transazioni.";
      if (error.message) detailedError += ` ${error.message}`;
      setTransactionsError(detailedError);
      toast({ title: "Errore Caricamento Dati", description: detailedError, variant: "destructive" });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [toast]);

  const fetchKeyObjectives = useCallback(async () => {
    setIsLoadingObjectives(true);
    try {
      const objectivesCol = collection(db, "objectives");
      const qObjectives = query(objectivesCol, orderBy("name"), limit(3));
      const objectivesSnapshot = await getDocs(qObjectives);
      const fetchedObjectives: ObjectiveListItem[] = [];
      objectivesSnapshot.forEach((docSnap) => {
        fetchedObjectives.push({ id: docSnap.id, ...docSnap.data() } as ObjectiveListItem);
      });
      setKeyFinancialObjectives(fetchedObjectives);
    } catch (error) {
      console.error("Errore caricamento obiettivi:", error);
    } finally {
      setIsLoadingObjectives(false);
    }
  }, []);

  useEffect(() => {
    fetchFirestoreTransactions();
    fetchBankBalance();
    fetchKeyObjectives();
  }, [fetchFirestoreTransactions, fetchBankBalance, fetchKeyObjectives, transactionsVersion]);

  useEffect(() => {
    const newAvailableMonths = monthsByYearForCategories[categoriesSelectedYear] || [];
    setAvailableMonthsForCategoriesCard(newAvailableMonths);
    if (!newAvailableMonths.find((m) => m.value === categoriesSelectedMonth)) {
      const newDefaultMonth = newAvailableMonths[0]?.value || getMonth(new Date()).toString();
      setCategoriesSelectedMonth(newDefaultMonth);
    }
  }, [categoriesSelectedYear, monthsByYearForCategories, categoriesSelectedMonth]);

  useEffect(() => {
    if (isLoadingTransactions || transactionsError) {
      setCurrentMonthSummary({ income: 0, expenses: 0, balance: 0 });
      setYtdSummary({ income: 0, expenses: 0, balance: 0 });
      setLastSixMonthsChartData([]);
      setExpenseBreakdownCurrentMonth([]);
      setCashflowCurrentMonth([]);
      setIsLoadingExpenseBreakdown(false);
      setIsLoadingCashflow(false);
      return;
    }

    const today = new Date();
    const currentMonthValue = getMonth(today);
    const currentYearValue = getYear(today);

    // ── Current month summary ──
    let cmIncome = 0;
    let cmExpenses = 0;
    const currentMonthTransactions = transactions.filter((t) => {
      const d = parseISO(t.date);
      return isValid(d) && getYear(d) === currentYearValue && getMonth(d) === currentMonthValue && t.status === "Completato";
    });
    currentMonthTransactions.forEach((t) => {
      if (t.type === "Entrata") cmIncome += t.amount;
      else if (t.type === "Uscita") cmExpenses += Math.abs(t.amount);
    });
    setCurrentMonthSummary({ income: cmIncome, expenses: cmExpenses, balance: cmIncome - cmExpenses });

    // ── YTD summary (Jan 1 → today, current year) ──
    let ytdIncome = 0;
    let ytdExpenses = 0;
    const ytdTransactions = transactions.filter((t) => {
      const d = parseISO(t.date);
      return isValid(d) && getYear(d) === currentYearValue && t.status === "Completato";
    });
    ytdTransactions.forEach((t) => {
      if (t.type === "Entrata") ytdIncome += t.amount;
      else if (t.type === "Uscita") ytdExpenses += Math.abs(t.amount);
    });
    setYtdSummary({ income: ytdIncome, expenses: ytdExpenses, balance: ytdIncome - ytdExpenses });

    // ── 6-month bar chart ──
    const sixMonthChartData: Array<{ month: string; income: number; expenses: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const dateIterator = subMonths(today, i);
      const monthForChart = getMonth(dateIterator);
      const yearForChart = getYear(dateIterator);
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      transactions.forEach((t) => {
        const d = parseISO(t.date);
        if (isValid(d) && getYear(d) === yearForChart && getMonth(d) === monthForChart && t.status === "Completato") {
          if (t.type === "Entrata") monthlyIncome += t.amount;
          else if (t.type === "Uscita") monthlyExpenses += Math.abs(t.amount);
        }
      });
      sixMonthChartData.push({ month: format(dateIterator, "MMM", { locale: it }), income: monthlyIncome, expenses: monthlyExpenses });
    }
    setLastSixMonthsChartData(sixMonthChartData);

    // ── Expense breakdown — YTD (Jan→today) ──
    setIsLoadingExpenseBreakdown(true);
    const ytdExpensesByCategory: Record<string, number> = {};
    ytdTransactions.filter((t) => t.type === "Uscita").forEach((t) => {
      ytdExpensesByCategory[t.category] = (ytdExpensesByCategory[t.category] || 0) + Math.abs(t.amount);
    });
    setExpenseBreakdownCurrentMonth(
      Object.entries(ytdExpensesByCategory)
        .map(([name, value], index) => ({ name, value, fill: pieChartColors[index % pieChartColors.length] }))
        .filter((item) => item.value > 0)
    );
    setIsLoadingExpenseBreakdown(false);

    // ── Cashflow — YTD monthly (one point per month, Jan→current month) ──
    setIsLoadingCashflow(true);
    let ytdRunningBalance = 0;
    const ytdCashflowData: Array<{ date: string; cashflow: number }> = [];
    for (let m = 0; m <= currentMonthValue; m++) {
      let monthNet = 0;
      transactions.forEach((t) => {
        const d = parseISO(t.date);
        if (isValid(d) && getYear(d) === currentYearValue && getMonth(d) === m && t.status === "Completato") {
          monthNet += t.amount;
        }
      });
      ytdRunningBalance += monthNet;
      ytdCashflowData.push({
        date: format(new Date(currentYearValue, m), "MMM", { locale: it }),
        cashflow: ytdRunningBalance,
      });
    }
    setCashflowCurrentMonth(ytdCashflowData);
    setIsLoadingCashflow(false);
  }, [transactions, isLoadingTransactions, transactionsError, bankBalance]);

  useEffect(() => {
    if (isLoadingTransactions || transactionsError || Object.keys(expenseCategories).length === 0) {
      setDetailedExpenseCategoryCards([]);
      setIsLoadingDetailedCategories(false);
      return;
    }
    setIsLoadingDetailedCategories(true);

    const year = parseInt(categoriesSelectedYear);
    const month = parseInt(categoriesSelectedMonth);

    const transactionsForSelectedPeriod = transactions.filter((t) => {
      const transactionDate = parseISO(t.date);
      return (
        isValid(transactionDate) &&
        getYear(transactionDate) === year &&
        getMonth(transactionDate) === month &&
        t.status === "Completato"
      );
    });

    const mainCategoriesForCards = Object.keys(expenseCategories);
    const cardDataArray: DetailCardData[] = [];

    mainCategoriesForCards.forEach((category) => {
      const categoryTrans = transactionsForSelectedPeriod.filter(
        (t) => t.category === category && t.type === "Uscita"
      );
      if (categoryTrans.length === 0) return;

      const totalAmount = categoryTrans.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const subCategoryExpenses: Record<string, number> = {};
      categoryTrans.forEach((t) => {
        const itemKey = t.subcategory || t.description || "Voce non specificata";
        subCategoryExpenses[itemKey] = (subCategoryExpenses[itemKey] || 0) + Math.abs(t.amount);
      });

      const itemCount = Object.keys(subCategoryExpenses).length;
      const topItems = Object.entries(subCategoryExpenses)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([name, amount]) => ({ name, amount }));

      cardDataArray.push({ category, totalAmount, itemCount, topItems });
    });
    setDetailedExpenseCategoryCards(cardDataArray);
    setIsLoadingDetailedCategories(false);
  }, [transactions, isLoadingTransactions, transactionsError, categoriesSelectedYear, categoriesSelectedMonth, expenseCategories]);

  const handleGenerateInsight = useCallback(async () => {
    if (currentMonthSummary.income === 0 && currentMonthSummary.expenses === 0 && !isLoadingTransactions) {
      setDashboardInsight("Nessun dato di entrate o uscite per il mese corrente.");
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
      const errorMessage = e.message || "Errore sconosciuto.";
      setInsightError(`Errore AI: ${errorMessage}`);
      toast({ title: "Errore Generazione Insight", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingInsight(false);
    }
  }, [currentMonthSummary, toast, isLoadingTransactions]);

  const selectedPeriodForCategoriesTitle = useMemo(() => {
    if (isLoadingTransactions || availableYearsForCategories.length === 0 || availableMonthsForCategoriesCard.length === 0) {
      return format(new Date(), "MMMM yyyy", { locale: it });
    }
    const monthLabel =
      availableMonthsForCategoriesCard.find((m) => m.value === categoriesSelectedMonth)?.label ||
      format(new Date(parseInt(categoriesSelectedYear), parseInt(categoriesSelectedMonth)), "MMMM", { locale: it });
    return `${monthLabel} ${categoriesSelectedYear}`;
  }, [categoriesSelectedYear, categoriesSelectedMonth, availableYearsForCategories, availableMonthsForCategoriesCard, isLoadingTransactions]);

  const mainContentLoading = isLoadingTransactions || isLoadingBankBalance;

  if (!isClient || mainContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-[#FFD747] mb-4" />
        <p className="text-lg text-muted-foreground font-medium">Caricamento dashboard...</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    isClient ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toFixed(2);

  return (
    <>
      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6"
      >
        <div>
          <p className="kpi-label mb-1">Studio De Vecchi &amp; Mapelli</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Benvenuto
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "MMMM yyyy", { locale: it })}
          </p>
        </div>

        {/* KPI — mese + annuale */}
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
          {/* Mese corrente */}
          <div className="flex flex-col gap-1">
            <p className="kpi-label border-b border-border pb-1 mb-1">
              {format(new Date(), "MMMM yyyy", { locale: it })}
            </p>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="kpi-label">Entrate</p>
                <p className="text-2xl font-bold text-emerald-600">+€{fmt(currentMonthSummary.income)}</p>
              </div>
              <div className="text-right">
                <p className="kpi-label">Uscite</p>
                <p className="text-2xl font-bold text-rose-500">−€{fmt(currentMonthSummary.expenses)}</p>
              </div>
              <div className="text-right">
                <p className="kpi-label">Saldo</p>
                <p className={cn("text-2xl font-bold", currentMonthSummary.balance >= 0 ? "text-foreground" : "text-rose-500")}>
                  €{fmt(currentMonthSummary.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Separatore verticale */}
          <div className="hidden sm:block w-px bg-border self-stretch" />

          {/* YTD annuale */}
          <div className="flex flex-col gap-1">
            <p className="kpi-label border-b border-border pb-1 mb-1">
              Anno {getYear(new Date())} — gen → oggi
            </p>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="kpi-label">Entrate</p>
                <p className="text-2xl font-bold text-emerald-600">+€{fmt(ytdSummary.income)}</p>
              </div>
              <div className="text-right">
                <p className="kpi-label">Uscite</p>
                <p className="text-2xl font-bold text-rose-500">−€{fmt(ytdSummary.expenses)}</p>
              </div>
              <div className="text-right">
                <p className="kpi-label">Saldo</p>
                <p className={cn("text-2xl font-bold", ytdSummary.balance >= 0 ? "text-foreground" : "text-rose-500")}>
                  €{fmt(ytdSummary.balance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {transactionsError && (
        <Alert variant="destructive" className="mb-6 rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore Caricamento Dati</AlertTitle>
          <AlertDescription>{transactionsError}</AlertDescription>
        </Alert>
      )}

      {!transactionsError && (
        <div className="space-y-5 pb-12">

          {/* ── Row 1: Bank Balance (hero) ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="bento-item flex-row items-center justify-between gap-6 bg-white dark:bg-zinc-900 min-h-[120px]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFD747] flex items-center justify-center flex-shrink-0">
                <Landmark className="h-7 w-7 text-[#1D1D1D]" />
              </div>
              <div>
                <p className="kpi-label">Giacenza Bancaria Totale</p>
                {isLoadingBankBalance ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-1" />
                ) : (
                  <p className="text-5xl font-bold tracking-tight mt-0.5">
                    €{fmt(bankBalance)}
                  </p>
                )}
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider mt-2 border-[#E8E2D2] text-muted-foreground">
                  Liquidità certificata
                </Badge>
              </div>
            </div>

            <AlertDialog open={isEditingBankBalance} onOpenChange={setIsEditingBankBalance}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-9 px-4 gap-2 flex-shrink-0"
                  onClick={() => setNewBankBalanceValue(bankBalance.toString())}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifica
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Modifica Giacenza Bancaria</AlertDialogTitle>
                  <AlertDialogDescription>Aggiorna l'importo della liquidità disponibile.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="bankBalanceInput" className="font-medium mb-1.5 block">Importo (€)</Label>
                  <Input
                    id="bankBalanceInput"
                    type="number"
                    step="0.01"
                    value={newBankBalanceValue}
                    onChange={(e) => setNewBankBalanceValue(e.target.value)}
                    className="text-xl h-12 rounded-xl"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleUpdateBankBalance}
                    disabled={isLoadingBankBalance}
                    className="rounded-full bg-[#1D1D1D] dark:bg-white dark:text-black"
                  >
                    {isLoadingBankBalance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salva
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>

          {/* ── Row 2: Main Bento Grid ── */}
          <div className="bento-grid">

            {/* Bar Chart — 7 cols */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bento-item md:col-span-2 lg:col-span-7"
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="kpi-label">Andamento Finanziario</p>
                  <h3 className="text-lg font-bold mt-0.5">Ultimi 6 Mesi</h3>
                </div>
                <button
                  onClick={() => router.push("/monthly-summary")}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFD747] inline-block" />
                  Entrate
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1D1D1D] dark:bg-white inline-block" />
                  Uscite
                </span>
              </div>

              <div className="flex-1 min-h-[220px]">
                {lastSixMonthsChartData.some((d) => d.income > 0 || d.expenses > 0) ? (
                  <DashboardBarChart data={lastSixMonthsChartData} config={dashboardChartConfig} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 italic">
                    {isLoadingTransactions ? (
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    ) : (
                      <FileText size={40} className="mb-2 opacity-20" />
                    )}
                    <p className="text-sm">Nessun dato storico</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Objectives — dark card — 5 cols */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bento-item card-dark md:col-span-2 lg:col-span-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold opacity-50">Obiettivi</p>
                  <h3 className="text-lg font-bold mt-0.5 text-white">
                    Obiettivi Finanziari
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#FFD747]">
                    {keyFinancialObjectives.filter((o) => o.current >= o.target).length}/{keyFinancialObjectives.length}
                  </p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Completati</p>
                </div>
              </div>

              {isLoadingObjectives ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#FFD747]" />
                </div>
              ) : keyFinancialObjectives.length > 0 ? (
                <div className="space-y-4 flex-1">
                  {keyFinancialObjectives.map((obj) => {
                    const pct = obj.target > 0 ? Math.min((obj.current / obj.target) * 100, 100) : 0;
                    const done = obj.current >= obj.target;
                    return (
                      <div key={obj.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                              done ? "bg-[#FFD747]" : "bg-white/10"
                            )}>
                              <TargetIcon className={cn("h-3.5 w-3.5", done ? "text-[#1D1D1D]" : "text-white/60")} />
                            </div>
                            <p className={cn("text-sm font-medium truncate max-w-[130px]", done ? "line-through text-white/40" : "text-white")}>
                              {obj.name}
                            </p>
                          </div>
                          <p className="text-xs text-white/50 flex-shrink-0 ml-2">
                            {Math.round(pct)}%
                          </p>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden ml-9">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-[#FFD747] rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 italic">
                  <TargetIcon size={28} className="mb-2" />
                  <p className="text-sm">Nessun obiettivo attivo</p>
                </div>
              )}

              <button
                onClick={() => router.push("/budget-objectives")}
                className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                Gestisci obiettivi <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>

            {/* Pie Chart — 5 cols */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bento-item md:col-span-2 lg:col-span-5"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="kpi-label">Uscite YTD — gen → oggi</p>
                  <h3 className="text-lg font-bold mt-0.5">Asset Allocation</h3>
                </div>
                <PieChartIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div className="flex-1 flex items-center justify-center min-h-[200px]">
                {isLoadingExpenseBreakdown ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
                ) : expenseBreakdownCurrentMonth.length > 0 ? (
                  <DashboardPieChart data={expenseBreakdownCurrentMonth} />
                ) : (
                  <div className="text-muted-foreground/30 italic flex flex-col items-center">
                    <PieChartIcon size={40} className="mb-2 opacity-30" />
                    <p className="text-sm">Nessun dato</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Cashflow Line Chart — 7 cols */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bento-item md:col-span-2 lg:col-span-7"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="kpi-label">Flusso di Cassa YTD — gen → oggi</p>
                  <h3 className="text-lg font-bold mt-0.5">Liquidità Operativa {getYear(new Date())}</h3>
                </div>
                <LineChartIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-h-[200px]">
                {isLoadingCashflow ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
                  </div>
                ) : (
                  <DashboardCashflowLineChart data={cashflowCurrentMonth} config={cashflowChartConfig} />
                )}
              </div>
            </motion.div>
          </div>

          {/* ── AI Insight ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bento-item bg-white dark:bg-zinc-900"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#1D1D1D] dark:bg-[#FFD747] flex items-center justify-center flex-shrink-0">
                  <Wand2 className="h-5 w-5 text-[#FFD747] dark:text-[#1D1D1D]" />
                </div>
                <div>
                  <p className="kpi-label">Intelligenza Artificiale</p>
                  <h3 className="text-lg font-bold mt-0.5">Financial Insight AI</h3>
                </div>
              </div>
              <Button
                onClick={handleGenerateInsight}
                disabled={isLoadingInsight || isLoadingTransactions || (!isLoadingTransactions && currentMonthSummary.income === 0 && currentMonthSummary.expenses === 0)}
                className="rounded-full px-6 bg-[#1D1D1D] hover:bg-black dark:bg-[#FFD747] dark:text-[#1D1D1D] dark:hover:bg-[#FFC700] text-white"
              >
                {isLoadingInsight ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BotMessageSquare className="mr-2 h-4 w-4" />}
                {dashboardInsight ? "Rigenera Analisi" : "Genera Insight"}
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {isLoadingInsight && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-10 bg-muted/30 rounded-2xl border border-dashed border-border"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-[#FFD747] mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Elaborazione dati in corso...</p>
                </motion.div>
              )}
              {dashboardInsight && !isLoadingInsight && !insightError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative p-6 bg-muted/20 border border-border rounded-2xl"
                >
                  <div className="absolute -left-px top-8 bottom-8 w-1 bg-[#FFD747] rounded-full" />
                  <p className="text-foreground leading-relaxed text-base font-medium whitespace-pre-wrap italic pl-4">
                    "{dashboardInsight}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {insightError && !isLoadingInsight && (
              <Alert variant="destructive" className="rounded-xl mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{insightError}</AlertDescription>
              </Alert>
            )}

            {!dashboardInsight && !isLoadingInsight && !insightError && (
              <p className="text-xs text-muted-foreground italic">
                {isLoadingTransactions
                  ? "Sincronizzazione dati..."
                  : currentMonthSummary.income === 0 && currentMonthSummary.expenses === 0
                    ? "Nessun dato transazionale per questo mese."
                    : "Pronto per l'analisi dei flussi di cassa."}
              </p>
            )}
          </motion.div>

          {/* ── Category Breakdown ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="bento-item bg-white dark:bg-zinc-900"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div>
                <p className="kpi-label">Analisi Spese</p>
                <h3 className="text-lg font-bold mt-0.5">
                  Spese per Categoria —{" "}
                  <span className="text-muted-foreground font-normal text-base">{selectedPeriodForCategoriesTitle}</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border">
                <Select
                  value={categoriesSelectedMonth}
                  onValueChange={setCategoriesSelectedMonth}
                  disabled={availableMonthsForCategoriesCard.length === 0 || isLoadingTransactions || !!transactionsError}
                >
                  <SelectTrigger className="w-[110px] h-8 text-[11px] uppercase tracking-wider bg-transparent border-none shadow-none focus:ring-0">
                    <SelectValue placeholder="Mese" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonthsForCategoriesCard.length > 0 ? (
                      availableMonthsForCategoriesCard.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()} className="text-xs">{m.label}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value={getMonth(new Date()).toString()} disabled>
                        {format(new Date(), "MMMM", { locale: it })}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="w-px h-4 bg-border" />
                <Select
                  value={categoriesSelectedYear}
                  onValueChange={(value) => {
                    setCategoriesSelectedYear(value);
                    const newYearMonths = monthsByYearForCategories[value] || [];
                    const currentActualMonth = getMonth(new Date()).toString();
                    const newDefaultMonth =
                      newYearMonths.find((m) => m.value === categoriesSelectedMonth)?.value ||
                      newYearMonths.find((m) => m.value === currentActualMonth)?.value ||
                      newYearMonths[0]?.value ||
                      getMonth(new Date()).toString();
                    setCategoriesSelectedMonth(newDefaultMonth);
                  }}
                  disabled={availableYearsForCategories.length === 0 || isLoadingTransactions || !!transactionsError}
                >
                  <SelectTrigger className="w-[80px] h-8 text-[11px] uppercase tracking-wider bg-transparent border-none shadow-none focus:ring-0">
                    <SelectValue placeholder="Anno" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYearsForCategories.length > 0 ? (
                      availableYearsForCategories.map((y) => (
                        <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value={getYear(new Date()).toString()} disabled>
                        {getYear(new Date()).toString()}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingDetailedCategories ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
              </div>
            ) : detailedExpenseCategoryCards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {detailedExpenseCategoryCards.map((card, idx) => {
                  const palette = categoryPastelPalette[idx % categoryPastelPalette.length];
                  return (
                  <motion.div
                    key={card.category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "group p-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                      palette.bg, palette.border
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", palette.dot)} />
                        <div>
                          <h4 className={cn("text-sm font-bold", palette.header)}>{card.category}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                            {card.itemCount} {card.itemCount === 1 ? "operazione" : "operazioni"}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", palette.badge)}>
                        €{isClient ? card.totalAmount.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : card.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="h-px bg-border/50 my-3" />

                    <div className="space-y-1.5">
                      {card.topItems.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground truncate max-w-[140px]" title={item.name}>{item.name}</span>
                          <span className={cn("font-semibold", palette.header)}>
                            €{isClient ? item.amount.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : item.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/transactions"
                      className={cn(
                        "mt-3 flex items-center justify-center w-full py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-colors",
                        palette.badge
                      )}
                    >
                      Dettagli
                    </Link>
                  </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground italic text-sm">Nessuna uscita registrata per il periodo selezionato.</p>
              </div>
            )}
          </motion.div>

          {/* ── Scanner CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bento-item card-yellow flex-row items-center justify-between"
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold opacity-60">Importazione Rapida</p>
              <h3 className="text-xl font-bold mt-0.5">Importa Fattura</h3>
              <p className="text-sm opacity-70 mt-1">Scansiona e importa automaticamente le tue fatture con AI</p>
            </div>
            <Button
              onClick={() => setIsScannerModalOpen(true)}
              className="rounded-full px-6 bg-[#1D1D1D] text-white hover:bg-black flex-shrink-0 gap-2"
            >
              <Camera className="h-4 w-4" />
              Scansiona
            </Button>
          </motion.div>

        </div>
      )}

      <InvoiceScannerModal
        isOpen={isScannerModalOpen}
        onOpenChange={setIsScannerModalOpen}
        onItemsAccepted={handleScannerItemsAccepted}
      />
    </>
  );
}
