import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet } from "lucide-react";

interface ExportButtonsProps {
  filters: {
    search: string;
    dateRange: string;
    category: string;
    startDate: string;
    endDate: string;
  };
}

export default function ExportButtons({ filters }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(format);
    
    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `expense-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${format.toUpperCase()} exported successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: `Failed to export ${format.toUpperCase()}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleExport('pdf')}
        disabled={isExporting === 'pdf'}
        data-testid="button-export-pdf"
      >
        <FileText className="mr-2 h-4 w-4 text-red-500" />
        {isExporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
      </Button>
      
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleExport('excel')}
        disabled={isExporting === 'excel'}
        data-testid="button-export-excel"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
        {isExporting === 'excel' ? 'Exporting...' : 'Export Excel'}
      </Button>
    </div>
  );
}
