
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, isValid } from "date-fns";
import { it } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import type { Transaction } from '@/app/transactions/page'; // Assuming Transaction type is exported
import { allIncomeCategories, allExpenseCategories, getSubcategories, recurrenceFrequencies, transactionStatuses, type RecurrenceFrequency, type TransactionStatus } from "@/config/transaction-categories";
import { useToast } from '@/hooks/use-toast';

export const transactionFormSchema = z.object({
  type: z.enum(['Entrata', 'Uscita']),
  date: z.date({ required_error: "La data è obbligatoria." }),
  description: z.string().min(3, { message: "La descrizione deve avere almeno 3 caratteri." }),
  amount: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  category: z.string().min(1, { message: "La categoria è obbligatoria." }),
  subcategory: z.string().optional(),
  status: z.enum(transactionStatuses as [string, ...string[]]), // Zod needs a non-empty array for enums
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(recurrenceFrequencies as [string, ...string[]]).optional(),
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

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactionTypeInitial: 'Entrata' | 'Uscita';
  editingTransaction?: Transaction | null;
  onSubmitSuccess: (data: TransactionFormData, id?: string) => void; // id is for editing
}

export default function TransactionModal({
  isOpen,
  onOpenChange,
  transactionTypeInitial,
  editingTransaction,
  onSubmitSuccess,
}: TransactionModalProps) {
  const { toast } = useToast();
  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transactionTypeInitial,
      status: 'Completato',
      isRecurring: false,
      date: new Date(),
    }
  });

  const watchedType = watch("type");
  const watchedCategory = watch("category");
  const watchedIsRecurring = watch("isRecurring");

  useEffect(() => {
    if (isOpen) { // Reset form when modal opens or editingTransaction/type changes
      if (editingTransaction) {
        const date = parseISO(editingTransaction.date);
        reset({
          ...editingTransaction,
          date: isValid(date) ? date : new Date(),
          amount: Math.abs(editingTransaction.amount),
          recurrenceFrequency: editingTransaction.recurrenceDetails?.frequency as RecurrenceFrequency | undefined,
          recurrenceEndDate: editingTransaction.recurrenceDetails?.endDate ? parseISO(editingTransaction.recurrenceDetails.endDate) : undefined,
        });
      } else {
        reset({
          type: transactionTypeInitial,
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
    }
  }, [isOpen, editingTransaction, transactionTypeInitial, reset]);


  const availableCategories = useMemo(() => {
    return watchedType === 'Entrata' ? allIncomeCategories : allExpenseCategories;
  }, [watchedType]);

  const availableSubcategories = useMemo(() => {
    if (!watchedCategory) return [];
    return getSubcategories(watchedType, watchedCategory);
  }, [watchedType, watchedCategory]);

  const processSubmit: SubmitHandler<TransactionFormData> = (data) => {
    onSubmitSuccess(data, editingTransaction?.id);
    onOpenChange(false); // Close modal on success
    toast({
      title: editingTransaction ? "Transazione Modificata" : "Transazione Aggiunta",
      description: `${data.description} - €${data.amount.toFixed(2)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        // Optional: reset form when closing via X or overlay click if not submitted
        // reset(); // This might be too aggressive, consider user experience
      }
    }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTransaction ? "Modifica Transazione" : `Nuova ${transactionTypeInitial}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue('category', ''); // Reset category when type changes
                    setValue('subcategory', undefined);
                  }} 
                  value={field.value}
                >
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
                <Select onValueChange={(value) => { field.onChange(value); setValue('subcategory', undefined); }} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value || ''}>
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
                    {(transactionStatuses as readonly string[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                        {(recurrenceFrequencies as readonly string[]).map(freq => <SelectItem key={freq} value={freq}>{freq}</SelectItem>)}
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            </DialogClose>
            <Button type="submit">{editingTransaction ? "Salva Modifiche" : "Aggiungi Transazione"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

