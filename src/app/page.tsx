
"use client";

import React, { useState } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // CardDescription rimossa perché non usata qui
import { TrendingUp, TrendingDown, ArrowRight, Upload, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardBarChart from "@/components/charts/dashboard-bar-chart";
import DashboardPieChart from "@/components/charts/dashboard-pie-chart";
import DashboardCashflowLineChart from "@/components/charts/dashboard-cashflow-line-chart";
// Link rimosso perché "Vedi tutte" ora apre un dialog
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isValid, getMonth, getYear } from "date-fns";
import { it } from "date-fns/locale";
import type { Transaction } from '@/app/transactions/page';
import { initialTransactions } from '@/app/transactions/page';


const barChartData = [
  { month: "Gen", income: 4000, expenses: 2400 },
  { month: "Feb", income: 3000, expenses: 1398 },
  { month: "Mar", income: 2000, expenses: 5800 },
  { month: "Apr", income: 2780, expenses: 3908 },
  { month: "Mag", income: 1890, expenses: 4800 },
  { month: "Giu", income: 2390, expenses: 3800 },
];

const barChartConfig = {
  income: { label: "Entrate", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite", color: "hsl(var(--chart-2))" },
};

const lineChartConfig = {
  cashflow: { label: "Flusso di Cassa", color: "hsl(var(--chart-1))" },
};

const expenseCategoriesData = [
  {
    title: "Spese Fisse",
    value: 2370.50,
    itemCount: 8,
    topItems: [ // Rinominato da items a topItems
      { name: "Affitto", amount: 1800.00 },
      { name: "Luce", amount: 320.50 },
      { name: "Spese condominiali", amount: 250.00 },
    ],
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-700",
    pieFill: "hsl(260 70% 78%)", // Mantenuto più carico
  },
  {
    title: "Materiali",
    value: 3580.25,
    itemCount: 9,
    topItems: [
      { name: "Materiale Impianti", amount: 2150.00 },
      { name: "Materiale Conservativa", amount: 780.25 },
      { name: "Materiale Chirurgia", amount: 650.00 },
    ],
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-300",
    borderColor: "border-green-300 dark:border-green-700",
    pieFill: "hsl(150 60% 70%)", // Mantenuto più carico
  },
  {
    title: "Personale",
    value: 5550.00,
    itemCount: 11,
    topItems: [
      { name: "Stipendio Ilaria", amount: 1400.00 },
      { name: "Stipendio Daniela", amount: 1350.00 },
      { name: "Compenso Dr. Mapelli", amount: 2800.00 },
    ],
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    textColor: "text-pink-700 dark:text-pink-300",
    borderColor: "border-pink-300 dark:border-pink-700",
    pieFill: "hsl(340 80% 78%)", // Mantenuto più carico
  },
  {
    title: "Servizi Esterni",
    value: 2580.00,
    itemCount: 6,
    topItems: [
      { name: "Lab. Baisotti", amount: 1250.00 },
      { name: "Lab. Ennevi (Orto)", amount: 980.00 },
      { name: "Commercialista", amount: 350.00 },
    ],
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-300",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    pieFill: "hsl(50 75% 72%)", // Mantenuto più carico
  },
   {
    title: "Altre Spese", // Modificato per coerenza, era "Altre spese"
    value: 3500.00,
    itemCount: 5,
    topItems: [
      { name: "Tasse", amount: 3200.00 },
      { name: "Marche da Bollo / Banca", amount: 120.00 },
      { name: "Regali", amount: 180.00 },
    ],
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-300 dark:border-red-700",
    pieFill: "hsl(20 75% 75%)", // Mantenuto più carico
  },
];

const pieChartData = expenseCategoriesData.map(cat => ({
  name: cat.title,
  value: cat.value,
  fill: cat.pieFill,
}));


interface ExpenseCategoryCardProps {
  title: string;
  itemCount: number;
  topItems: Array<{ name: string; amount: number }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
  onViewAllClick: (categoryName: string) => void;
}

const ExpenseCategoryCard: React.FC<ExpenseCategoryCardProps> = ({ title, itemCount, topItems, bgColor, textColor, borderColor, onViewAllClick }) => {
  return (
    <Card className={`${bgColor} ${borderColor} border shadow-lg hover:shadow-xl transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className={`text-xl font-headline ${textColor}`}>{title}</CardTitle>
          <Badge variant="secondary" className={`${textColor} ${bgColor === 'bg-red-100 dark:bg-red-900/30' ? 'bg-red-200 dark:bg-red-700' : bgColor === 'bg-yellow-100 dark:bg-yellow-900/30' ? 'bg-yellow-200 dark:bg-yellow-700' : bgColor === 'bg-pink-100 dark:bg-pink-900/30' ? 'bg-pink-200 dark:bg-pink-700' : bgColor === 'bg-green-100 dark:bg-green-900/30' ? 'bg-green-200 dark:bg-green-700' : 'bg-purple-200 dark:bg-purple-700'} border-none`}>
            {itemCount} voci
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1.5 text-sm">
          {topItems.slice(0, 3).map((item, index) => (
            <li key={index} className="flex justify-between items-center">
              <span className="text-muted-foreground">{item.name}</span>
              <span className={`font-medium ${textColor}`}>€{item.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </li>
          ))}
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
  const { toast } = useToast();

  const handleImportData = () => {
    toast({
        title: "Importa Dati",
        description: "La funzionalità di importazione dati non è ancora implementata.",
    });
  };

  const handleExportData = () => {
     toast({
        title: "Esporta Dati",
        description: "La funzionalità di esportazione dati non è ancora implementata.",
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

  const currentBalance = 3580;

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Totali (Mese)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">€12,345</div>
            <p className="text-xs text-muted-foreground">+5.2% rispetto al mese scorso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Totali (Mese)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">€8,765</div>
            <p className="text-xs text-muted-foreground">-1.8% rispetto al mese scorso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Attuale</CardTitle>
            {currentBalance >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              €{currentBalance.toLocaleString('it-IT')}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentBalance >=0 ? "Bilancio positivo" : "Bilancio negativo"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Entrate vs Uscite Mensili</CardTitle>
            {/* <CardDescription>Confronto degli ultimi 6 mesi.</CardDescription> */}
          </CardHeader>
          <CardContent>
            <DashboardBarChart data={barChartData} config={barChartConfig} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Distribuzione Spese</CardTitle>
            {/* <CardDescription>Categorie di spesa principali questo mese.</CardDescription> */}
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <DashboardPieChart data={pieChartData} onSliceClick={handlePieSliceClick} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-headline font-semibold mb-4 text-foreground">Categorie di Uscite</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenseCategoriesData.map((category) => (
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
            <CardTitle className="font-headline">Flusso di Cassa Recente</CardTitle>
            {/* <CardDescription>Andamento del flusso di cassa negli ultimi 30 giorni.</CardDescription> */}
          </CardHeader>
          <CardContent>
            <DashboardCashflowLineChart data={[]} config={lineChartConfig} />
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
        <DialogContent className="sm:max-w-3xl"> {/* Aumentata larghezza */}
          <DialogHeader>
            <DialogTitle>{detailDialogTitle}</DialogTitle>
            <DialogDescriptionComponent>
              {detailDialogDescription}
            </DialogDescriptionComponent>
          </DialogHeader>
          {transactionsForDialog && transactionsForDialog.length > 0 ? (
            <ScrollArea className="h-[400px] mt-4 border rounded-md"> {/* Aumentata altezza */}
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
                        €{Math.abs(transaction.amount).toFixed(2)}
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

