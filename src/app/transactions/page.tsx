
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addMonths, getYear, getMonth, parseISO, isValid, startOfMonth, endOfMonth, subMonths, getDate, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { RecurrenceFrequency, TransactionStatus, expenseCategories } from "@/config/transaction-categories";
import { AlertCircle, CalendarPlus, CalendarMinus, Edit3, Trash2, Search, Repeat, ChevronsUpDown } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import { useToast } from '@/hooks/use-toast';

interface RecurrenceDetails {
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  nextDueDate?: string;
}

export interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd
  description?: string;
  category: string;
  subcategory?: string;
  type: 'Entrata' | 'Uscita';
  amount: number;
  status: TransactionStatus;
  isRecurring?: boolean;
  recurrenceDetails?: RecurrenceDetails;
  originalRecurringId?: string;
}

const today = new Date();
const currentMonth = getMonth(today);
const currentYear = getYear(today);

export const initialTransactions: Transaction[] = [
  // Mese Corrente
  { id: "t1", date: format(today, "yyyy-MM-dd"), description: "Pagamento Fattura #123 - Mario Rossi", category: "Pazienti", type: "Entrata", amount: 150.00, status: "Completato" },
  { id: "t2", date: format(today, "yyyy-MM-dd"), description: "Acquisto compositi", category: "Materiali", subcategory: "Materiale Conservativa", type: "Uscita", amount: -85.20, status: "Completato" },
  { id: "t3", date: format(today, "yyyy-MM-dd"), description: "Affitto Studio - Mese Corrente", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Completato" },
  { id: "t5", date: format(subDays(today, 2), "yyyy-MM-dd"), description: "Fattura Laboratorio Baisotti", category: "Servizi Esterni", subcategory: "Lab. Baisotti", type: "Uscita", amount: -450.75, status: "Completato" },
  { id: "t6", date: format(subDays(today, 3), "yyyy-MM-dd"), description: "Forniture Ufficio", category: "Spesa Studio", subcategory: "Forniture D’Ufficio", type: "Uscita", amount: -60.00, status: "Completato" },
  { id: "t8", date: format(subDays(today, 1), "yyyy-MM-dd"), description: "Pulizia impianti", category: "Materiali", subcategory: "Materiale Impianti", type: "Uscita", amount: -120.50, status: "Pianificato" },
  { id: "t9", date: format(new Date(currentYear, currentMonth, 5), "yyyy-MM-dd"), description: "Marketing Facebook Ads", category: "Altre spese", subcategory: "Marketing", type: "Uscita", amount: -150.00, status: "Completato"},
  { id: "t10", date: format(new Date(currentYear, currentMonth, 10), "yyyy-MM-dd"), description: "Bolletta Luce", category: "Spese Fisse", subcategory: "Elettricità", type: "Uscita", amount: -95.60, status: "Completato"},
  { id: "t11", date: format(new Date(currentYear, currentMonth, 3), "yyyy-MM-dd"), description: "Stipendio Ilaria - Mese Corrente", category: "Personale", subcategory: "Stipendio Ilaria", type: "Uscita", amount: -1400.00, status: "Completato"},
  { id: "t12", date: format(new Date(currentYear, currentMonth, 12), "yyyy-MM-dd"), description: "Incasso Dr. Verdi", category: "Pazienti", type: "Entrata", amount: 280.00, status: "Completato"},
  { id: "t13", date: format(new Date(currentYear, currentMonth, 15), "yyyy-MM-dd"), description: "Tasse", category: "Spese Finanziarie", subcategory: "Tasse", type: "Uscita", amount: -3200.00, status: "Completato"},
  { id: "t14", date: format(new Date(currentYear, currentMonth, 8), "yyyy-MM-dd"), description: "Materiale Ortodonzia", category: "Materiali", subcategory: "Materiale Ortodonzia", type: "Uscita", amount: -210.00, status: "Completato"},
  { id: "t15", date: format(new Date(currentYear, currentMonth, 1), "yyyy-MM-dd"), description: "Compenso Dr. Mapelli", category: "Personale", subcategory: "Compenso Dr. Mapelli", type: "Uscita", amount: -2800.00, status: "Completato"},
  { id: "t28", date: format(new Date(currentYear, currentMonth, 18), "yyyy-MM-dd"), description: "Entrata da Sig.ra Paola Neri", category: "Pazienti", type: "Entrata", amount: 450.00, status: "Completato" },
  { id: "t29", date: format(new Date(currentYear, currentMonth, 20), "yyyy-MM-dd"), description: "Spesa cancelleria", category: "Spesa Studio", subcategory:"Forniture D’Ufficio", type: "Uscita", amount: -25.99, status: "Completato" },


  // Mese Precedente
  { id: "t4", date: format(subMonths(today, 1), "yyyy-MM-dd"), description: "Stipendio Daniela - Mese Prec.", category: "Personale", subcategory: "Stipendio Daniela", type: "Uscita", amount: -1350.00, status: "Completato" },
  { id: "t7", date: format(subMonths(today, 1), "yyyy-MM-dd"), description: "Incasso Dr. Bianchi - Mese Prec.", category: "Pazienti", type: "Entrata", amount: 320.00, status: "Completato" },
  { id: "t16", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 15), "yyyy-MM-dd"), description: "Affitto Studio - Mese Prec.", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Completato"},
  { id: "t17", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 10), "yyyy-MM-dd"), description: "Materiale Impianti - Mese Prec.", category: "Materiali", subcategory: "Materiale Impianti", type: "Uscita", amount: -2150.00, status: "Completato"},
  { id: "t18", date: format(new Date(getYear(subMonths(today, 1)), getMonth(subMonths(today, 1)), 5), "yyyy-MM-dd"), description: "Entrata Sig. Rossi - Mese Prec.", category: "Pazienti", type: "Entrata", amount: 500.00, status: "Completato"},

  // Due Mesi Fa
  { id: "t19", date: format(subMonths(today, 2), "yyyy-MM-dd"), description: "Pagamento Consulente del Lavoro", category: "Servizi Esterni", subcategory: "Consulente del Lavoro", type: "Uscita", amount: -300.00, status: "Completato" },
  { id: "t20", date: format(subMonths(today, 2), "yyyy-MM-dd"), description: "Incasso Sig. Verdi", category: "Pazienti", type: "Entrata", amount: 200.00, status: "Completato" },
  { id: "t21", date: format(subMonths(today, 2), "yyyy-MM-dd"), description: "Affitto Studio - Due Mesi Fa", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Completato"},
  { id: "t22", date: format(subMonths(today, 2), "yyyy-MM-dd"), description: "Stipendio Ilaria - Due Mesi Fa", category: "Personale", subcategory: "Stipendio Ilaria", type: "Uscita", amount: -1400.00, status: "Completato"},


  // Tre Mesi Fa
  { id: "t23", date: format(subMonths(today, 3), "yyyy-MM-dd"), description: "Acquisto Software Gestionale Update", category: "Spesa Studio", subcategory: "Software Gestionale", type: "Uscita", amount: -500.00, status: "Completato" },
  { id: "t24", date: format(subMonths(today, 3), "yyyy-MM-dd"), description: "Entrata Sig. Neri", category: "Pazienti", type: "Entrata", amount: 120.00, status: "Completato" },

  // Quattro Mesi Fa
  { id: "t25", date: format(subMonths(today, 4), "yyyy-MM-dd"), description: "Manutenzione Attrezzature", category: "Spesa Studio", subcategory: "Manutenzione", type: "Uscita", amount: -250.00, status: "Completato" },
  { id: "t26", date: format(subMonths(today, 4), "yyyy-MM-dd"), description: "Entrata Sig.ra Gallo", category: "Pazienti", type: "Entrata", amount: 600.00, status: "Completato" },

  // Cinque Mesi Fa
  { id: "t27", date: format(subMonths(today, 5), "yyyy-MM-dd"), description: "Fattura Commercialista", category: "Servizi Esterni", subcategory: "Commercialista", type: "Uscita", amount: -350.00, status: "Completato" },
  { id: "t30", date: format(subMonths(today,5), "yyyy-MM-dd"), description: "Entrata Sig.ra Colombo", category: "Pazienti", type: "Entrata", amount: 180.00, status: "Completato" },
];


const generateYears = () => {
  const currentYr = getYear(new Date());
  return Array.from({ length: 5 }, (_, i) => (currentYr - i).toString());
};
const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), "MMMM", { locale: it }) }));

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const { toast } = useToast();


  const handleSort = (key: keyof Transaction) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      if (!isValid(transactionDate)) return false; // Skip invalid dates
      const matchesYear = getYear(transactionDate).toString() === selectedYear;
      const matchesMonth = getMonth(transactionDate).toString() === selectedMonth;
      const matchesSearch = (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.subcategory && t.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesYear && matchesMonth && matchesSearch;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (valA === undefined || valB === undefined) return 0;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (sortConfig.key === 'date') {
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (isValid(dateA) && isValid(dateB)) {
              comparison = dateA.getTime() - dateB.getTime();
            } else {
              comparison = 0; // Handle invalid dates during sort
            }
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return filtered;
  }, [transactions, searchTerm, selectedYear, selectedMonth, sortConfig]);

  const recurringTransactionsDefinitions = useMemo(() => {
    return transactions.filter(t => t.isRecurring && !t.originalRecurringId);
  }, [transactions]);

  const handleTransactionSubmit = (data: TransactionFormData, id?: string) => {
    const transactionData: Omit<Transaction, 'id'> = {
      date: format(data.date, "yyyy-MM-dd"),
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      type: data.type,
      amount: data.type === 'Uscita' ? -Math.abs(data.amount) : Math.abs(data.amount),
      status: data.status as TransactionStatus,
      isRecurring: data.isRecurring,
      recurrenceDetails: data.isRecurring && data.recurrenceFrequency ? {
        frequency: data.recurrenceFrequency as RecurrenceFrequency,
        startDate: format(data.date, "yyyy-MM-dd"),
        endDate: data.recurrenceEndDate ? format(data.recurrenceEndDate, "yyyy-MM-dd") : undefined,
      } : undefined,
    };

    if (id) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transactionData, id: id } : t));
    } else {
      const newTransaction = { ...transactionData, id: crypto.randomUUID() };
      setTransactions(prev => [...prev, newTransaction]);

      if (newTransaction.isRecurring && newTransaction.recurrenceDetails) {
          const instances: Transaction[] = [];
          let currentDate = parseISO(newTransaction.recurrenceDetails.startDate);
          const recurrenceEndDate = newTransaction.recurrenceDetails.endDate ? parseISO(newTransaction.recurrenceDetails.endDate) : undefined;

          for (let i = 0; i < 3; i++) { // Generate for next 3 occurrences as example
              let nextDate = currentDate;
              switch(newTransaction.recurrenceDetails.frequency) {
                  case 'Mensile': nextDate = addMonths(currentDate, i + 1); break;
                  // TODO: Implement other frequencies if needed
                  default: nextDate = addMonths(currentDate, i + 1); break;
              }
              if (recurrenceEndDate && nextDate > recurrenceEndDate) break;

              instances.push({
                  ...newTransaction,
                  id: crypto.randomUUID(),
                  date: format(nextDate, "yyyy-MM-dd"),
                  isRecurring: false,
                  recurrenceDetails: undefined,
                  originalRecurringId: newTransaction.id,
                  status: 'Pianificato'
              });
          }
          setTransactions(prev => [...prev, ...instances]);
      }
    }
    setEditingTransaction(null);
  };


  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionTypeForModal(transaction.type);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id && t.originalRecurringId !== id));
    // Also remove instances if deleting a recurring definition
    setTransactions(prev => prev.filter(t => t.originalRecurringId !== id));
     toast({ title: "Transazione Eliminata", description: "La transazione e le sue eventuali istanze sono state rimosse." });
  };

  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedRows);
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id) && !(t.originalRecurringId && idsToDelete.includes(t.originalRecurringId))));
    idsToDelete.forEach(deletedId => {
      setTransactions(prev => prev.filter(t => t.originalRecurringId !== deletedId));
    });
    setSelectedRows(new Set());
    toast({ title: "Transazioni Eliminate", description: `${idsToDelete.length} transazioni selezionate sono state rimosse.` });
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAllRows = (event: React.ChangeEvent<HTMLInputElement>) => { // Explicitly type event
    if ((event.target as HTMLInputElement).checked) { // Type assertion
      setSelectedRows(new Set(filteredAndSortedTransactions.map(t => t.id)));
    } else {
      setSelectedRows(new Set());
    }
  };


  const openModalForNew = (type: 'Entrata' | 'Uscita') => {
    setEditingTransaction(null);
    setTransactionTypeForModal(type);
    setIsModalOpen(true);
  };

  return (
    <TooltipProvider>
      <PageHeader
        title="Transazioni"
        description="Visualizza e gestisci tutte le entrate e uscite."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openModalForNew('Entrata')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-green-600 dark:text-green-400">Nuova Entrata</CardTitle>
            <CalendarPlus className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Registra un nuovo incasso o entrata.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openModalForNew('Uscita')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-red-600 dark:text-red-400">Nuova Uscita</CardTitle>
            <CalendarMinus className="h-6 w-6 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Registra una nuova spesa o uscita.</p>
          </CardContent>
        </Card>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        transactionTypeInitial={transactionTypeForModal}
        editingTransaction={editingTransaction}
        onSubmitSuccess={handleTransactionSubmit}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Repeat className="mr-2 h-5 w-5 text-primary" />
            Transazioni Ricorrenti Definite
          </CardTitle>
          <CardDescription>Elenco delle tue spese e entrate ricorrenti principali.</CardDescription>
        </CardHeader>
        <CardContent>
          {recurringTransactionsDefinitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna transazione ricorrente definita.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Frequenza</TableHead>
                  <TableHead>Inizio</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringTransactionsDefinitions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>€{t.amount.toFixed(2)}</TableCell>
                    <TableCell>{t.recurrenceDetails?.frequency}</TableCell>
                    <TableCell>{t.recurrenceDetails?.startDate ? format(parseISO(t.recurrenceDetails.startDate), "dd/MM/yyyy", { locale: it }) : '-'}</TableCell>
                    <TableCell>{t.recurrenceDetails?.endDate ? format(parseISO(t.recurrenceDetails.endDate), "dd/MM/yyyy", { locale: it }) : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleEdit(t)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Modifica Definizione</p></TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Elimina Definizione e Istanze</p></TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6"/>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Elenco Transazioni (Istanze)</CardTitle>
          <CardDescription>Visualizza tutte le transazioni, incluse quelle generate da definizioni ricorrenti.</CardDescription>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
            <div className="flex gap-2 items-center">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Mese" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  {generateYears().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cerca transazioni..."
                className="pl-8 sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
           {selectedRows.size > 0 && (
             <div className="mt-4">
                <Button variant="destructive" onClick={handleBulkDelete} size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina Selezionate ({selectedRows.size})
                </Button>
             </div>
            )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedRows.size === filteredAndSortedTransactions.length && filteredAndSortedTransactions.length > 0}
                    onCheckedChange={(event: boolean | 'indeterminate') => {
                        if (event === true) {
                            setSelectedRows(new Set(filteredAndSortedTransactions.map(t => t.id)));
                        } else {
                            setSelectedRows(new Set());
                        }
                    }}
                    aria-label="Seleziona tutte"
                  />
                </TableHead>
                {(['date', 'description', 'category', 'subcategory', 'type', 'amount', 'status'] as const).map(key => (
                    <TableHead key={key} onClick={() => handleSort(key as keyof Transaction)} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">
                            {key === 'date' ? 'Data' : key === 'description' ? 'Descrizione' : key === 'category' ? 'Categoria' : key === 'subcategory' ? 'Sottocategoria' : key === 'type' ? 'Tipo' : key === 'amount' ? 'Importo' : 'Stato'}
                            {sortConfig.key === key && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                            {sortConfig.key !== key && <ChevronsUpDown className="ml-2 h-3 w-3 text-muted-foreground" />}
                        </div>
                    </TableHead>
                ))}
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.map((transaction) => (
                <TableRow key={transaction.id} data-state={selectedRows.has(transaction.id) ? "selected" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(transaction.id)}
                      onCheckedChange={() => handleSelectRow(transaction.id)}
                      aria-label={`Seleziona transazione ${transaction.description}`}
                    />
                  </TableCell>
                  <TableCell>{isValid(parseISO(transaction.date)) ? format(parseISO(transaction.date), "dd/MM/yyyy", { locale: it }) : "Data non valida"}</TableCell>
                  <TableCell className="font-medium flex items-center">
                    {transaction.description}
                    {transaction.isRecurring && !transaction.originalRecurringId && (
                      <Tooltip>
                        <TooltipTrigger asChild><Repeat className="ml-2 h-3 w-3 text-blue-500" /></TooltipTrigger>
                        <TooltipContent><p>Transazione Ricorrente (Definizione)</p></TooltipContent>
                      </Tooltip>
                    )}
                    {transaction.originalRecurringId && (
                      <Tooltip>
                        <TooltipTrigger asChild><Repeat className="ml-2 h-3 w-3 text-gray-400" /></TooltipTrigger>
                        <TooltipContent><p>Istanza di transazione ricorrente</p></TooltipContent>
                      </Tooltip>
                    )}
                    </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.subcategory ? <Badge variant="outline">{transaction.subcategory}</Badge> : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === "Entrata" ? "default" : "destructive"} className={transaction.type === "Entrata" ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-200 dark:border-green-700" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-200 dark:border-red-700"}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    €{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                     <Badge
                        variant={transaction.status === "Completato" ? "default" : transaction.status === "In Attesa" ? "secondary" : "outline"}
                        className={
                            transaction.status === "Completato" ? "border-green-500 text-green-600 dark:border-green-600 dark:text-green-400 bg-green-500/10" :
                            transaction.status === "In Attesa" ? "border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-400 bg-yellow-500/10" :
                            "border-blue-500 text-blue-600 dark:border-blue-600 dark:text-blue-400 bg-blue-500/10"
                        }
                     >
                        {transaction.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleEdit(transaction)}
                                    disabled={!!transaction.originalRecurringId && transaction.isRecurring === false}
                            >
                            <Edit3 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{!!transaction.originalRecurringId && transaction.isRecurring === false ? "Modifica la definizione ricorrente" : "Modifica Transazione/Definizione"}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(transaction.id)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Elimina</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAndSortedTransactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
                        Nessuna transazione trovata per i filtri selezionati.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

    