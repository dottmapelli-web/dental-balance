
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, getYear, getMonth, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { it } from "date-fns/locale";
import { expenseCategories, incomeCategories, allExpenseCategories, allIncomeCategories, getSubcategories, recurrenceFrequencies, transactionStatuses, RecurrenceFrequency, TransactionStatus } from "@/config/transaction-categories";
import { AlertCircle, CalendarIcon, CalendarPlus, CalendarMinus, Edit3, Trash2, Search, Repeat, ChevronsUpDown, PlusCircle } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RecurrenceDetails {
  frequency: RecurrenceFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  nextDueDate?: string; // YYYY-MM-DD, calculated
}

export interface Transaction {
  id: string;
  date: string; 
  description: string;
  category: string;
  subcategory?: string;
  type: 'Entrata' | 'Uscita';
  amount: number;
  status: TransactionStatus;
  isRecurring?: boolean;
  recurrenceDetails?: RecurrenceDetails;
  originalRecurringId?: string; // Per le istanze generate
}

const transactionFormSchema = z.object({
  type: z.enum(['Entrata', 'Uscita']),
  date: z.date({ required_error: "La data è obbligatoria." }),
  description: z.string().min(3, { message: "La descrizione deve avere almeno 3 caratteri." }),
  amount: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  category: z.string().min(1, { message: "La categoria è obbligatoria." }),
  subcategory: z.string().optional(),
  status: z.enum(transactionStatuses),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(recurrenceFrequencies).optional(),
  recurrenceEndDate: z.date().optional(),
}).refine(data => {
  if (data.isRecurring) {
    return !!data.recurrenceFrequency;
  }
  return true;
}, {
  message: "La frequenza è obbligatoria per transazioni ricorrenti.",
  path: ["recurrenceFrequency"],
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

const initialTransactions: Transaction[] = [
  { id: "1", date: format(new Date(), "yyyy-MM-dd"), description: "Pagamento Fattura #123 - Mario Rossi", category: "Pazienti", type: "Entrata", amount: 150.00, status: "Completato" },
  { id: "2", date: format(addMonths(new Date(), -1), "yyyy-MM-dd"), description: "Acquisto materiali dentali", category: "Materiali", subcategory: "Materiale Conservativa", type: "Uscita", amount: -320.50, status: "Completato" },
  { id: "3", date: format(new Date(), "yyyy-MM-dd"), description: "Affitto Studio", category: "Spese Fisse", subcategory: "Affitto", type: "Uscita", amount: -1200.00, status: "Pianificato", isRecurring: true, recurrenceDetails: { frequency: "Mensile", startDate: format(new Date(), "yyyy-MM-dd") } },
  { id: "4", date: format(addMonths(new Date(), -2), "yyyy-MM-dd"), description: "Stipendio Ilaria", category: "Personale", subcategory: "Stipendio Ilaria", type: "Uscita", amount: -1500.00, status: "Completato" },
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'Uscita',
      status: 'Completato',
      isRecurring: false,
    }
  });

  const watchedType = watch("type");
  const watchedCategory = watch("category");
  const watchedIsRecurring = watch("isRecurring");

  useEffect(() => {
    if (editingTransaction) {
      const date = parseISO(editingTransaction.date);
      reset({
        ...editingTransaction,
        date: isValid(date) ? date : new Date(),
        amount: Math.abs(editingTransaction.amount), // Form expects positive amount
        recurrenceFrequency: editingTransaction.recurrenceDetails?.frequency,
        recurrenceEndDate: editingTransaction.recurrenceDetails?.endDate ? parseISO(editingTransaction.recurrenceDetails.endDate) : undefined,
      });
    } else {
      reset({
        type: 'Uscita',
        date: new Date(),
        description: '',
        amount: 0,
        category: '',
        subcategory: '',
        status: 'Completato',
        isRecurring: false,
        recurrenceFrequency: undefined,
        recurrenceEndDate: undefined,
      });
    }
  }, [editingTransaction, reset]);


  const availableCategories = useMemo(() => {
    return watchedType === 'Entrata' ? allIncomeCategories : allExpenseCategories;
  }, [watchedType]);

  const availableSubcategories = useMemo(() => {
    if (!watchedCategory) return [];
    return getSubcategories(watchedType, watchedCategory);
  }, [watchedType, watchedCategory]);
  
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
      const matchesYear = getYear(transactionDate).toString() === selectedYear;
      const matchesMonth = getMonth(transactionDate).toString() === selectedMonth;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            comparison = parseISO(a.date).getTime() - parseISO(b.date).getTime();
        }


        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return filtered;
  }, [transactions, searchTerm, selectedYear, selectedMonth, sortConfig]);

  const recurringTransactionsDefinitions = useMemo(() => {
    return transactions.filter(t => t.isRecurring && !t.originalRecurringId);
  }, [transactions]);

  const onSubmit: SubmitHandler<TransactionFormData> = (data) => {
    const newTransaction: Transaction = {
      id: editingTransaction ? editingTransaction.id : crypto.randomUUID(),
      date: format(data.date, "yyyy-MM-dd"),
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      type: data.type,
      amount: data.type === 'Uscita' ? -Math.abs(data.amount) : Math.abs(data.amount),
      status: data.status,
      isRecurring: data.isRecurring,
      recurrenceDetails: data.isRecurring && data.recurrenceFrequency ? {
        frequency: data.recurrenceFrequency,
        startDate: format(data.date, "yyyy-MM-dd"),
        endDate: data.recurrenceEndDate ? format(data.recurrenceEndDate, "yyyy-MM-dd") : undefined,
      } : undefined,
    };

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? newTransaction : t));
    } else {
      setTransactions(prev => [...prev, newTransaction]);
      // Basic recurring instance generation - for demo purposes, generate for next 3 occurrences or up to end date
      if (newTransaction.isRecurring && newTransaction.recurrenceDetails) {
          const instances: Transaction[] = [];
          let currentDate = parseISO(newTransaction.recurrenceDetails.startDate);
          const endDate = newTransaction.recurrenceDetails.endDate ? parseISO(newTransaction.recurrenceDetails.endDate) : undefined;

          for (let i = 0; i < 3; i++) { // Limiting to 3 for demo
              let nextDate = currentDate;
              switch(newTransaction.recurrenceDetails.frequency) {
                  case 'Mensile': nextDate = addMonths(currentDate, i + 1); break;
                  // Add other frequencies if needed for full demo
                  default: nextDate = addMonths(currentDate, i + 1); break;
              }
              if (endDate && nextDate > endDate) break;
              
              instances.push({
                  ...newTransaction,
                  id: crypto.randomUUID(),
                  date: format(nextDate, "yyyy-MM-dd"),
                  isRecurring: false, // The instance itself is not a definition
                  recurrenceDetails: undefined,
                  originalRecurringId: newTransaction.id,
                  status: 'Pianificato' // Instances are usually planned
              });
          }
          setTransactions(prev => [...prev, ...instances]);
      }
    }
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id && t.originalRecurringId !== id));
    // Also remove instances if deleting a recurring definition
    setTransactions(prev => prev.filter(t => t.originalRecurringId !== id));
  };
  
  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedRows);
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id) && !(t.originalRecurringId && idsToDelete.includes(t.originalRecurringId))));
    // Remove instances of deleted recurring definitions
    idsToDelete.forEach(deletedId => {
      setTransactions(prev => prev.filter(t => t.originalRecurringId !== deletedId));
    });
    setSelectedRows(new Set());
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
    if (event.target.checked) {
      setSelectedRows(new Set(filteredAndSortedTransactions.map(t => t.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const openModalForNew = (type: 'Entrata' | 'Uscita') => {
    setEditingTransaction(null);
    reset({ // Reset form with type and default values
        type: type,
        date: new Date(),
        description: '',
        amount: 0,
        category: '',
        subcategory: '',
        status: 'Completato',
        isRecurring: false,
        recurrenceFrequency: undefined,
        recurrenceEndDate: undefined,
    });
    setValue("type", type); // Ensure type is set for dynamic categories
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
            <CardTitle className="text-lg font-medium">Nuova Entrata</CardTitle>
            <CalendarPlus className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Registra un nuovo incasso o entrata.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openModalForNew('Uscita')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Nuova Uscita</CardTitle>
            <CalendarMinus className="h-6 w-6 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Registra una nuova spesa o uscita.</p>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          setIsModalOpen(isOpen);
          if (!isOpen) setEditingTransaction(null);
      }}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Modifica Transazione" : "Nuova Transazione"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entrata">Entrata</SelectItem>
                      <SelectItem value="Uscita">Uscita</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP", { locale: it }) : <span>Scegli una data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Input id="description" {...register("description")} />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <Label htmlFor="amount">Importo</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
               <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => { field.onChange(value); setValue('subcategory', undefined);}} value={field.value}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>

            {availableSubcategories.length > 0 && (
              <div>
                <Label htmlFor="subcategory">Sottocategoria</Label>
                 <Controller
                  name="subcategory"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder="Seleziona sottocategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map(subcat => <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="status">Stato</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                    <Checkbox id="isRecurring" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="isRecurring">Transazione Ricorrente</Label>
            </div>

            {watchedIsRecurring && (
              <>
                <div>
                  <Label htmlFor="recurrenceFrequency">Frequenza</Label>
                  <Controller
                    name="recurrenceFrequency"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="recurrenceFrequency">
                          <SelectValue placeholder="Seleziona frequenza" />
                        </SelectTrigger>
                        <SelectContent>
                          {recurrenceFrequencies.map(freq => <SelectItem key={freq} value={freq}>{freq}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.recurrenceFrequency && <p className="text-sm text-destructive mt-1">{errors.recurrenceFrequency.message}</p>}
                </div>
                <div>
                  <Label htmlFor="recurrenceEndDate">Data Fine Ricorrenza (Opzionale)</Label>
                  <Controller
                    name="recurrenceEndDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: it }) : <span>Scegli una data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Annulla</Button>
              </DialogClose>
              <Button type="submit">{editingTransaction ? "Salva Modifiche" : "Aggiungi Transazione"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Repeat className="mr-2 h-5 w-5 text-primary" />
            Transazioni Ricorrenti
          </CardTitle>
          <CardDescription>Elenco delle tue spese e entrate ricorrenti definite.</CardDescription>
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
                  <TableHead>Prossima Scad.</TableHead>
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
                    <TableCell>{/* Placeholder for next due date logic */ t.recurrenceDetails?.startDate ? format(parseISO(t.recurrenceDetails.startDate), "dd/MM/yyyy") : '-'}</TableCell>
                    <TableCell>{t.recurrenceDetails?.endDate ? format(parseISO(t.recurrenceDetails.endDate), "dd/MM/yyyy") : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleEdit(t)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Modifica</p></TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Elimina</p></TooltipContent>
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
          <CardTitle className="font-headline">Elenco Transazioni</CardTitle>
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
                    onCheckedChange={(checked) => {
                        if (checked) {
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
                  <TableCell>{format(parseISO(transaction.date), "dd/MM/yyyy")}</TableCell>
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
                    <Badge variant={transaction.type === "Entrata" ? "default" : "destructive"} className={transaction.type === "Entrata" ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300"}>
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
                            <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleEdit(transaction)}>
                            <Edit3 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Modifica</p></TooltipContent>
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
                    <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
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
