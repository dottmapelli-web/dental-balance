
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Filter, Edit3, Trash2 } from "lucide-react";

const transactions = [
  { id: "1", date: "2024-07-15", description: "Pagamento Fattura #123 - Mario Rossi", category: "Prestazioni", type: "Entrata", amount: 150.00, status: "Completato" },
  { id: "2", date: "2024-07-14", description: "Acquisto materiali dentali", category: "Materiali", type: "Uscita", amount: -320.50, status: "Completato" },
  { id: "3", date: "2024-07-14", description: "Stipendio Dr. Verdi", category: "Stipendi", type: "Uscita", amount: -2500.00, status: "Completato" },
  { id: "4", date: "2024-07-13", description: "Pagamento Fattura #122 - Laura Bianchi", category: "Prestazioni", type: "Entrata", amount: 80.00, status: "Completato" },
  { id: "5", date: "2024-07-12", description: "Bolletta Elettrica", category: "Utenze", type: "Uscita", amount: -120.00, status: "In Attesa" },
  { id: "6", date: "2024-07-11", description: "Consulenza Fiscale", category: "Consulenze", type: "Uscita", amount: -500.00, status: "Completato" },
];

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transazioni"
        description="Visualizza e gestisci tutte le entrate e uscite."
        actions={
          <>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtra
            </Button>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuova Transazione
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Elenco Transazioni</CardTitle>
          <CardDescription>Dettaglio delle recenti attività finanziarie.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === "Entrata" ? "default" : "destructive"} className={transaction.type === "Entrata" ? "bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:bg-green-700/30 dark:text-green-300 dark:border-green-700/40" : "bg-red-500/20 text-red-700 border-red-500/30 hover:bg-red-500/30 dark:bg-red-700/30 dark:text-red-300 dark:border-red-700/40"}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    €{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                     <Badge variant={transaction.status === "Completato" ? "outline" : "default"} className={transaction.status === "Completato" ? "border-green-500 text-green-600 dark:border-green-600 dark:text-green-400" : "bg-yellow-500/80 text-yellow-900 border-yellow-600 dark:bg-yellow-600/80 dark:text-yellow-100 dark:border-yellow-700"}>
                        {transaction.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-1">
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Modifica</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Elimina</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

    