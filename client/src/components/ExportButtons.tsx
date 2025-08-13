import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Download, Eye, TrendingUp } from "lucide-react";
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
    onlyUser: boolean;
    onlyGroupMembers: boolean;
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

    if (filters.onlyUser) params.append('onlyUser', 'true');
    if (filters.onlyGroupMembers) params.append('onlyGroupMembers', 'true');
    
    const response = await fetch(`/api/transactions?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  };

  const generateLedgerPDF = async (transactions: Transaction[]): Promise<string> => {
    const doc = new jsPDF();
    
    // Sort transactions by date for ledger format
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Professional header with gradient effect
    doc.setFillColor(37, 99, 235); // Blue gradient start
    doc.rect(0, 0, 210, 35, 'F');
    
    // Title with white text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Ledger Report', 105, 20, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Income & Expense Tracking', 105, 28, { align: 'center' });
    
    // Reset text color and add report details
    doc.setTextColor(0, 0, 0);
    let yPos = 50;
    
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, yPos);
    yPos += 6;
    
    if (filters.startDate || filters.endDate) {
      doc.text(`Period: ${filters.startDate || 'Beginning'} to ${filters.endDate || 'Current'}`, 20, yPos);
      yPos += 6;
    }
    
    doc.text(`Total Records: ${sortedTransactions.length}`, 20, yPos);
    yPos += 15;
    
    // Ledger table headers
    doc.setFillColor(30, 64, 175); // Dark blue header
    doc.rect(20, yPos, 170, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 25, yPos + 8);
    doc.text('Description', 50, yPos + 8);
    doc.text('Person', 100, yPos + 8);
    doc.text('Income', 125, yPos + 8);
    doc.text('Expense', 145, yPos + 8);
    doc.text('Balance', 170, yPos + 8);
    
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Calculate running balance and create ledger entries
    let runningBalance = 0;
    let rowCount = 0;
    
    sortedTransactions.forEach((transaction) => {
      if (yPos > 270) { // Add new page if needed
        doc.addPage();
        yPos = 20;
        
        // Repeat header on new page
        doc.setFillColor(30, 64, 175);
        doc.rect(20, yPos, 170, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Date', 25, yPos + 8);
        doc.text('Description', 50, yPos + 8);
        doc.text('Person', 100, yPos + 8);
        doc.text('Income', 125, yPos + 8);
        doc.text('Expense', 145, yPos + 8);
        doc.text('Balance', 170, yPos + 8);
        yPos += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      
      const amount = parseFloat(transaction.amount);
      
      if (transaction.type === 'income') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      
      // Alternating row background
      if (rowCount % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos - 2, 170, 10, 'F');
      }
      
      // Date
      doc.text(format(new Date(transaction.date), 'MMM dd'), 25, yPos + 5);
      
      // Description (truncated)
      doc.text(transaction.description.substring(0, 20), 50, yPos + 5);
      
      // Person (truncated)
      doc.text(transaction.paidBy.substring(0, 10), 100, yPos + 5);
      
      // Income amount (green)
      if (transaction.type === 'income') {
        doc.setTextColor(5, 150, 105);
        doc.text(amount.toLocaleString(), 125, yPos + 5);
        doc.setTextColor(0, 0, 0);
      }
      
      // Expense amount (red)
      if (transaction.type === 'expense') {
        doc.setTextColor(220, 38, 38);
        doc.text(amount.toLocaleString(), 145, yPos + 5);
        doc.setTextColor(0, 0, 0);
      }
      
      // Running balance (green if positive, red if negative)
      if (runningBalance >= 0) {
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(runningBalance.toLocaleString(), 170, yPos + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      yPos += 10;
      rowCount++;
    });
    
    // Final totals section
    yPos += 10;
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPos, 170, 25, 'F');
    doc.setDrawColor(107, 114, 128);
    doc.rect(20, yPos, 170, 25, 'S');
    
    const totalIncome = sortedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = sortedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const finalBalance = totalIncome - totalExpenses;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FINAL SUMMARY', 25, yPos + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text(`Total Income: ₨ ${totalIncome.toLocaleString()}`, 25, yPos + 16);
    
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Expenses: ₨ ${totalExpenses.toLocaleString()}`, 25, yPos + 21);
    
    doc.setTextColor(finalBalance >= 0 ? 5 : 220, finalBalance >= 0 ? 150 : 38, finalBalance >= 0 ? 105 : 38);
    doc.setFontSize(12);
    doc.text(`Net Balance: ₨ ${finalBalance.toLocaleString()}`, 120, yPos + 18);
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`ExpenseShare Ledger | Page ${i} of ${pageCount} | ${format(new Date(), 'PPp')}`, 105, 285, { align: 'center' });
    }
    
    const blobUrl = doc.output('bloburl');
    return typeof blobUrl === 'string' ? blobUrl : URL.createObjectURL(new Blob([doc.output('blob')], { type: 'application/pdf' }));
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
    a.download = `ledger-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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
        const pdfUrl = await generateLedgerPDF(transactions);
        setPdfUrl(pdfUrl);
        
        toast({
          title: "Ledger PDF Ready",
          description: "Your financial ledger is ready to download or preview",
        });
      } else {
        await generateExcel(transactions);
        
        toast({
          title: "Excel Downloaded",
          description: "Your Excel ledger has been downloaded successfully",
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
      a.download = `ledger-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
    }
  };

  const previewPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-2xl shadow-2xl mb-6">
      <div className="flex flex-col lg:flex-row items-center justify-between">
        {/* Left side - Title and description */}
        <div className="text-white mb-4 lg:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-full">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">Financial Reports</h2>
          </div>
          <p className="text-indigo-100 text-sm">
            Export your financial data in professional ledger format
          </p>
        </div>

        {/* Right side - Export buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            className="bg-white/90 hover:bg-white text-indigo-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => handleExport('pdf')}
            disabled={isExporting === 'pdf'}
            data-testid="button-export-pdf"
          >
            <FileText className="mr-2 h-5 w-5" />
            {isExporting === 'pdf' ? 'Generating PDF...' : 'Ledger PDF'}
          </Button>

          {pdfUrl && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={downloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={previewPDF}
                data-testid="button-preview-pdf"
              >
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </Button>
            </div>
          )}
          
          <Button
            variant="secondary"
            className="bg-white/90 hover:bg-white text-green-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => handleExport('excel')}
            disabled={isExporting === 'excel'}
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            {isExporting === 'excel' ? 'Generating Excel...' : 'Ledger Excel'}
          </Button>
        </div>
      </div>
    </div>
  );
}