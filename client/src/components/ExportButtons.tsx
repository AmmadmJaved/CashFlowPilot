import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Download, Eye } from "lucide-react";
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ExportButtonsProps {
  filters: {
    search: string;
    dateRange: string;
    category: string;
    type: string;
    paidBy: string;
    startDate: string;
    endDate: string;
  };
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  description: string;
  category: string;
  date: string;
  paidBy: string;
  isShared: boolean;
  groupId: string | null;
}

export default function ExportButtons({ filters }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFilteredTransactions = async (): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.paidBy && filters.paidBy !== 'all') params.append('paidBy', filters.paidBy);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await fetch(`/api/transactions?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  };

  const generatePDF = async (transactions: Transaction[]): Promise<string> => {
    const doc = new jsPDF();
    
    // Add company header with creative styling
    doc.setFillColor(59, 130, 246); // Blue header
    doc.rect(0, 0, 210, 30, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ExpenseShare - Financial Report', 105, 20, { align: 'center' });
    
    // Report details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    let yPos = 45;
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, yPos);
    yPos += 8;
    doc.text(`Total Transactions: ${transactions.length}`, 20, yPos);
    yPos += 8;
    
    // Filter summary
    if (filters.type !== 'all') {
      doc.text(`Filter - Type: ${filters.type.toUpperCase()}`, 20, yPos);
      yPos += 6;
    }
    if (filters.category !== 'all') {
      doc.text(`Filter - Category: ${filters.category.toUpperCase()}`, 20, yPos);
      yPos += 6;
    }
    if (filters.paidBy !== 'all') {
      doc.text(`Filter - Person: ${filters.paidBy}`, 20, yPos);
      yPos += 6;
    }
    
    yPos += 10;
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const netBalance = totalIncome - totalExpenses;
    
    // Summary box
    doc.setFillColor(248, 250, 252); // Light gray background
    doc.rect(20, yPos, 170, 30, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPos, 170, 30, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 25, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Income: PKR ${totalIncome.toLocaleString()}`, 25, yPos + 18);
    doc.text(`Total Expenses: PKR ${totalExpenses.toLocaleString()}`, 25, yPos + 24);
    
    doc.setFont('helvetica', 'bold');
    if (netBalance >= 0) {
      doc.setTextColor(34, 197, 94); // Green
    } else {
      doc.setTextColor(239, 68, 68); // Red
    }
    doc.text(`Net Balance: PKR ${netBalance.toLocaleString()}`, 105, yPos + 18);
    
    yPos += 45;
    doc.setTextColor(0, 0, 0);
    
    // Transaction details header
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Details', 20, yPos);
    yPos += 10;
    
    // Table headers
    doc.setFillColor(59, 130, 246);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Date', 22, yPos + 6);
    doc.text('Type', 45, yPos + 6);
    doc.text('Description', 65, yPos + 6);
    doc.text('Category', 115, yPos + 6);
    doc.text('Paid By', 145, yPos + 6);
    doc.text('Amount', 170, yPos + 6);
    
    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // Transaction rows
    transactions.slice(0, 25).forEach((transaction, index) => { // Limit to 25 transactions per page
      if (yPos > 270) { // Add new page if needed
        doc.addPage();
        yPos = 20;
      }
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(20, yPos - 2, 170, 8, 'F');
      }
      
      const date = format(new Date(transaction.date), 'MMM dd');
      const amount = parseFloat(transaction.amount);
      
      doc.text(date, 22, yPos + 4);
      doc.text(transaction.type === 'income' ? '💰' : '💳', 45, yPos + 4);
      doc.text(transaction.description.substring(0, 25), 65, yPos + 4);
      doc.text(transaction.category, 115, yPos + 4);
      doc.text(transaction.paidBy.substring(0, 12), 145, yPos + 4);
      
      // Amount with color coding
      if (transaction.type === 'income') {
        doc.setTextColor(34, 197, 94); // Green
      } else {
        doc.setTextColor(239, 68, 68); // Red
      }
      doc.text(`${transaction.type === 'income' ? '+' : '-'}${amount.toLocaleString()}`, 170, yPos + 4);
      doc.setTextColor(0, 0, 0);
      
      yPos += 10;
    });
    
    if (transactions.length > 25) {
      yPos += 10;
      doc.setFont('helvetica', 'italic');
      doc.text(`... and ${transactions.length - 25} more transactions`, 20, yPos);
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated by ExpenseShare | Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    return doc.output('bloburl');
  };

  const generateExcel = async (transactions: Transaction[]) => {
    const response = await fetch('/api/export/excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        transactions,
        filters,
        summary: {
          totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
          totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Excel export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(format);
    
    try {
      const transactions = await fetchFilteredTransactions();
      
      if (transactions.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions found matching your filters",
          variant: "destructive",
        });
        return;
      }

      if (format === 'pdf') {
        const pdfUrl = await generatePDF(transactions);
        setPdfUrl(pdfUrl);
        
        toast({
          title: "PDF Ready",
          description: "Your financial report is ready to download or preview",
        });
      } else {
        await generateExcel(transactions);
        
        toast({
          title: "Excel Downloaded",
          description: "Your Excel report has been downloaded successfully",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  const downloadPDF = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
    }
  };

  const previewPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 hover:border-blue-300 transition-all duration-200"
        onClick={() => handleExport('pdf')}
        disabled={isExporting === 'pdf'}
        data-testid="button-export-pdf"
      >
        <FileText className="mr-2 h-4 w-4 text-blue-600" />
        {isExporting === 'pdf' ? 'Generating PDF...' : 'Export PDF Report'}
      </Button>

      {pdfUrl && (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300"
            onClick={downloadPDF}
            data-testid="button-download-pdf"
          >
            <Download className="mr-2 h-4 w-4 text-green-600" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300"
            onClick={previewPDF}
            data-testid="button-preview-pdf"
          >
            <Eye className="mr-2 h-4 w-4 text-amber-600" />
            Preview
          </Button>
        </div>
      )}
      
      <Button
        variant="outline"
        className="w-full bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200 hover:border-green-300 transition-all duration-200"
        onClick={() => handleExport('excel')}
        disabled={isExporting === 'excel'}
        data-testid="button-export-excel"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
        {isExporting === 'excel' ? 'Generating Excel...' : 'Export Excel'}
      </Button>
    </div>
  );
}