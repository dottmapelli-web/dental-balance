
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRight, Upload, Download, Edit } from "lucide-react";
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
import { format, parseISO, isValid, getMonth, getYear, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, formatISO } from "date-fns";
import { it } from "date-fns/locale";
import type { Transaction } from '@/app/transactions/page';
import { initialTransactions } from '@/app/transactions/page'; // Import from transactions page
import { expenseCategories as expenseCategoryConfig } from '@/config/transaction-categories';


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
      value: 0, // Will be calculated
      itemCount: 0, // Will be calculated
      topItems: [], // Will be calculated
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
}

const ExpenseCategoryCard: React.FC<ExpenseCategoryCardProps> = ({ title, value, itemCount, topItems, bgColor, textColor, borderColor, onViewAllClick }) => {
  return (
    <Card className={`${bgColor} ${borderColor} border shadow-lg hover:shadow-xl transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className={`text-xl font-headline ${textColor}`}>{title}</CardTitle>
          <Badge variant="secondary" className={`${textColor} ${bgColor.replace('bg-', 'bg-opacity-50 dark:bg-opacity-50').replace('-100', '-200').replace('-900/30', '-700')} border-none`}>
            {itemCount} voci
          </Badge>
        </div>
         <p className={`text-sm font-semibold ${textColor}`}>Totale: €{value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1.5 text-sm">
          {topItems.slice(0, 3).map((item, index) => (
            <li key={index} className="flex justify-between items-center">
              <span className="text-muted-foreground truncate pr-2" title={item.name}>{item.name}</span>
              <span className={`font-medium ${textColor}`}>€{item.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

export default function DashboardPage() {
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogCategoryName, setDetailDialogCategoryName] = useState<string | null>(null);
  const [detailDialogTitle, setDetailDialogTitle] = useState<string>("");
  const [detailDialogDescription, setDetailDialogDescription] = useState<string>("");
  const [transactionsForDialog, setTransactionsForDialog] = useState<Transaction[]>([]);
  
  const [studioTotalBalance, setStudioTotalBalance] = useState<number>(50000);
  const [isEditBalanceDialogOpen, setIsEditBalanceDialogOpen] = useState<boolean>(false);
  const [newBalanceInputValue, setNewBalanceInputValue] = useState<string>("50000");

  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState(0);
  const [currentMonthlyBalance, setCurrentMonthlyBalance] = useState(0);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [cashflowChartData, setCashflowChartData] = useState<any[]>([]);
  const [expenseCategoriesDisplay, setExpenseCategoriesDisplay] = useState<ExpenseCategoryDisplayData[]>(initialExpenseCategoriesDisplayData);


  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching initial balance or set from a more persistent source in a real app
    setNewBalanceInputValue(studioTotalBalance.toString());
  }, [studioTotalBalance]);

  useEffect(() => {
    const today = new Date();
    const currentMonthNum = getMonth(today);
    const currentYearNum = getYear(today);

    // 1. Calculate current month's income, expenses, balance
    const currentMonthTransactions = initialTransactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isValid(transactionDate) && getMonth(transactionDate) === currentMonthNum && getYear(transactionDate) === currentYearNum;
    });

    const incomeCurrentMonth = currentMonthTransactions
      .filter(t => t.type === 'Entrata')
      .reduce((sum, t) => sum + t.amount, 0);
    setTotalMonthlyIncome(incomeCurrentMonth);

    const expensesCurrentMonth = currentMonthTransactions
      .filter(t => t.type === 'Uscita')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    setTotalMonthlyExpenses(expensesCurrentMonth);
    setCurrentMonthlyBalance(incomeCurrentMonth - expensesCurrentMonth);

    // 2. Prepare data for Bar Chart (last 6 months)
    const monthlySummaries: { [key: string]: { income: number; expenses: number } } = {};
    for (let i = 5; i >= 0; i--) {
      const dateToProcess = subMonths(today, i);
      const monthName = format(dateToProcess, "MMM", { locale: it });
      const year = getYear(dateToProcess);
      const monthKey = `${monthName}-${year}`;
      monthlySummaries[monthKey] = { income: 0, expenses: 0 };
    }

    initialTransactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (isValid(transactionDate)) {
        const monthName = format(transactionDate, "MMM", { locale: it });
        const year = getYear(transactionDate);
        const monthKey = `${monthName}-${year}`;
        if (monthlySummaries[monthKey]) {
          if (t.type === 'Entrata') {
            monthlySummaries[monthKey].income += t.amount;
          } else {
            monthlySummaries[monthKey].expenses += Math.abs(t.amount);
          }
        }
      }
    });
    const barData = Object.entries(monthlySummaries)
      .map(([monthYear, data]) => ({ month: monthYear.split('-')[0], income: data.income, expenses: data.expenses }))
      .slice(-6); // Ensure only last 6 months are taken if more are generated
    setBarChartData(barData);


    // 3. Prepare data for Pie Chart (current month expenses by category)
    const currentMonthExpenses = currentMonthTransactions.filter(t => t.type === 'Uscita');
    const expensesByCategory: { [category: string]: number } = {};
    currentMonthExpenses.forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Math.abs(t.amount);
    });
    
    const updatedExpenseCategoriesDisplay = initialExpenseCategoriesDisplayData.map(catDisplay => {
        const totalForCategory = expensesByCategory[catDisplay.title] || 0;
        const categoryTransactions = currentMonthExpenses.filter(t => t.category === catDisplay.title);
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


    // 4. Prepare data for Cashflow Line Chart (current month, daily balance)
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    let runningBalance = 0; // This should ideally be the balance from end of previous month

    const cashflowData = daysInMonth.map(day => {
        const dailyTransactions = initialTransactions.filter(t => {
            const transactionDate = parseISO(t.date);
            return isValid(transactionDate) && format(transactionDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });
        const dailyNet = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
        runningBalance += dailyNet;
        return { date: format(day, "dd/MM"), cashflow: runningBalance };
    });
    setCashflowChartData(cashflowData);

  }, [initialTransactions]); // Rerun if initialTransactions changes (though it's static for now)


  const handleOpenEditBalanceDialog = () => {
    setNewBalanceInputValue(studioTotalBalance.toLocaleString('it-IT', {minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: false}));
    setIsEditBalanceDialogOpen(true);
  };

  const handleSaveBalance = () => {
    const newBalance = parseFloat(newBalanceInputValue.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(newBalance) && newBalance >= 0) {
      setStudioTotalBalance(newBalance);
      toast({
        title: "Saldo Studio Aggiornato",
        description: `Il nuovo saldo dello studio è €${newBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
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

    return initialTransactions.filter(t => {
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
            <h2 className="text-lg font-semibold">Saldo Attuale Studio</h2>
            <p className="text-4xl font-bold mt-1">
              €{studioTotalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <DialogTitle>Modifica Saldo Attuale Studio</DialogTitle>
            <DialogDescriptionComponent>
              Aggiorna la giacenza bancaria e la liquidità totale dello studio.
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


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Totali (Mese)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">€{totalMonthlyIncome.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {/* <p className="text-xs text-muted-foreground">+5.2% rispetto al mese scorso</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Totali (Mese)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">€{totalMonthlyExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {/* <p className="text-xs text-muted-foreground">-1.8% rispetto al mese scorso</p> */}
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
              €{currentMonthlyBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonthlyBalance >=0 ? "Bilancio mensile positivo" : "Bilancio mensile negativo"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Entrate vs Uscite (Ultimi 6 Mesi)</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardBarChart data={barChartData} config={barChartConfig} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Distribuzione Spese (Mese Corrente)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <DashboardPieChart data={pieChartData} onSliceClick={handlePieSliceClick} />
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
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Flusso di Cassa (Mese Corrente)</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardCashflowLineChart data={cashflowChartData} config={lineChartConfig} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Obiettivi Finanziari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-primary">Risparmio Mensile</span>
                <span className="text-sm font-medium">€1,200 / €2,000 (60%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: "60%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-accent">Riduzione Costi Materiali</span>
                <span className="text-sm font-medium">-5% / -10% (50%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-accent h-2.5 rounded-full" style={{ width: "50%" }}></div>
              </div>
            </div>
             <Badge variant="outline">Prossima Revisione: 31 Luglio</Badge>
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
                        -€{Math.abs(transaction.amount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Nessuna transazione di spesa trovata per la categoria "{detailDialogCategoryName}" nel mese corrente.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

    