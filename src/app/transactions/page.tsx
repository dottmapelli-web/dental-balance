
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
import { RecurrenceFrequency, TransactionStatus, expenseCategories, transactionStatuses } from "@/config/transaction-categories";
import { AlertCircle, CalendarPlus, CalendarMinus, Edit3, Trash2, Search, Repeat, ChevronsUpDown, Filter } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import { useToast } from '@/hooks/use-toast';
import { initialTransactions, type Transaction } from '@/data/transactions-data';


const generateYears = () => {
  const currentYr = getYear(new Date());
  return Array.from({ length: 5 }, (_, i) => (currentYr - i).toString());
};
const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), "MMMM", { locale: it }) }));
const statusOptions = ["all", ...transactionStatuses] as const;


const columnOrder: Array<keyof Transaction | 'actions'> = ['date', 'type', 'category', 'subcategory', 'amount', 'description', 'status', 'actions'];
const columnDisplayNames: Record<keyof Transaction | 'actions', string> = {
  date: 'Data',
  type: 'Tipo',
  category: 'Categoria',
  subcategory: 'Sottocategoria',
  amount: 'Importo',
  description: 'Descrizione',
  status: 'Stato',
  id: 'ID', 
  isRecurring: 'Ricorrente',
  recurrenceDetails: 'Dettagli Ricorrenza',
  originalRecurringId: 'ID Ricorrenza Originale',
  actions: 'Azioni',
};


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedStatus, setSelectedStatus] = useState<typeof statusOptions[number]>("all");
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
      if (!isValid(transactionDate)) return false; 
      const matchesYear = getYear(transactionDate).toString() === selectedYear;
      const matchesMonth = getMonth(transactionDate).toString() === selectedMonth;
      const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;
      const matchesSearch = (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.subcategory && t.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesYear && matchesMonth && matchesSearch && matchesStatus;
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
              comparison = 0; 
            }
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return filtered;
  }, [transactions, searchTerm, selectedYear, selectedMonth, selectedStatus, sortConfig]);

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

          for (let i = 0; i < 3; i++) { 
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
                  isRecurring: false, // Instances are not definitions
                  recurrenceDetails: undefined,
                  originalRecurringId: newTransaction.id,
                  status: 'Pianificato' // Instances start as Pianificato
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
    // Remove the transaction itself
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    // If it's a recurring definition, remove its instances
    // Also, remove any instances if an instance itself is deleted (though less common scenario for direct deletion)
    setTransactions(prev => prev.filter(t => t.originalRecurringId !== id));
     toast({ title: "Transazione Eliminata", description: "La transazione e le sue eventuali istanze sono state rimosse." });
  };

  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedRows);
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id) && !(t.originalRecurringId && idsToDelete.includes(t.originalRecurringId))));
    // Ensure instances of deleted recurring definitions are also removed
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

  const handleSelectAllRows = (event: React.ChangeEvent<HTMLInputElement>) => { 
    if ((event.target as HTMLInputElement).checked) { 
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
                  <TableHead>Data Inizio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Sottocategoria</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Stato (Def.)</TableHead>
                  <TableHead>Frequenza</TableHead>
                  <TableHead>Data Fine</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringTransactionsDefinitions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{isValid(parseISO(t.date)) ? format(parseISO(t.date), "dd/MM/yyyy", { locale: it }) : "Data non valida"}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "Entrata" ? "default" : "destructive"} className={t.type === "Entrata" ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-200 dark:border-green-700" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-200 dark:border-red-700"}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {t.subcategory ? <Badge variant="outline">{t.subcategory}</Badge> : "-"}
                    </TableCell>
                    <TableCell className={`font-semibold ${t.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      €{Math.abs(t.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "Completato" ? "default" : t.status === "In Attesa" ? "secondary" : "outline"}
                        className={
                            t.status === "Completato" ? "border-green-500 text-green-600 dark:border-green-600 dark:text-green-400 bg-green-500/10" :
                            t.status === "In Attesa" ? "border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-400 bg-yellow-500/10" :
                            "border-blue-500 text-blue-600 dark:border-blue-600 dark:text-blue-400 bg-blue-500/10"
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.recurrenceDetails?.frequency}</TableCell>
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
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Mese" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[100px]">
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  {generateYears().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof statusOptions[number])}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Stato" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s === "all" ? "Tutti gli Stati" : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cerca per descrizione, categoria..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
           {selectedRows.size > 0 && (
             <div className="mt-4 flex justify-start">
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
                {columnOrder.map(key => (
                    <TableHead key={key} onClick={() => key !== 'actions' && handleSort(key as keyof Transaction)} className={key !== 'actions' ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <div className="flex items-center">
                            {columnDisplayNames[key as keyof Transaction | 'actions']}
                            {sortConfig.key === key && key !== 'actions' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                            {sortConfig.key !== key && key !== 'actions' && <ChevronsUpDown className="ml-2 h-3 w-3 text-muted-foreground" />}
                        </div>
                    </TableHead>
                ))}
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
                  <TableCell>
                    <Badge variant={transaction.type === "Entrata" ? "default" : "destructive"} className={transaction.type === "Entrata" ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-200 dark:border-green-700" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-200 dark:border-red-700"}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.subcategory ? <Badge variant="outline">{transaction.subcategory}</Badge> : "-"}
                  </TableCell>
                   <TableCell className={`text-right font-semibold ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    €{transaction.amount.toFixed(2)}
                  </TableCell>
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
                                    disabled={!!transaction.originalRecurringId && transaction.isRecurring === false && !transactions.find(t => t.id === transaction.originalRecurringId)?.isRecurring}
                            >
                            <Edit3 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{!!transaction.originalRecurringId && transaction.isRecurring === false && !transactions.find(t => t.id === transaction.originalRecurringId)?.isRecurring ? "Modifica la definizione ricorrente originale" : "Modifica Transazione/Definizione"}</p></TooltipContent>
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
                    <TableCell colSpan={columnOrder.length + 1} className="text-center text-muted-foreground h-24"> {/* +1 per la checkbox */}
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
