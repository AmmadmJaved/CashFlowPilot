import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Download, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useAuth } from "react-oidc-context";
import { useParams } from "wouter";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

interface ExportButtonsProps {
  filters: {
    search: string;
    dateRange: string;
    category: string;
    type: string;
    paidBy: string;
    startDate: string;
    endDate: string;
    groupId: string | null;
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
  showPreview: boolean;
}

type ReportBalances = {
  openingBalance: number;
  closingBalance: number;
};

export default function ExportButtons({ filters }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const token = auth.user?.id_token;

  const { id: accountId } = useParams<{ id: string }>();
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to convert file data"));
          return;
        }
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });

  const downloadBlobOnWeb = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const saveBlobToAndroidDownloads = async (blob: Blob, fileName: string) => {
    const data = await blobToBase64(blob);

    try {
      await Filesystem.requestPermissions();
    } catch {
      // Permission API can be a no-op on newer Android versions.
    }

    try {
      const saved = await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
      return { uri: saved.uri, location: "Downloads" };
    } catch {
      const saved = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Documents,
        recursive: true,
      });
      return { uri: saved.uri, location: "Documents" };
    }
  };

  const fetchFilteredTransactions = async (): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.paidBy && filters.paidBy !== 'all') params.append('paidBy', filters.paidBy);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (accountId) params.append('groupId', accountId);


    if(accountId) {
      const res = await fetch(`/api/accounts/${accountId}/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch group account transactions");
      return res.json();
    
    }else{

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    }
  };

  const fetchReportBalances = async (): Promise<ReportBalances> => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
    if (filters.endDate) params.append('endDate', new Date(filters.endDate).toISOString());
    if (accountId) params.append('groupId', accountId);

    const response = await fetch(`/api/stats/monthly?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { openingBalance: 0, closingBalance: 0 };
    }

    const data = await response.json();
    return {
      openingBalance: Number.parseFloat(data?.openingBalance || '0'),
      closingBalance: Number.parseFloat(data?.closingBalance || '0'),
    };
  };

  const generateLedgerPDF = async (transactions: Transaction[], openingBalance = 0): Promise<Blob> => {
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
    doc.text('Income', 115, yPos + 8);
    doc.text('Expense', 135, yPos + 8);
    doc.text('Balance', 170, yPos + 8);
    
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Calculate running balance and create ledger entries
    let runningBalance = openingBalance;
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
        doc.text('Income', 115, yPos + 8);
        doc.text('Expense', 135, yPos + 8);
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
      
      // Calculate description lines first
      const descriptionLines = doc.splitTextToSize(transaction.description, 60);
      const descriptionHeight = descriptionLines.length * 4;
      const rowHeight = Math.max(descriptionHeight + 2, 10);
      
      // Alternating row background (expanded for wrapped text)
      if (rowCount % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos - 2, 170, rowHeight, 'F');
      }
      
      // Date
      doc.text(format(new Date(transaction.date), 'MMM dd, yyyy'), 25, yPos + 5);
      
      // Description (full text with word wrapping)
      doc.text(descriptionLines, 50, yPos + 5);
      
      // Income amount (green) - positioned at baseline
      if (transaction.type === 'income') {
        doc.setTextColor(5, 150, 105);
        doc.text(amount.toLocaleString(), 115, yPos + 5);
        doc.setTextColor(0, 0, 0);
      }
      
      // Expense amount (red) - positioned at baseline
      if (transaction.type === 'expense') {
        doc.setTextColor(220, 38, 38);
        doc.text(amount.toLocaleString(), 135, yPos + 5);
        doc.setTextColor(0, 0, 0);
      }
      
      // Running balance (green if positive, red if negative) - positioned at baseline
      if (runningBalance >= 0) {
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(runningBalance.toLocaleString(), 165, yPos + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      yPos += rowHeight + 2;
      rowCount++;
    });


     // ToTals row

     const totalIncome = sortedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = sortedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const finalBalance = openingBalance + totalIncome - totalExpenses;
    // ---------------------------------------
    yPos += 5; // small spacing before totals row

    // Background for totals row
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPos - 2, 170, 10, 'F');

    // Bold text for "Totals"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL", 50, yPos + 5); // label under Description column

    // Total Income (green)
    doc.setTextColor(5, 150, 105);
    doc.text(totalIncome.toLocaleString(), 115, yPos + 5);

    // Total Expenses (red)
    doc.setTextColor(220, 38, 38);
    doc.text(totalExpenses.toLocaleString(), 135, yPos + 5);

    // Final Balance (green if +, red if -)
    doc.setTextColor(finalBalance >= 0 ? 5 : 220, finalBalance >= 0 ? 150 : 38, finalBalance >= 0 ? 105 : 38);
    doc.text(finalBalance.toLocaleString(), 165, yPos + 5);

    // Reset font
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Final totals section
    yPos += 15;
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPos, 170, 35, 'F');
    doc.setDrawColor(107, 114, 128);
    doc.rect(20, yPos, 170, 35, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FINAL SUMMARY', 25, yPos + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Opening Balance: ₨ ${openingBalance.toLocaleString()}`, 25, yPos + 14);

    doc.setTextColor(5, 150, 105);
    doc.text(`Total Income: ₨ ${totalIncome.toLocaleString()}`, 25, yPos + 20);
    
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Expenses: ₨ ${totalExpenses.toLocaleString()}`, 25, yPos + 25);

    const nextLine = yPos + 30; // adjust spacing here
    doc.setTextColor(finalBalance >= 0 ? 5 : 220, finalBalance >= 0 ? 150 : 38, finalBalance >= 0 ? 105 : 38);
    doc.setFontSize(12);
    doc.text(`Net Balance: ₨ ${finalBalance.toLocaleString()}`, 25, nextLine);
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);

      const pageHeight = doc.internal.pageSize.getHeight(); // dynamic height
      const footerY = pageHeight - 10; // 10 units from bottom

      doc.text(
        `CashPilot Ledger | Page ${i} of ${pageCount} | ${format(new Date(), 'PPp')}`,
        doc.internal.pageSize.getWidth() / 2,
        footerY,
        { align: 'center' }
      );
    }
    
    return doc.output('blob');
  };

  const generateExcel = async (transactions: Transaction[], openingBalance = 0): Promise<Blob> => {
    const response = await fetch('/api/export/excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        transactions,
        filters,
        openingBalance,
        summary: {
          totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
          totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Excel export failed: ${response.statusText}`);
    }

    return response.blob();
  };

  const handleExport = async (exportType: 'pdf' | 'excel') => {
    setIsExporting(exportType);
    
    try {
      const transactions = await fetchFilteredTransactions();
      const { openingBalance } = await fetchReportBalances();
      
      if (transactions.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions found matching your filters",
          variant: "destructive",
        });
        return;
      }

      if (exportType === 'pdf') {
        const pdfBlob = await generateLedgerPDF(transactions, openingBalance);
        const fileName = `ledger-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

        if (isNativeAndroid) {
          const saved = await saveBlobToAndroidDownloads(pdfBlob, fileName);
          setPdfUrl(null);
          toast({
            title: "PDF Saved",
            description: `${fileName} saved in ${saved.location}`,
          });
        } else {
          const url = window.URL.createObjectURL(pdfBlob);
          setPdfUrl(url);
          downloadBlobOnWeb(pdfBlob, fileName);
          toast({
            title: "Ledger PDF Ready",
            description: "Your financial ledger has been downloaded",
          });
        }
      } else {
        const excelBlob = await generateExcel(transactions, openingBalance);
        const fileName = `ledger-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

        if (isNativeAndroid) {
          const saved = await saveBlobToAndroidDownloads(excelBlob, fileName);
          toast({
            title: "Excel Saved",
            description: `${fileName} saved in ${saved.location}`,
          });
        } else {
          downloadBlobOnWeb(excelBlob, fileName);
          toast({
            title: "Excel Downloaded",
            description: "Your Excel ledger has been downloaded successfully",
          });
        }
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
   <div className="mb-3 sm:mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Financial Reports</h2>
        </div>

        {/* Mobile - compact export dropdown */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-cyan-400/55 bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:text-slate-950 px-4 font-semibold shadow-sm"
                data-testid="button-export-menu"
              >
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-48 rounded-xl border border-cyan-500/30 bg-card p-1.5 text-card-foreground shadow-lg">
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                disabled={isExporting === 'pdf'}
                className="h-10 rounded-lg px-3 text-sm font-medium focus:bg-cyan-500/15"
                data-testid="button-export-pdf-mobile"
              >
                <FileText className="mr-2 h-4 w-4 text-cyan-600" />
                {isExporting === 'pdf' ? 'Generating PDF...' : 'Export PDF'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                disabled={isExporting === 'excel'}
                className="h-10 rounded-lg px-3 text-sm font-medium focus:bg-cyan-500/15"
                data-testid="button-export-excel-mobile"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-cyan-600" />
                {isExporting === 'excel' ? 'Generating Excel...' : 'Export Excel'}
              </DropdownMenuItem>
              {pdfUrl && (
                <>
                  <DropdownMenuItem onClick={downloadPDF} className="h-10 rounded-lg px-3 text-sm font-medium focus:bg-cyan-500/15" data-testid="button-download-pdf-mobile">
                    <Download className="mr-2 h-4 w-4 text-cyan-600" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={previewPDF} className="h-10 rounded-lg px-3 text-sm font-medium focus:bg-cyan-500/15" data-testid="button-preview-pdf-mobile">
                    <Eye className="mr-2 h-4 w-4 text-cyan-600" />
                    Preview PDF
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop - full export buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-full border-cyan-400/40 bg-background/60 px-4 font-medium hover:border-cyan-400 hover:bg-cyan-500/10"
            onClick={() => handleExport('pdf')}
            disabled={isExporting === 'pdf'}
            data-testid="button-export-pdf"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting === 'pdf' ? 'Generating...' : 'PDF'}
          </Button>

          {pdfUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-full border-cyan-400/40 bg-background/60 px-3 hover:border-cyan-400 hover:bg-cyan-500/10"
                onClick={downloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-full border-cyan-400/40 bg-background/60 px-3 hover:border-cyan-400 hover:bg-cyan-500/10"
                onClick={previewPDF}
                data-testid="button-preview-pdf"
              >
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-full border-cyan-400/40 bg-background/60 px-4 font-medium hover:border-cyan-400 hover:bg-cyan-500/10"
            onClick={() => handleExport('excel')}
            disabled={isExporting === 'excel'}
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting === 'excel' ? 'Generating...' : 'Excel'}
          </Button>
        </div>
      </div>
    </div>
  );
}