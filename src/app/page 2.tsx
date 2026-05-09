"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  income: { label: "Entrate", color: "#8B7355" },
  expenses: { label: "Uscite", color: "#E8E2D2" },
} satisfies ChartConfig;

const cashflowChartConfig = {
  cashflow: { label: "Flusso di Cassa", color: "#4A3E2E" },
} satisfies ChartConfig;

const BANK_BALANCE_DOC_PATH = "studioInfo/mainBalance";
const pieChartColors = [
  "#8B7355", // Brown/Gold
  "#4A3E2E", // Dark text color
  "#E8E2D2", // Light border color
  "#A69076", // Muted text
  "#D4C4A8", // Mid-tone
];

interface DetailCardData {
  category: string;
  totalAmount: number;
  itemCount: number;
  topItems: Array<{ name: string; amount: number }>;
  colorClasses: {
    bg: string;
    text: string;
    border: string;
    textMuted?: string;
    bgAlt?: string;
  };
}
const categoryCardColors = [
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
  {
    bg: "bg-[#FDFCF7] dark:bg-zinc-900",
    text: "text-[#8B7355] dark:text-[#D4AF37]",
    border: "border-[#E8E2D2] dark:border-zinc-800",
    textMuted: "text-[#A69076] dark:text-[#A69076]",
  },
];

// Helper function to generate available periods (similar to monthly-summary)
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
      label: format(new Date(parseInt(yearStr), monthIndex), "MMMM", {
        locale: it,
      }),
    });
  });
  for (const year in monthsByYear) {
    monthsByYear[year] = Array.from(
      new Set(monthsByYear[year].map((m) => m.value)),
    )
      .map((value) => monthsByYear[year].find((m) => m.value === value)!)
      .sort((a, b) => parseInt(a.value) - parseInt(b.value));
  }

  const sortedYearsArray = Array.from(years).sort(
    (a, b) => parseInt(b) - parseInt(a),
  );
  if (sortedYearsArray.length === 0 && years.size === 0) {
    const currentYr = getYear(new Date()).toString();
    sortedYearsArray.push(currentYr);
    monthsByYear[currentYr] = [
      {
        value: getMonth(new Date()).toString(),
        label: format(new Date(), "MMMM", { locale: it }),
      },
    ];
  }

  return {
    years: sortedYearsArray,
    monthsByYear,
  };
};

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const { toast } = useToast();
  const router = useRouter();
  const { transactionsVersion, incrementTransactionsVersion } = useAuth(); // Per aggiornare i dati
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
  const [isLoadingBankBalance, setIsLoadingBankBalance] =
    useState<boolean>(true);
  const [isEditingBankBalance, setIsEditingBankBalance] =
    useState<boolean>(false);
  const [newBankBalanceValue, setNewBankBalanceValue] = useState<string>("");

  const [expenseBreakdownCurrentMonth, setExpenseBreakdownCurrentMonth] =
    useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [isLoadingExpenseBreakdown, setIsLoadingExpenseBreakdown] =
    useState(true);

  const [cashflowCurrentMonth, setCashflowCurrentMonth] = useState<
    Array<{ date: string; cashflow: number }>
  >([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(true);

  const [detailedExpenseCategoryCards, setDetailedExpenseCategoryCards] =
    useState<DetailCardData[]>([]);
  const [isLoadingDetailedCategories, setIsLoadingDetailedCategories] =
    useState(true);

  const [keyFinancialObjectives, setKeyFinancialObjectives] = useState<
    ObjectiveListItem[]
  >([]);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);

  const {
    years: availableYearsForCategories,
    monthsByYear: monthsByYearForCategories,
  } = useMemo(
    () => generateAvailablePeriodsForCategories(transactions),
    [transactions],
  );
  const [categoriesSelectedYear, setCategoriesSelectedYear] = useState<string>(
    () => availableYearsForCategories[0] || getYear(new Date()).toString(),
  );
  const [categoriesSelectedMonth, setCategoriesSelectedMonth] =
    useState<string>(() => {
      const initialYear =
        availableYearsForCategories[0] || getYear(new Date()).toString();
      const yearMonths = monthsByYearForCategories[initialYear] || [];
      const currentMonthActual = getMonth(new Date()).toString();
      return (
        yearMonths.find((m) => m.value === currentMonthActual)?.value ||
        yearMonths[0]?.value ||
        getMonth(new Date()).toString()
      );
    });
  const [
    availableMonthsForCategoriesCard,
    setAvailableMonthsForCategoriesCard,
  ] = useState(monthsByYearForCategories[categoriesSelectedYear] || []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScannerItemsAccepted = async (items: any[]) => {
    console.log(`Attempting to save ${items.length} items from scanner.`);
    try {
      const batch = writeBatch(db);
      for (const data of items) {
        const transactionDataToSave: any = {
          date: Timestamp.fromDate(data.date),
          description: data.description || "",
          category: data.category,
          subcategory: data.subcategory || "",
          type: data.type,
          amount:
            data.type === "Uscita"
              ? -Math.abs(data.amount)
              : Math.abs(data.amount),
          status: data.status,
          isRecurring: false,
          originalRecurringId: null,
          recurrenceDetails: null,
        };
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, transactionDataToSave);
      }
      await batch.commit();
      toast({
        title: "Importazione Completata",
        description: `${items.length} voci salvate con successo.`,
      });
      incrementTransactionsVersion();
    } catch (error: any) {
      console.error("!!! ERROR saving scanned transactions:", error);
      toast({
        title: "Errore Importazione",
        description: error.message,
        variant: "destructive",
      });
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
    if (isNaN(newBalance)) {
      // Check for NaN, allow negative balance if needed by business logic
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
      // Using a Firestore transaction to safely update the balance
      await runTransaction(db, async (transaction) => {
        // No need to read if we are just setting it to a new manual value
        transaction.set(
          balanceDocRef,
          { balance: newBalance },
          { merge: true },
        );
      });
      setBankBalance(newBalance);
      toast({
        title: "Giacenza Aggiornata",
        description: `La giacenza bancaria è stata aggiornata a €${newBalance.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      });
      setIsEditingBankBalance(false);
    } catch (error) {
      console.error("Errore aggiornamento giacenza bancaria:", error);
      toast({
        title: "Errore Aggiornamento Giacenza",
        description:
          "Impossibile aggiornare la giacenza bancaria in Firestore.",
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
      const q = query(transactionsCollectionRef, orderBy("date", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTransactions.push({
          id: doc.id,
          date:
            data.date instanceof Timestamp
              ? format(data.date.toDate(), "yyyy-MM-dd")
              : data.date,
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
                startDate:
                  data.recurrenceDetails.startDate instanceof Timestamp
                    ? format(
                        data.recurrenceDetails.startDate.toDate(),
                        "yyyy-MM-dd",
                      )
                    : data.recurrenceDetails.startDate,
                endDate:
                  data.recurrenceDetails.endDate &&
                  data.recurrenceDetails.endDate instanceof Timestamp
                    ? format(
                        data.recurrenceDetails.endDate.toDate(),
                        "yyyy-MM-dd",
                      )
                    : undefined,
              }
            : undefined,
          originalRecurringId: data.originalRecurringId,
        });
      });
      setTransactions(fetchedTransactions);

      const { years: yearsFromDataCat, monthsByYear: monthsFromDataCat } =
        generateAvailablePeriodsForCategories(fetchedTransactions);
      if (yearsFromDataCat.length > 0) {
        const initialCatYear = yearsFromDataCat.includes(
          getYear(new Date()).toString(),
        )
          ? getYear(new Date()).toString()
          : yearsFromDataCat[0];
        setCategoriesSelectedYear(initialCatYear);

        const initialCatMonths = monthsFromDataCat[initialCatYear] || [];
        const currentActualCatMonth = getMonth(new Date()).toString();
        const defaultCatMonth =
          initialCatMonths.find((m) => m.value === currentActualCatMonth)
            ?.value ||
          initialCatMonths[0]?.value ||
          getMonth(new Date()).toString();
        setCategoriesSelectedMonth(defaultCatMonth);
      }
    } catch (error: any) {
      console.error(
        "Errore caricamento transazioni da Firestore (Dashboard):",
        error,
      );
      let detailedError =
        "Impossibile caricare le transazioni da Firestore per la dashboard.";
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
      const qObjectives = query(objectivesCol, orderBy("name"), limit(3));
      const objectivesSnapshot = await getDocs(qObjectives);
      const fetchedObjectives: ObjectiveListItem[] = [];
      objectivesSnapshot.forEach((docSnap) => {
        fetchedObjectives.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as ObjectiveListItem);
      });
      setKeyFinancialObjectives(fetchedObjectives);
    } catch (error) {
      console.error("Errore caricamento obiettivi chiave:", error);
      // Non mostriamo un toast per questo, potrebbe essere meno critico per la dashboard principale
    } finally {
      setIsLoadingObjectives(false);
    }
  }, []);

  useEffect(() => {
    fetchFirestoreTransactions();
    fetchBankBalance();
    fetchKeyObjectives();
  }, [
    fetchFirestoreTransactions,
    fetchBankBalance,
    fetchKeyObjectives,
    transactionsVersion,
  ]);

  // Effect for Category Card period selection
  useEffect(() => {
    const newAvailableMonths =
      monthsByYearForCategories[categoriesSelectedYear] || [];
    setAvailableMonthsForCategoriesCard(newAvailableMonths);
    if (!newAvailableMonths.find((m) => m.value === categoriesSelectedMonth)) {
      const newDefaultMonth =
        newAvailableMonths[0]?.value || getMonth(new Date()).toString();
      setCategoriesSelectedMonth(newDefaultMonth);
    }
  }, [
    categoriesSelectedYear,
    monthsByYearForCategories,
    categoriesSelectedMonth,
  ]);

  useEffect(() => {
    if (isLoadingTransactions || transactionsError) {
      setCurrentMonthSummary({ income: 0, expenses: 0, balance: 0 });
      setLastSixMonthsChartData([]);
      setExpenseBreakdownCurrentMonth([]);
      setCashflowCurrentMonth([]);
      // Do not reset detailedExpenseCategoryCards here, it's handled by its own effect
      setIsLoadingExpenseBreakdown(false);
      setIsLoadingCashflow(false);
      return;
    }

    const today = new Date();
    const currentMonthValue = getMonth(today);
    const currentYearValue = getYear(today);

    let cmIncome = 0;
    let cmExpenses = 0;
    const currentMonthTransactions = transactions.filter((t) => {
      const transactionDate = parseISO(t.date);
      return (
        isValid(transactionDate) &&
        getYear(transactionDate) === currentYearValue &&
        getMonth(transactionDate) === currentMonthValue &&
        t.status === "Completato"
      );
    });

    currentMonthTransactions.forEach((t) => {
      if (t.type === "Entrata") cmIncome += t.amount;
      else if (t.type === "Uscita") cmExpenses += Math.abs(t.amount);
    });
    setCurrentMonthSummary({
      income: cmIncome,
      expenses: cmExpenses,
      balance: cmIncome - cmExpenses,
    });

    const sixMonthChartData: Array<{
      month: string;
      income: number;
      expenses: number;
    }> = [];
    for (let i = 5; i >= 0; i--) {
      const dateIterator = subMonths(today, i);
      const monthForChart = getMonth(dateIterator);
      const yearForChart = getYear(dateIterator);
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      transactions.forEach((t) => {
        const transactionDate = parseISO(t.date);
        if (
          isValid(transactionDate) &&
          getYear(transactionDate) === yearForChart &&
          getMonth(transactionDate) === monthForChart &&
          t.status === "Completato"
        ) {
          if (t.type === "Entrata") monthlyIncome += t.amount;
          else if (t.type === "Uscita") monthlyExpenses += Math.abs(t.amount);
        }
      });
      sixMonthChartData.push({
        month: format(dateIterator, "MMM", { locale: it }),
        income: monthlyIncome,
        expenses: monthlyExpenses,
      });
    }
    setLastSixMonthsChartData(sixMonthChartData);

    setIsLoadingExpenseBreakdown(true);
    const currentMonthExpensesByCategory: Record<string, number> = {};
    currentMonthTransactions
      .filter((t) => t.type === "Uscita")
      .forEach((t) => {
        currentMonthExpensesByCategory[t.category] =
          (currentMonthExpensesByCategory[t.category] || 0) +
          Math.abs(t.amount);
      });
    setExpenseBreakdownCurrentMonth(
      Object.entries(currentMonthExpensesByCategory)
        .map(([name, value], index) => ({
          name,
          value,
          fill: pieChartColors[index % pieChartColors.length],
        }))
        .filter((item) => item.value > 0),
    );
    setIsLoadingExpenseBreakdown(false);

    setIsLoadingCashflow(true);
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    const daysInMonth = eachDayOfInterval({
      start: firstDayOfMonth,
      end: lastDayOfMonth,
    });

    let dailyRunningBalance = 0;
    const cashflowData = daysInMonth.map((day) => {
      let dailyNet = 0;
      transactions.forEach((t) => {
        const transactionDate = parseISO(t.date);
        // Check if transaction date is the same as the current day in the loop
        if (
          isValid(transactionDate) &&
          isSameYear(transactionDate, day) &&
          isSameMonth(transactionDate, day) &&
          transactionDate.getDate() === day.getDate() &&
          t.status === "Completato"
        ) {
          dailyNet += t.amount;
        }
      });
      dailyRunningBalance += dailyNet;
      return { date: format(day, "dd"), cashflow: dailyRunningBalance };
    });
    setCashflowCurrentMonth(cashflowData);
    setIsLoadingCashflow(false);
  }, [transactions, isLoadingTransactions, transactionsError, bankBalance]);

  // useEffect for detailedExpenseCategoryCards based on selected period
  useEffect(() => {
    if (
      isLoadingTransactions ||
      transactionsError ||
      Object.keys(expenseCategories).length === 0
    ) {
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

    mainCategoriesForCards.forEach((category, index) => {
      const categoryTrans = transactionsForSelectedPeriod.filter(
        (t) => t.category === category && t.type === "Uscita",
      );

      if (categoryTrans.length === 0) return;

      const totalAmount = categoryTrans.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0,
      );

      const subCategoryExpenses: Record<string, number> = {};
      categoryTrans.forEach((t) => {
        const itemKey =
          t.subcategory || t.description || "Voce non specificata";
        subCategoryExpenses[itemKey] =
          (subCategoryExpenses[itemKey] || 0) + Math.abs(t.amount);
      });

      const itemCount = Object.keys(subCategoryExpenses).length;
      const topItems = Object.entries(subCategoryExpenses)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([name, amount]) => ({ name, amount }));

      cardDataArray.push({
        category,
        totalAmount,
        itemCount,
        topItems,
        colorClasses: categoryCardColors[index % categoryCardColors.length],
      });
    });
    setDetailedExpenseCategoryCards(cardDataArray);
    setIsLoadingDetailedCategories(false);
  }, [
    transactions,
    isLoadingTransactions,
    transactionsError,
    categoriesSelectedYear,
    categoriesSelectedMonth,
    expenseCategories,
  ]);

  const handleGenerateInsight = useCallback(async () => {
    if (
      currentMonthSummary.income === 0 &&
      currentMonthSummary.expenses === 0 &&
      !isLoadingTransactions
    ) {
      setDashboardInsight(
        "Nessun dato di entrate o uscite per il mese corrente per generare un insight dettagliato.",
      );
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
      const errorMessage =
        e.message || "Errore sconosciuto durante la generazione dell'insight.";
      setInsightError(`Errore AI: ${errorMessage}`);
      setDashboardInsight(null);
      toast({
        title: "Errore Generazione Insight",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingInsight(false);
    }
  }, [currentMonthSummary, toast, isLoadingTransactions]);

  const mainContentLoading = isLoadingTransactions || isLoadingBankBalance;

  const selectedPeriodForCategoriesTitle = useMemo(() => {
    if (
      isLoadingTransactions ||
      availableYearsForCategories.length === 0 ||
      availableMonthsForCategoriesCard.length === 0
    ) {
      return format(new Date(), "MMMM yyyy", { locale: it });
    }
    const monthLabel =
      availableMonthsForCategoriesCard.find(
        (m) => m.value === categoriesSelectedMonth,
      )?.label ||
      format(
        new Date(
          parseInt(categoriesSelectedYear),
          parseInt(categoriesSelectedMonth),
        ),
        "MMMM",
        { locale: it },
      );
    return `${monthLabel} ${categoriesSelectedYear}`;
  }, [
    categoriesSelectedYear,
    categoriesSelectedMonth,
    availableYearsForCategories,
    availableMonthsForCategoriesCard,
    isLoadingTransactions,
  ]);

  // Show spinner until client is hydrated AND all initial data is fetched.
  // This prevents both the blank-flash and the hydration mismatch.
  if (!isClient || mainContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          Caricamento dati dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7] dark:bg-[#121212] selection:bg-[#FFD747]/30">
      {/* Premium Navigation/Header Area */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
      >
        <div className="space-y-1">
          <h1 className="text-5xl font-serif font-bold text-[#1D1D1D] dark:text-white tracking-tight leading-tight">
            Studio <span className="text-[#8B7355] italic font-medium">Panoramica</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-12 bg-[#FFD747] rounded-full" />
            <p className="text-sm text-[#8B7355] font-semibold uppercase tracking-[0.2em]">
              Gestione Finanziaria • {format(new Date(), "MMMM yyyy", { locale: it })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsScannerModalOpen(true)}
            className="group relative h-14 px-8 rounded-2xl bg-[#1D1D1D] hover:bg-[#2D2D2D] text-white shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FFD747]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-3">
              <Camera className="h-5 w-5 text-[#FFD747]" />
              <span className="text-base font-bold tracking-tight">Scansiona Fattura</span>
            </div>
          </Button>
          
          <div className="h-14 w-[1px] bg-[#E8E2D2] dark:bg-zinc-800 hidden md:block" />
          
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/monthly-summary")}
              variant="outline"
              className="h-14 w-14 p-0 rounded-2xl border-2 border-[#E8E2D2] hover:bg-white hover:border-[#FFD747] hover:text-[#FFD747] transition-all duration-300"
              title="Resoconto Mensile"
            >
              <FileText className="h-6 w-6" />
            </Button>
            <Button
              onClick={() => router.push("/annual-summary")}
              variant="outline"
              className="h-14 w-14 p-0 rounded-2xl border-2 border-[#E8E2D2] hover:bg-white hover:border-[#FFD747] hover:text-[#FFD747] transition-all duration-300"
              title="Resoconto Annuale"
            >
              <ArrowUpRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
        
        {/* Row 1: Summary Cards */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="md:col-span-4 group"
        >
          <Card className="glass-card h-full border-none shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-[#8B7355]">
              <Landmark size={80} />
            </div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge className="bg-[#FFD747]/20 text-[#8B7355] border-none px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                  Banca
                </Badge>
                <AlertDialog open={isEditingBankBalance} onOpenChange={setIsEditingBankBalance}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/50">
                      <Edit3 className="h-4 w-4 text-[#8B7355]" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-[#1D1D1D] border-[#E8E2D2] rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-2xl">Aggiorna Giacenza</AlertDialogTitle>
                      <AlertDialogDescription className="text-zinc-500">
                        Inserisci l'attuale saldo contabile del tuo conto principale.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-6">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newBankBalanceValue}
                        onChange={(e) => setNewBankBalanceValue(e.target.value)}
                        className="text-3xl h-20 text-center font-bold border-2 border-[#E8E2D2] focus:border-[#FFD747] rounded-2xl bg-[#FDFCF7]"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUpdateBankBalance}
                        className="bg-[#1D1D1D] text-white hover:bg-[#2D2D2D] rounded-xl px-6"
                      >
                        Salva
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <CardTitle className="text-sm font-medium text-[#8B7355] mt-4">Giacenza Totale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-[#1D1D1D] dark:text-white flex items-baseline gap-1">
                <span className="text-[#8B7355] text-2xl">€</span>
                {isClient ? bankBalance.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : bankBalance.toFixed(2)}
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 w-fit px-3 py-1.5 rounded-full">
                <TrendingUp size={14} />
                <span>+2.4% vs ultimo mese</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="md:col-span-4 group"
        >
          <Card className="glass-card h-full border-none shadow-xl hover:shadow-2xl transition-all duration-500">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-[#8B7355]">
              <Coins size={80} />
            </div>
            <CardHeader className="pb-2">
              <Badge className="bg-[#8B7355]/10 text-[#8B7355] border-none px-3 py-1 text-[10px] font-bold tracking-widest uppercase w-fit">
                Cassa
              </Badge>
              <CardTitle className="text-sm font-medium text-[#8B7355] mt-4">Fondo Cassa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-[#1D1D1D] dark:text-white flex items-baseline gap-1">
                <span className="text-[#8B7355] text-2xl">€</span>
                {isClient ? cashBalance.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : cashBalance.toFixed(2)}
              </div>
              <p className="mt-6 text-xs text-[#8B7355]/60 flex items-center gap-1">
                <Info size={14} />
                Gestione manuale dei contanti
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="md:col-span-4 group"
        >
          <Card className="bg-[#1D1D1D] dark:bg-zinc-900 h-full border-none shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-[-20%] left-[-10%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,71,0.1),transparent_70%)] pointer-events-none" />
            <CardHeader className="pb-2">
              <Badge className="bg-[#FFD747] text-[#1D1D1D] border-none px-3 py-1 text-[10px] font-bold tracking-widest uppercase w-fit">
                Profitto
              </Badge>
              <CardTitle className="text-sm font-medium text-[#FFD747] mt-4">Risultato Netto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-white flex items-baseline gap-1">
                <span className="text-[#FFD747] text-2xl">€</span>
                {isClient ? (currentMonthSummary.income - currentMonthSummary.expenses).toLocaleString("it-IT", { minimumFractionDigits: 2 }) : (currentMonthSummary.income - currentMonthSummary.expenses).toFixed(2)}
              </div>
              <div className="mt-6 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-xs font-semibold text-[#FFD747] bg-[#FFD747]/10 px-3 py-1.5 rounded-full">
                  <PieChart size={14} />
                  <span>Analisi mensile</span>
                </div>
                <Button variant="link" className="text-white/40 hover:text-white p-0 h-auto text-xs font-medium" onClick={() => router.push('/monthly-summary')}>
                  Dettagli <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 2: Charts & AI */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="md:col-span-8"
        >
          <Card className="glass-card border-none shadow-xl h-[480px] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#E8E2D2]/50 pb-6">
              <div>
                <CardTitle className="text-2xl font-serif font-bold text-[#1D1D1D] dark:text-white">Trend Finanziario</CardTitle>
                <CardDescription className="text-[#8B7355] font-medium uppercase tracking-tighter text-[10px]">Entrate vs Uscite negli ultimi 12 mesi</CardDescription>
              </div>
              <Tabs defaultValue="yearly" className="w-[200px]">
                <TabsList className="grid grid-cols-2 bg-[#FDFCF7]/80 rounded-xl p-1 border border-[#E8E2D2]">
                  <TabsTrigger value="yearly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs py-2">Annuale</TabsTrigger>
                  <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs py-2">Mensile</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-8 pl-2 h-[380px]">
              <DashboardBarChart data={lastSixMonthsChartData} config={dashboardChartConfig} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="md:col-span-4"
        >
          <Card className="bg-gradient-to-br from-[#1D1D1D] to-[#2D2D2D] border-none shadow-2xl h-[480px] overflow-hidden text-white relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
            <CardHeader>
              <div className="flex items-center gap-3 text-[#FFD747]">
                <div className="p-2.5 rounded-2xl bg-[#FFD747]/10 border border-[#FFD747]/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl font-serif font-bold">Insights AI</CardTitle>
                  <CardDescription className="text-[#FFD747]/50 text-xs font-semibold tracking-widest uppercase">Dental Balance Analysis</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <p className="text-sm leading-relaxed text-zinc-300 italic font-medium">
                  {dashboardInsight || "Genera un'analisi per ricevere consigli personalizzati sulla gestione del tuo studio."}
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-white/5 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-[#FFD747]/20 flex items-center justify-center text-[#FFD747] group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Margine Operativo</h4>
                    <p className="text-xs text-zinc-500">Sincronizzazione in corso...</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-white/5 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-red-400/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Fornitori in Scadenza</h4>
                    <p className="text-xs text-zinc-500">Monitoraggio pagamenti attivo</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleGenerateInsight}
                disabled={isLoadingInsight}
                className="w-full h-12 rounded-2xl bg-white text-[#1D1D1D] hover:bg-[#FFD747] hover:text-[#1D1D1D] font-bold transition-all duration-300 mt-4 shadow-lg"
              >
                {isLoadingInsight ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                Genera Insight AI
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 3: Detail Bento Items */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="md:col-span-4"
        >
          <Card className="glass-card border-none shadow-xl h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-xl font-serif font-bold text-[#1D1D1D]">Spese per Categoria</CardTitle>
              <PieChart size={20} className="text-[#8B7355]" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center">
                 {isLoadingExpenseBreakdown ? (
                   <Loader2 className="animate-spin text-[#8B7355]" />
                 ) : expenseBreakdownCurrentMonth.length > 0 ? (
                   <div className="w-full">
                     <DashboardPieChart data={expenseBreakdownCurrentMonth} />
                   </div>
                 ) : (
                   <div className="text-center">
                      <p className="text-xs text-[#8B7355] font-bold uppercase tracking-widest">Nessun dato</p>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="md:col-span-4"
        >
          <Card className="glass-card border-none shadow-xl h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-xl font-serif font-bold text-[#1D1D1D]">Ultime Attività</CardTitle>
              <History size={20} className="text-[#8B7355]" />
            </CardHeader>
            <CardContent className="px-0">
               <div className="space-y-1">
                 {recentTransactions.length > 0 ? (
                    recentTransactions.slice(0, 5).map((t) => (
                      <div key={t.id} className="group flex items-center justify-between p-4 hover:bg-[#FDFCF7]/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {t.type === 'income' ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                          </div>
                          <div className="max-w-[120px]">
                            <p className="text-sm font-bold text-[#1D1D1D] leading-tight truncate">{t.description}</p>
                            <p className="text-[10px] text-[#8B7355] font-semibold uppercase tracking-wider truncate">{t.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'}€{t.amount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-[#8B7355] font-medium">{format(new Date(t.date), "dd MMM")}</p>
                        </div>
                      </div>
                    ))
                 ) : (
                    <div className="text-center py-20 text-[#8B7355]/40 italic text-sm">Nessuna transazione recente</div>
                 )}
               </div>
               <Button variant="ghost" className="w-full mt-4 text-[#8B7355] hover:text-[#1D1D1D] hover:bg-transparent font-bold text-xs" onClick={() => router.push('/transactions')}>
                 Visualizza Registro Completo <ArrowRight className="ml-2 h-3 w-3" />
               </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="md:col-span-4"
        >
          <Card className="bg-[#F5F1E6]/40 dark:bg-zinc-900/40 border-2 border-dashed border-[#E8E2D2] dark:border-zinc-800 shadow-none h-full min-h-[400px]">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-serif font-bold text-[#1D1D1D]">Obiettivi Budget</CardTitle>
              <CardDescription className="text-xs text-[#8B7355] font-medium uppercase">Monitoraggio traguardi clinici</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {keyFinancialObjectives.length > 0 ? (
                keyFinancialObjectives.slice(0, 3).map((obj, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="text-sm font-bold text-[#1D1D1D]">{obj.name}</h4>
                        <p className="text-[10px] text-[#8B7355] uppercase font-bold tracking-widest">{obj.category}</p>
                      </div>
                      <Badge className="bg-white border-[#E8E2D2] text-[#8B7355] text-[10px] font-bold">
                        {Math.round((obj.current / obj.target) * 100)}%
                      </Badge>
                    </div>
                    <Progress value={(obj.current / obj.target) * 100} className="h-2 bg-[#E8E2D2] [&>div]:bg-[#FFD747]" />
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                   <TargetIcon size={40} className="mx-auto mb-4 text-[#E8E2D2]" />
                   <p className="text-sm text-[#8B7355] italic">Configura i tuoi obiettivi annuali</p>
                </div>
              )}
              <Button className="w-full rounded-2xl border-2 border-[#1D1D1D] text-[#1D1D1D] bg-transparent hover:bg-[#1D1D1D] hover:text-white font-bold transition-all duration-300 mt-6" onClick={() => router.push('/budget-objectives')}>
                Gestisci Obiettivi
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Footer / Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-[#E8E2D2] dark:border-zinc-800 z-50 px-10 flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest">Sistema Operativo</span>
            </div>
            <div className="h-4 w-[1px] bg-[#E8E2D2]" />
            <span className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest">Utente: Studio Dentistico Mapelli</span>
         </div>
         <div className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest">
            Last Sync: {format(new Date(), "HH:mm")}
         </div>
      </div>

      <InvoiceScannerModal
        isOpen={isScannerModalOpen}
        onOpenChange={setIsScannerModalOpen}
        onItemsAccepted={handleScannerItemsAccepted}
      />
    </div>
  );
}
