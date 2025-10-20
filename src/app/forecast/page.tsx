
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Download, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { format, getYear, getMonth, parseISO, isValid } from "date-fns";
import { it } from 'date-fns/locale';
import { type Transaction } from '@/data/transactions-data';
import debounce from 'lodash.debounce';
import { cn } from '@/lib/utils';
import { useCategories } from '@/contexts/category-context';

const generateYears = () => {
  const currentYr = getYear(new Date());
  return Array.from({ length: 5 }, (_, i) => (currentYr - i).toString());
};

type CalculatedValues = {
  budget: number;
  actual: number;
  scostamento: number;
  percScostamento: number;
  // Per il drill-down
  breakdown?: Record<string, { budget: number, actual: number }>;
};

type MonthlyData = Record<string, CalculatedValues>;

const renderValue = (value: number) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const renderPercentage = (value: number) => `${value.toFixed(2)}%`;

export default function ForecastPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { expenseCategories, incomeCategories, loading: loadingCategories } = useCategories();
  const [budgetData, setBudgetData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const { toast } = useToast();
  const { transactionsVersion } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => setIsClient(true), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const transSnapshot = await getDocs(transactionsCollectionRef);
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

      const budgetsCollectionRef = collection(db, "budgets_forecast");
      const budgetQuery = query(budgetsCollectionRef, where('year', '==', parseInt(selectedYear)));
      const budgetSnapshot = await getDocs(budgetQuery);
      const fetchedBudgets: Record<string, number> = {};
      budgetSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedBudgets[`${data.month}_${data.category}`] = data.amount;
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
    debounce(async (year: number, month: number, category: string, amount: number) => {
      try {
        const docId = `${year}-${month}-${category}`;
        const budgetRef = doc(db, "budgets_forecast", docId);
        await setDoc(budgetRef, { year, month, category, amount });
        toast({ title: "Budget Salvato", description: `Valore per ${category} aggiornato.` });
      } catch (e: any) {
        toast({ title: "Errore Salvataggio Budget", description: e.message, variant: "destructive" });
      }
    }, 1000),
    [toast]
  );

  const handleBudgetChange = (month: number, category: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const key = `${month}_${category}`;
    setBudgetData(prev => ({ ...prev, [key]: amount }));
    debouncedSaveBudget(parseInt(selectedYear), month, category, amount);
  };
  
 const calculatedMonthlyData = useMemo((): MonthlyData[] => {
    if (isLoading || loadingCategories) return [];
    
    const monthlyResults: MonthlyData[] = Array(12).fill(0).map(() => ({}));
    const currentYearTransactions = transactions.filter(t => {
      const d = parseISO(t.date);
      return isValid(d) && getYear(d).toString() === selectedYear;
    });

    const allCategories = { ...incomeCategories, ...expenseCategories };

    // Step 1: Initialize all rows and calculate 'actuals'
    for (let i = 0; i < 12; i++) {
        for (const category in allCategories) {
            monthlyResults[i][category] = {
                budget: budgetData[`${i}_${category}`] || 0,
                actual: 0,
                scostamento: 0,
                percScostamento: 0,
                breakdown: {}
            };
        }
    }

    currentYearTransactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (!isValid(transactionDate)) return;
      
      const month = getMonth(transactionDate);
      if (monthlyResults[month][t.category]) {
          const amount = Math.abs(t.amount);
          monthlyResults[month][t.category].actual += amount;

          // Breakdown by subcategory
          const subcatKey = t.subcategory || "N/D";
          if (!monthlyResults[month][t.category].breakdown![subcatKey]) {
              monthlyResults[month][t.category].breakdown![subcatKey] = { budget: 0, actual: 0 };
          }
          monthlyResults[month][t.category].breakdown![subcatKey].actual += amount;
      }
    });

    // Step 2: Calculate totals and margins for each month
    for (let i = 0; i < 12; i++) {
        const monthData = monthlyResults[i];
        
        let totaleRicavi = { budget: 0, actual: 0, breakdown: {} };
        let totaleCostiProduzione = { budget: 0, actual: 0, breakdown: {} };
        let totaleCostiProduttivi = { budget: 0, actual: 0, breakdown: {} };

        for (const category in incomeCategories) {
            totaleRicavi.budget += monthData[category]?.budget || 0;
            totaleRicavi.actual += monthData[category]?.actual || 0;
            if(monthData[category]) totaleRicavi.breakdown[category] = { budget: monthData[category].budget, actual: monthData[category].actual };
        }

        for (const category in expenseCategories) {
            const catData = expenseCategories[category];
            const forecastType = catData.forecastType;
            if (forecastType === 'Costi di Produzione') {
                totaleCostiProduzione.budget += monthData[category]?.budget || 0;
                totaleCostiProduzione.actual += monthData[category]?.actual || 0;
                 if(monthData[category]) totaleCostiProduzione.breakdown[category] = { budget: monthData[category].budget, actual: monthData[category].actual };
            } else { // 'Costi Produttivi' or undefined
                totaleCostiProduttivi.budget += monthData[category]?.budget || 0;
                totaleCostiProduttivi.actual += monthData[category]?.actual || 0;
                 if(monthData[category]) totaleCostiProduttivi.breakdown[category] = { budget: monthData[category].budget, actual: monthData[category].actual };
            }
        }
        
        const scostamentoRicavi = totaleRicavi.actual - totaleRicavi.budget;
        const percScostamentoRicavi = totaleRicavi.budget !== 0 ? (scostamentoRicavi / Math.abs(totaleRicavi.budget)) * 100 : (totaleRicavi.actual > 0 ? 100 : 0);
        monthData['totale_ricavi'] = { ...totaleRicavi, scostamento: scostamentoRicavi, percScostamento: percScostamentoRicavi };

        const scostamentoCostiProduzione = totaleCostiProduzione.actual - totaleCostiProduzione.budget;
        const percScostamentoCostiProduzione = totaleCostiProduzione.budget !== 0 ? (scostamentoCostiProduzione / Math.abs(totaleCostiProduzione.budget)) * 100 : (totaleCostiProduzione.actual > 0 ? 100 : 0);
        monthData['totale_costi_di_produzione'] = { ...totaleCostiProduzione, scostamento: scostamentoCostiProduzione, percScostamento: percScostamentoCostiProduzione };
        
        const scostamentoCostiProduttivi = totaleCostiProduttivi.actual - totaleCostiProduttivi.budget;
        const percScostamentoCostiProduttivi = totaleCostiProduttivi.budget !== 0 ? (scostamentoCostiProduttivi / Math.abs(totaleCostiProduttivi.budget)) * 100 : (totaleCostiProduttivi.actual > 0 ? 100 : 0);
        monthData['totale_costi_produttivi'] = { ...totaleCostiProduttivi, scostamento: scostamentoCostiProduttivi, percScostamento: percScostamentoCostiProduttivi };

        const margineContribuzione = {
            budget: totaleRicavi.budget - totaleCostiProduzione.budget,
            actual: totaleRicavi.actual - totaleCostiProduzione.actual,
        };
        const scostamentoMargine = margineContribuzione.actual - margineContribuzione.budget;
        const percScostamentoMargine = margineContribuzione.budget !== 0 ? (scostamentoMargine / Math.abs(margineContribuzione.budget)) * 100 : (margineContribuzione.actual !== 0 ? 100 : 0);
        monthData['margine_di_contribuzione'] = { ...margineContribuzione, scostamento: scostamentoMargine, percScostamento: percScostamentoMargine };

        const totaleCosti = {
            budget: totaleCostiProduzione.budget + totaleCostiProduttivi.budget,
            actual: totaleCostiProduzione.actual + totaleCostiProduttivi.actual,
        };
        const scostamentoCosti = totaleCosti.actual - totaleCosti.budget;
        const percScostamentoCosti = totaleCosti.budget !== 0 ? (scostamentoCosti / Math.abs(totaleCosti.budget)) * 100 : (totaleCosti.actual > 0 ? 100 : 0);
        monthData['totale_costi'] = { ...totaleCosti, scostamento: scostamentoCosti, percScostamento: percScostamentoCosti };
        
        const ebitda = {
            budget: margineContribuzione.budget - totaleCostiProduttivi.budget,
            actual: margineContribuzione.actual - totaleCostiProduttivi.actual,
        };
        const scostamentoEbitda = ebitda.actual - ebitda.budget;
        const percScostamentoEbitda = ebitda.budget !== 0 ? (scostamentoEbitda / Math.abs(ebitda.budget)) * 100 : (ebitda.actual !== 0 ? 100 : 0);
        monthData['ebitda'] = { ...ebitda, scostamento: scostamentoEbitda, percScostamento: percScostamentoEbitda };

        // Final pass for individual items scostamento
        Object.values(monthData).forEach(values => {
           if (values.scostamento === 0 && (values.budget !== 0 || values.actual !== 0)) {
               values.scostamento = values.actual - values.budget;
               values.percScostamento = values.budget !== 0 ? (values.scostamento / Math.abs(values.budget)) * 100 : (values.actual > 0 ? 100 : 0);
           }
        });
    }

    return monthlyResults;
  }, [transactions, budgetData, isLoading, loadingCategories, selectedYear, incomeCategories, expenseCategories]);

  const annualTotals = useMemo(() => {
    const totals: Record<string, CalculatedValues> = {};
    if (calculatedMonthlyData.length === 0) return totals;

    const keysToSum = [
        ...Object.keys(incomeCategories),
        ...Object.keys(expenseCategories),
        'totale_ricavi', 'totale_costi_di_produzione', 'totale_costi_produttivi',
        'margine_di_contribuzione', 'totale_costi', 'ebitda'
    ];

    keysToSum.forEach(key => {
        totals[key] = { budget: 0, actual: 0, scostamento: 0, percScostamento: 0, breakdown: {} };
    });
    
    calculatedMonthlyData.forEach(monthData => {
        for(const key in monthData) {
            if(totals[key]) {
                totals[key].budget += monthData[key].budget;
                totals[key].actual += monthData[key].actual;

                if (monthData[key].breakdown) {
                    for(const breakKey in monthData[key].breakdown) {
                        if (!totals[key].breakdown![breakKey]) {
                            totals[key].breakdown![breakKey] = { budget: 0, actual: 0 };
                        }
                        totals[key].breakdown![breakKey].budget += monthData[key].breakdown![breakKey].budget;
                        totals[key].breakdown![breakKey].actual += monthData[key].breakdown![breakKey].actual;
                    }
                }
            }
        }
    });

    for(const key in totals) {
        totals[key].scostamento = totals[key].actual - totals[key].budget;
        totals[key].percScostamento = totals[key].budget !== 0 ? (totals[key].scostamento / Math.abs(totals[key].budget)) * 100 : (totals[key].actual > 0 ? 100 : 0);
    }
    
    return totals;
  }, [calculatedMonthlyData, incomeCategories, expenseCategories]);

  const handleExportToCSV = () => {
    // ... CSV export logic, can be adapted later if needed
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderBreakdownRows = (breakdown: Record<string, { budget: number, actual: number }>, isPositiveGood: boolean) => {
      return Object.entries(breakdown).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, values]) => {
          const scostamento = values.actual - values.budget;
          const percScostamento = values.budget !== 0 ? (scostamento / Math.abs(values.budget)) * 100 : (values.actual > 0 ? 100 : 0);
          const scostamentoClass = scostamento === 0 ? '' : (isPositiveGood ? (scostamento > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : (scostamento > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'));
          return (
              <TableRow key={`break-${key}`} className="bg-muted/30 hover:bg-muted/50">
                  <TableCell className="pl-12 font-light italic">{key}</TableCell>
                  <TableCell>{isClient ? renderValue(values.budget) : '€0.00'}</TableCell>
                  <TableCell>{isClient ? renderValue(values.actual) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderValue(scostamento) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderPercentage(percScostamento) : '0.00%'}</TableCell>
              </TableRow>
          );
      });
  };

  const renderTableRows = (data: MonthlyData | Record<string, CalculatedValues>, monthIndex: number | 'annual') => {
      const isAnnual = monthIndex === 'annual';
      
      const renderRow = (key: string, label: string, values: CalculatedValues | undefined, rowClass: string, isExpandable: boolean, isPositiveGood: boolean) => {
          if (!values) return null;
          const isExpanded = expandedRows.has(key);
          const scostamentoClass = values.scostamento === 0 ? '' : (isPositiveGood ? (values.scostamento > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : (values.scostamento > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'));
          
          return (
            <React.Fragment key={key}>
              <TableRow className={cn(rowClass, isExpandable && "cursor-pointer")} onClick={isExpandable ? () => toggleRow(key) : undefined}>
                  <TableCell className="font-medium flex items-center">
                    {isExpandable && (isExpanded ? <ChevronDown className="h-4 w-4 mr-2"/> : <ChevronRight className="h-4 w-4 mr-2"/>)}
                    {label}
                  </TableCell>
                  <TableCell>
                      {isAnnual ? (isClient ? renderValue(values.budget) : '€0.00') : (
                        <Input type="number" step="0.01"
                            defaultValue={values.budget.toFixed(2)}
                            onChange={(e) => handleBudgetChange(monthIndex as number, key, e.target.value)}
                            className="h-8"
                            onClick={(e) => e.stopPropagation()}
                            />
                      )}
                  </TableCell>
                  <TableCell>{isClient ? renderValue(values.actual) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderValue(values.scostamento) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderPercentage(values.percScostamento) : '0.00%'}</TableCell>
              </TableRow>
              {isExpanded && values.breakdown && renderBreakdownRows(values.breakdown, isPositiveGood)}
            </React.Fragment>
          );
      };

      return (
        <>
            <TableRow className="bg-background font-semibold text-foreground hover:bg-background"><TableCell colSpan={5}>RICAVI</TableCell></TableRow>
            {Object.keys(incomeCategories).sort().map(cat => renderRow(cat, cat, data[cat], '', false, true))}
            {renderRow('totale_ricavi', 'TOTALE RICAVI', data['totale_ricavi'], 'bg-muted/50 font-bold', true, true)}

            <TableRow className="bg-background font-semibold text-foreground hover:bg-background"><TableCell colSpan={5}>COSTI DI PRODUZIONE</TableCell></TableRow>
            {Object.entries(expenseCategories).filter(([,val]) => val.forecastType === 'Costi di Produzione').sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([cat]) => renderRow(cat, cat, data[cat], '', false, false))}
            {renderRow('totale_costi_di_produzione', 'TOTALE COSTI DI PRODUZIONE', data['totale_costi_di_produzione'], 'bg-muted/50 font-bold', true, false)}

            {renderRow('margine_di_contribuzione', 'MARGINE DI CONTRIBUZIONE', data['margine_di_contribuzione'], 'bg-green-100 dark:bg-green-900/50 font-bold', false, true)}
            
            <TableRow className="bg-background font-semibold text-foreground hover:bg-background"><TableCell colSpan={5}>COSTI PRODUTTIVI</TableCell></TableRow>
            {Object.entries(expenseCategories).filter(([,val]) => val.forecastType !== 'Costi di Produzione').sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([cat]) => renderRow(cat, cat, data[cat], '', false, false))}
            {renderRow('totale_costi_produttivi', 'TOTALE COSTI PRODUTTIVI', data['totale_costi_produttivi'], 'bg-muted/50 font-bold', true, false)}

            {renderRow('totale_costi', 'TOTALE COSTI', data['totale_costi'], 'bg-yellow-100 dark:bg-yellow-900/50 font-bold', false, false)}
            {renderRow('ebitda', 'EBITDA', data['ebitda'], 'bg-green-200 dark:bg-green-800/60 font-extrabold text-lg', false, true)}
        </>
      );
  };
  
  if (isLoading || loadingCategories) {
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
            <Button variant="outline" onClick={handleExportToCSV}>
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
                          {renderTableRows(monthData, i)}
                      </TableBody>
                  </Table>
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
                      {renderTableRows(annualTotals, 'annual')}
                  </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}

    