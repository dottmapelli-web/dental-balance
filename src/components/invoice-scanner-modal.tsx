"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, Trash2, Plus } from "lucide-react";
import { useCategories } from '@/contexts/category-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";

interface ExtractedItem {
  id: string; // temp id
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
}

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsAccepted: (items: any[]) => void;
}

export default function InvoiceScannerModal({
  isOpen,
  onOpenChange,
  onItemsAccepted,
}: InvoiceScannerModalProps) {
  const { toast } = useToast();
  const { expenseCategories, incomeCategories } = useCategories();
  
  const [isUploading, setIsUploading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableExpenseCategories = Object.keys(expenseCategories);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({ title: "Formato non supportato", description: "Per favore carica un'immagine o un file PDF.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await toBase64(file);
      const response = await fetch('/api/extract-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileDataUri: base64 })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Errore durante l'estrazione");
      }

      const itemsWithIds = result.data.map((item: any) => ({
        ...item,
        id: crypto.randomUUID()
      }));

      setExtractedItems(itemsWithIds);
      toast({ title: "Estrazione Completata", description: `Trovate ${itemsWithIds.length} voci.` });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleItemChange = (id: string, field: keyof ExtractedItem, value: any) => {
    setExtractedItems(prev => prev?.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'category') {
            updated.subcategory = undefined;
        }
        return updated;
      }
      return item;
    }) || null);
  };

  const handleRemoveItem = (id: string) => {
    setExtractedItems(prev => prev?.filter(item => item.id !== id) || null);
  };

  const handleAddItem = () => {
    setExtractedItems(prev => [
      ...(prev || []),
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        category: availableExpenseCategories[0] || '',
      }
    ]);
  };

  const handleSave = () => {
    if (!extractedItems || extractedItems.length === 0) return;
    
    // Validate
    for (const item of extractedItems) {
      if (!item.date || !item.category || item.amount <= 0 || !item.description) {
        toast({ title: "Dati incompleti", description: "Verifica che tutte le voci abbiano data, categoria, importo e descrizione validi.", variant: "destructive" });
        return;
      }
    }

    onItemsAccepted(extractedItems.map(item => ({
      type: 'Uscita',
      date: new Date(item.date),
      description: item.description,
      amount: item.amount,
      category: item.category,
      subcategory: item.subcategory,
      status: 'Completato',
      isRecurring: false,
    })));
    
    resetAndClose();
  };

  const resetAndClose = () => {
    setExtractedItems(null);
    setIsUploading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); else onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none glass-card rounded-[2.5rem] animate-scale-in">
        <div className="p-8 pb-4">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Importa con AI
            </DialogTitle>
            <DialogDescription className="text-base">
              L'Intelligenza Artificiale analizzerà il tuo documento per estrarre spese e categorie automaticamente.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4">
          {!extractedItems ? (
            <div 
              className={`flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-[2rem] transition-all duration-500 ${
                isUploading 
                ? "bg-primary/5 border-primary/20 scale-95" 
                : "bg-muted/10 border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20"
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <div className="relative mb-6">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    <div className="absolute inset-0 h-16 w-16 bg-primary/20 blur-xl rounded-full"></div>
                  </div>
                  <p className="text-lg font-medium text-foreground">Analisi in corso...</p>
                  <p className="text-sm text-muted-foreground mt-2">Stiamo estraendo i dati dal documento</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-primary/5 p-6 rounded-full mb-6">
                    <UploadCloud className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Carica la tua fattura</h3>
                  <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
                    Sposta qui il file o clicca per selezionarlo dal tuo computer.
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="btn-modern btn-primary-modern h-12 px-8 text-lg"
                  >
                    Seleziona File
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={handleFileUpload}
                  />
                  <div className="flex gap-4 mt-10">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-1 bg-muted rounded">PDF</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-1 bg-muted rounded">JPG</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-1 bg-muted rounded">PNG</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-1 bg-muted rounded">WEBP</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-slide-up">
              <div className="flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">
                      {extractedItems.length}
                    </div>
                    <h3 className="text-lg font-bold">Voci individuate</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleAddItem} className="rounded-full hover:bg-primary/5 text-primary font-semibold">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Manualmente
                  </Button>
              </div>

              <div className="grid gap-4 pb-8">
                {extractedItems.map((item, index) => {
                  const subcategories = item.category ? expenseCategories[item.category]?.subcategories.map(s => s.name) || [] : [];
                  return (
                    <Card key={item.id} className="relative border-none glass-card rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-300">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-4 top-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <CardContent className="pt-8 px-6 pb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Data</Label>
                          <Input 
                            type="date" 
                            value={item.date} 
                            className="bg-muted/30 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                            onChange={(e) => handleItemChange(item.id, 'date', e.target.value)} 
                          />
                        </div>
                        <div className="md:col-span-6">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Descrizione</Label>
                          <Input 
                            value={item.description} 
                            className="bg-muted/30 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                            placeholder="Descrizione della spesa..."
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} 
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Importo (€)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={item.amount} 
                              className="bg-muted/30 border-none rounded-xl pl-8 focus-visible:ring-1 focus-visible:ring-primary font-mono"
                              onChange={(e) => handleItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)} 
                            />
                          </div>
                        </div>
                        
                        <div className="md:col-span-6">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Categoria</Label>
                          <Select value={item.category} onValueChange={(v) => handleItemChange(item.id, 'category', v)}>
                            <SelectTrigger className="bg-muted/30 border-none rounded-xl focus:ring-1 focus:ring-primary">
                              <SelectValue placeholder="Seleziona categoria" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {availableExpenseCategories.map(c => <SelectItem key={c} value={c} className="rounded-lg">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-6">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Sottocategoria</Label>
                          <Select 
                            value={item.subcategory || ''} 
                            disabled={subcategories.length === 0}
                            onValueChange={(v) => handleItemChange(item.id, 'subcategory', v)}
                          >
                            <SelectTrigger className="bg-muted/30 border-none rounded-xl focus:ring-1 focus:ring-primary">
                              <SelectValue placeholder={subcategories.length > 0 ? "Seleziona sottocategoria" : "Nessuna sottocategoria"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {subcategories.map(s => <SelectItem key={s} value={s} className="rounded-lg">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {extractedItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-muted/20 p-6 rounded-full mb-4">
                      <Trash2 className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground max-w-xs">Nessuna voce trovata. Prova ad aggiungere una voce manualmente o carica un nuovo file.</p>
                  </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 pt-4 border-t bg-muted/5 flex items-center justify-between">
            <Button variant="ghost" onClick={resetAndClose} className="rounded-full px-8">
              Annulla
            </Button>
            {extractedItems && extractedItems.length > 0 && (
                <Button 
                  onClick={handleSave} 
                  className="btn-modern btn-primary-modern px-10 h-12 shadow-xl shadow-primary/20"
                >
                  Conferma e Salva {extractedItems.length} {extractedItems.length === 1 ? 'Voce' : 'Voci'}
                </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );

}
