
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Download } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { format, getYear, getMonth, parseISO, isValid } from "date-fns";
import { it } from 'date-fns/locale';
import { type Transaction } from '@/data/transactions-data';
import { forecastStructure, type ForecastRow, type ForecastItem } from '@/data/forecast-items';
import debounce from 'lodash.debounce';
import { cn } from '@/lib/utils';

const generateYears = () => {
  const currentYr = getYear(new Date());
  return Array.from({ length: 5 }, (_, i) => (currentYr - i).toString());
};

type CalculatedValues = {
  budget: number;
  actual: number;
  scostamento: number;
  percScostamento: number;
};

type MonthlyData = Record<string, CalculatedValues>;

export default function ForecastPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetData, setBudgetData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const { toast } = useToast();
  const { transactionsVersion } = useAuth();
  
  useEffect(() => setIsClient(true), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch Transactions for the selected year
      const transactionsCollectionRef = collection(db, "transactions");
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const transQuery = query(transactionsCollectionRef, 
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const transSnapshot = await getDocs(transQuery);
      const fetchedTransactions: Transaction[] = [];
      transSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTransactions.push({ 
          id: doc.id,
          date: data.date instanceof Timestamp ? format(data.date.toDate(), "yyyy-MM-dd") : data.date,
          description: data.description,
          category: data.category,
          subcategory: data.subcategory,
          type: data.type,
          amount: data.amount,
          status: data.status,
          isRecurring: data.isRecurring,
          recurrenceDetails: data.recurrenceDetails,
          originalRecurringId: data.originalRecurringId,
        });
      });
      setTransactions(fetchedTransactions);

      // Fetch Budgets for the selected year
      const budgetsCollectionRef = collection(db, "budgets_forecast");
      const budgetQuery = query(budgetsCollectionRef, where('year', '==', parseInt(selectedYear)));
      const budgetSnapshot = await getDocs(budgetQuery);
      const fetchedBudgets: Record<string, number> = {};
      budgetSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedBudgets[`${data.month}_${data.itemKey}`] = data.amount;
      });
      setBudgetData(fetchedBudgets);

    } catch (e: any) {
      console.error("Errore caricamento dati forecast:", e);
      setError("Impossibile caricare i dati per il bilancio previsionale.");
      toast({ title: "Errore Dati", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, toast]);

  useEffect(() => {
    fetchData();
  }, [selectedYear, transactionsVersion, fetchData]);
  
  const debouncedSaveBudget = useCallback(
    debounce(async (year: number, month: number, itemKey: string, amount: number) => {
      try {
        const docId = `${year}-${month}-${itemKey}`;
        const budgetRef = doc(db, "budgets_forecast", docId);
        await setDoc(budgetRef, { year, month, itemKey, amount });
        toast({ title: "Budget Salvato", description: `Valore per ${itemKey} aggiornato.` });
      } catch (e: any) {
        toast({ title: "Errore Salvataggio Budget", description: e.message, variant: "destructive" });
      }
    }, 1000),
    [toast]
  );

  const handleBudgetChange = (month: number, itemKey: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const key = `${month}_${itemKey}`;
    setBudgetData(prev => ({ ...prev, [key]: amount }));
    debouncedSaveBudget(parseInt(selectedYear), month, itemKey, amount);
  };
  
  const calculatedMonthlyData = useMemo((): MonthlyData[] => {
    if (isLoading) return [];
    
    const monthlyResults: MonthlyData[] = Array(12).fill(0).map(() => ({}));

    // 1. Initialize all data rows for each month
    forecastStructure.forEach(row => {
      if (row.type === 'row') {
        for (let i = 0; i < 12; i++) {
          const budgetKey = `${i}_${row.key}`;
          monthlyResults[i][row.key] = {
            budget: budgetData[budgetKey] || 0,
            actual: 0,
            scostamento: 0,
            percScostamento: 0,
          };
        }
      }
    });

    // 2. Aggregate 'Actual' data from transactions
    transactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (!isValid(transactionDate)) return;
      
      const month = getMonth(transactionDate);
      const rowToUpdate = forecastStructure.find(row => {
        if (row.type !== 'row' || !row.mappable) return false;
        
        const categoryMatch = Array.isArray(row.transactionCategory)
          ? row.transactionCategory.includes(t.category)
          : row.transactionCategory === t.category;

        const subCategoryMatch = t.subcategory && (Array.isArray(row.transactionSubCategory)
          ? row.transactionSubCategory.includes(t.subcategory)
          : row.transactionSubCategory === t.subcategory);
        
        return (row.transactionCategory && categoryMatch) || (row.transactionSubCategory && subCategoryMatch);
      }) as ForecastItem | undefined;

      if (rowToUpdate) {
        // Use the sign of the amount as stored in Firestore
        const amount = t.amount;
        monthlyResults[month][rowToUpdate.key].actual += (rowToUpdate.key === 'pazienti' ? amount : Math.abs(amount));
      }
    });

    // 3. Calculate totals, margins, and deviations for each month
    for (let i = 0; i < 12; i++) {
      const monthData = monthlyResults[i];
      forecastStructure.forEach(row => {
          if (row.type === 'total' || row.type === 'margin') {
              const key = row.label.toLowerCase().replace(/ /g, '_');
              let budgetValue = 0;
              let actualValue = 0;

              if (row.type === 'total') {
                  row.calculate.forEach(itemKey => {
                      const valueKey = itemKey.startsWith('total_') || itemKey.startsWith('margin_') 
                          ? itemKey : itemKey;
                      const values = monthData[valueKey];
                      if(values) {
                        budgetValue += values.budget;
                        actualValue += values.actual;
                      }
                  });
              } else { // margin
                  row.calculate.from.forEach(itemKey => {
                      const valueKey = itemKey.startsWith('total_') || itemKey.startsWith('margin_') ? itemKey : itemKey;
                      const values = monthData[valueKey];
                      if(values) {
                        budgetValue += values.budget;
                        actualValue += values.actual;
                      }
                  });
                  row.calculate.subtract.forEach(itemKey => {
                      const valueKey = itemKey.startsWith('total_') || itemKey.startsWith('margin_') ? itemKey : itemKey;
                       const values = monthData[valueKey];
                      if(values) {
                        budgetValue -= values.budget;
                        actualValue -= values.actual;
                      }
                  });
              }
              monthData[key] = {
                  budget: budgetValue,
                  actual: actualValue,
                  scostamento: 0,
                  percScostamento: 0
              };
          }
      });
      // Calculate deviations after calculating all totals
      Object.values(monthData).forEach(values => {
          values.scostamento = values.actual - values.budget;
          values.percScostamento = values.budget !== 0 ? (values.scostamento / values.budget) * 100 : (values.actual > 0 ? 100 : 0);
      });
    }

    return monthlyResults;
  }, [transactions, budgetData, isLoading]);

  const annualTotals = useMemo(() => {
    const totals: Record<string, CalculatedValues> = {};
    if (calculatedMonthlyData.length === 0) return totals;

    forecastStructure.forEach(row => {
        let key: string;
        if(row.type === 'row') key = row.key;
        else if (row.type === 'total' || row.type === 'margin') key = row.label.toLowerCase().replace(/ /g, '_');
        else return;

        totals[key] = { budget: 0, actual: 0, scostamento: 0, percScostamento: 0 };
    });
    
    calculatedMonthlyData.forEach(monthData => {
        for(const key in totals) {
            if(monthData[key]) {
                totals[key].budget += monthData[key].budget;
                totals[key].actual += monthData[key].actual;
            }
        }
    });

    for(const key in totals) {
        totals[key].scostamento = totals[key].actual - totals[key].budget;
        totals[key].percScostamento = totals[key].budget !== 0 ? (totals[key].scostamento / totals[key].budget) * 100 : (totals[key].actual > 0 ? 100 : 0);
    }
    
    return totals;
  }, [calculatedMonthlyData]);


  const renderValue = (value: number) => isClient ? `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `€${value.toFixed(2)}`;
  const renderPercentage = (value: number) => `${value.toFixed(2)}%`;

  const getRowClass = (row: ForecastRow) => {
    switch (row.type) {
        case 'header': return "bg-muted/50 font-semibold text-foreground";
        case 'total': return "bg-yellow-100 dark:bg-yellow-900/50 font-bold";
        case 'margin': return "bg-green-100 dark:bg-green-900/50 font-bold";
        default: return "";
    }
  };
  
  const isTotalRow = (row: ForecastRow) => row.type === 'total';
  const isEbitdaRow = (row: ForecastRow) => row.label === 'EBITDA';

  const renderMonthTab = (monthIndex: number, data: MonthlyData) => (
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead className="w-[300px]">Voce</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Scostamento</TableHead>
                  <TableHead>% Scostamento</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {forecastStructure.map((row, rowIndex) => {
                  const key = row.type === 'row' ? row.key : row.label.toLowerCase().replace(/ /g, '_');
                  const values = data[key];
                  const rowClass = getRowClass(row);
                  
                  if (row.type === 'header') {
                      return <TableRow key={rowIndex} className={rowClass}><TableCell colSpan={5}>{row.label}</TableCell></TableRow>;
                  }

                  const scostamentoClass = values?.scostamento < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                  
                  return (
                      <TableRow key={rowIndex} className={cn(rowClass, isTotalRow(row) && 'font-extrabold', isEbitdaRow(row) && 'bg-green-200 dark:bg-green-800/60 font-extrabold')}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell>
                              {row.type === 'row' ? (
                                  <Input type="number" step="0.01"
                                      defaultValue={values?.budget.toFixed(2)}
                                      onChange={(e) => handleBudgetChange(monthIndex, row.key, e.target.value)}
                                      className="h-8"
                                      />
                              ) : renderValue(values?.budget || 0)}
                          </TableCell>
                          <TableCell>{renderValue(values?.actual || 0)}</TableCell>
                          <TableCell className={scostamentoClass}>{renderValue(values?.scostamento || 0)}</TableCell>
                          <TableCell className={scostamentoClass}>{renderPercentage(values?.percScostamento || 0)}</TableCell>
                      </TableRow>
                  );
              })}
          </TableBody>
      </Table>
  );
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati bilancio previsionale per il {selectedYear}...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Previsioni Bilancio"
        description={`Bilancio previsionale per l'anno ${selectedYear}, confrontando dati a budget con i dati reali.`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleziona Anno" />
              </SelectTrigger>
              <SelectContent>
                {generateYears().map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Esporta
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="mb-6 bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle /> Errore</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="0">
            <TabsList className="p-2 h-auto flex-wrap justify-start">
              {Array.from({ length: 12 }, (_, i) => (
                <TabsTrigger key={i} value={i.toString()}>{format(new Date(0, i), "MMM", { locale: it })}</TabsTrigger>
              ))}
              <TabsTrigger value="12" className="font-bold">TOTALI</TabsTrigger>
            </TabsList>
            {calculatedMonthlyData.map((monthData, i) => (
              <TabsContent key={i} value={i.toString()} className="p-4">
                {renderMonthTab(i, monthData)}
              </TabsContent>
            ))}
            <TabsContent value="12" className="p-4">
               <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[300px]">Voce</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead>Scostamento</TableHead>
                          <TableHead>% Scostamento</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {forecastStructure.map((row, rowIndex) => {
                          const key = row.type === 'row' ? row.key : row.label.toLowerCase().replace(/ /g, '_');
                          const values = annualTotals[key];
                          const rowClass = getRowClass(row);
                          if (row.type === 'header') {
                              return <TableRow key={rowIndex} className={rowClass}><TableCell colSpan={5}>{row.label}</TableCell></TableRow>;
                          }
                          const scostamentoClass = values?.scostamento < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                          return (
                              <TableRow key={rowIndex} className={cn(rowClass, isTotalRow(row) && 'font-extrabold', isEbitdaRow(row) && 'bg-green-200 dark:bg-green-800/60 font-extrabold')}>
                                  <TableCell className="font-medium">{row.label}</TableCell>
                                  <TableCell>{renderValue(values?.budget || 0)}</TableCell>
                                  <TableCell>{renderValue(values?.actual || 0)}</TableCell>
                                  <TableCell className={scostamentoClass}>{renderValue(values?.scostamento || 0)}</TableCell>
                                  <TableCell className={scostamentoClass}>{renderPercentage(values?.percScostamento || 0)}</TableCell>
                              </TableRow>
                          );
                      })}
                  </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}

    