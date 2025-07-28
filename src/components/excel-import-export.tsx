'use client';

import { format } from 'date-fns';
import { Download, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logger from '@/lib/logger-client';

interface ExcelImportExportProps {
  type: 'metrics' | 'sessions';
  agentIds?: string[];
  teamLeaderId?: string;
}

export function ExcelImportExport({ type, agentIds, teamLeaderId }: ExcelImportExportProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Export options
  const [exportOptions, setExportOptions] = useState({
    includeQuickNotes: false,
    includeActionItems: false,
    includeActionPlans: false,
    dateRange: 'all' as 'all' | 'month' | 'quarter' | 'year' | 'custom',
    startDate: '',
    endDate: '',
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams();
      
      if (type === 'metrics') {
        if (exportOptions.includeQuickNotes) {params.append('includeQuickNotes', 'true');}
        if (exportOptions.includeActionItems) {params.append('includeActionItems', 'true');}
        if (exportOptions.includeActionPlans) {params.append('includeActionPlans', 'true');}
        if (agentIds?.length) {params.append('agentIds', agentIds.join(','));}
      } else if (type === 'sessions' && teamLeaderId) {
        params.append('teamLeaderId', teamLeaderId);
      }

      // Handle date range
      let startDate = '';
      let endDate = format(new Date(), 'yyyy-MM-dd');
      
      switch (exportOptions.dateRange) {
        case 'month':
          startDate = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd');
          break;
        case 'quarter':
          startDate = format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd');
          break;
        case 'year':
          startDate = format(new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 'yyyy-MM-dd');
          break;
        case 'custom':
          startDate = exportOptions.startDate;
          endDate = exportOptions.endDate;
          break;
      }

      if (startDate) {params.append('startDate', startDate);}
      if (endDate) {params.append('endDate', endDate);}

      const response = await fetch(`/api/export/${type}?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed successfully');
      setShowExportDialog(false);
    } catch (error) {
      logger.error('Export error:', error as Error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      setImporting(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/import/${type}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setShowImportDialog(false);
        setSelectedFile(null);
        // Refresh the page to show imported data
        window.location.reload();
      } else {
        if (result.errors?.length) {
          toast.error(`Import completed with ${result.errors.length} errors`);
          logger.error('Import errors:', result.errors);
        } else {
          toast.error(result.error || 'Import failed');
        }
      }
    } catch (error) {
      logger.error('Import error:', error as Error);
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const canImport = type === 'metrics'; // Only metrics can be imported for now

  return (
    <div className="flex gap-2">
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export {type === 'metrics' ? 'Metrics' : 'Sessions'} to Excel</DialogTitle>
            <DialogDescription>
              Configure your export options and download the data as an Excel file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {type === 'metrics' && (
              <div className="space-y-2">
                <Label>Include Additional Data</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quickNotes"
                      checked={exportOptions.includeQuickNotes}
                      onCheckedChange={(checked: boolean) =>
                        setExportOptions({ ...exportOptions, includeQuickNotes: checked })
                      }
                    />
                    <Label htmlFor="quickNotes" className="text-sm font-normal">
                      Include Quick Notes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="actionItems"
                      checked={exportOptions.includeActionItems}
                      onCheckedChange={(checked: boolean) =>
                        setExportOptions({ ...exportOptions, includeActionItems: checked })
                      }
                    />
                    <Label htmlFor="actionItems" className="text-sm font-normal">
                      Include Action Items
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="actionPlans"
                      checked={exportOptions.includeActionPlans}
                      onCheckedChange={(checked: boolean) =>
                        setExportOptions({ ...exportOptions, includeActionPlans: checked })
                      }
                    />
                    <Label htmlFor="actionPlans" className="text-sm font-normal">
                      Include Action Plans
                    </Label>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select
                value={exportOptions.dateRange}
                onValueChange={(value: string) =>
                  setExportOptions({ ...exportOptions, dateRange: value as 'all' | 'month' | 'quarter' | 'year' | 'custom' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportOptions.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={exportOptions.startDate}
                    onChange={(e) => 
                      setExportOptions({ ...exportOptions, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={exportOptions.endDate}
                    onChange={(e) => 
                      setExportOptions({ ...exportOptions, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {canImport && (
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import from Excel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Metrics from Excel</DialogTitle>
              <DialogDescription>
                Upload an Excel file to import agent metrics. The file should contain
                columns for Agent Email/Employee ID, Month, Year, and metric values.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select Excel File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-xs">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowImportDialog(false);
                setSelectedFile(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing || !selectedFile}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}