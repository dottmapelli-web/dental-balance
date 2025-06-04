
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { TransactionStatus } from "@/config/transaction-categories";

interface BulkStatusUpdateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newStatus: TransactionStatus) => void;
  transactionStatuses: readonly TransactionStatus[];
}

export default function BulkStatusUpdateDialog({ // Changed from BulkUpdateStatusDialog
  isOpen,
  onOpenChange,
  onConfirm,
  transactionStatuses,
}: BulkStatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | undefined>(undefined);

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Stato Transazioni Selezionate</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="bulk-status-select">Nuovo Stato</Label>
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as TransactionStatus)}
          >
            <SelectTrigger id="bulk-status-select">
              <SelectValue placeholder="Seleziona un nuovo stato" />
            </SelectTrigger>
            <SelectContent>
              {transactionStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Annulla</Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm} disabled={!selectedStatus}>
            Conferma Modifica Stato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
