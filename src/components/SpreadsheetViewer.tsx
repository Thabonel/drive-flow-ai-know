import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, Calculator, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpreadsheetData {
  sheets: Array<{
    name: string;
    data: Array<Record<string, any>>;
    charts?: Array<any>;
    formulas?: Array<{
      cell: string;
      formula: string;
      value: any;
    }>;
  }>;
  metadata: {
    totalSheets: number;
    hasFormulas: boolean;
    hasCharts: boolean;
    dataTypes: string[];
  };
}

interface SpreadsheetViewerProps {
  data: SpreadsheetData;
  title: string;
  onGenerateCharts?: (data: SpreadsheetData) => void;
}

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
  data,
  title,
  onGenerateCharts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCell, setSelectedCell] = useState<{sheet: string, row: number, col: string} | null>(null);
  const { toast } = useToast();

  const filteredSheets = useMemo(() => {
    if (!searchTerm) return data.sheets;
    
    return data.sheets.map(sheet => ({
      ...sheet,
      data: sheet.data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }));
  }, [data.sheets, searchTerm]);

  const exportToCSV = (sheetData: Array<Record<string, any>>, sheetName: string) => {
    if (sheetData.length === 0) return;
    
    const headers = Object.keys(sheetData[0]);
    const csvContent = [
      headers.join(','),
      ...sheetData.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}-${sheetName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Successful',
      description: `${sheetName} exported as CSV`,
    });
  };

  const exportToJSON = (sheetData: Array<Record<string, any>>, sheetName: string) => {
    const jsonContent = JSON.stringify(sheetData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}-${sheetName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Successful',
      description: `${sheetName} exported as JSON`,
    });
  };

  const getCellFormula = (sheetName: string, rowIndex: number, colKey: string) => {
    const sheet = data.sheets.find(s => s.name === sheetName);
    if (!sheet?.formulas) return null;
    
    const cellRef = `${colKey}${rowIndex + 2}`; // Excel-style reference (1-indexed + header)
    return sheet.formulas.find(f => f.cell === cellRef);
  };

  const renderCell = (value: any, sheetName: string, rowIndex: number, colKey: string) => {
    const formula = getCellFormula(sheetName, rowIndex, colKey);
    const isSelected = selectedCell?.sheet === sheetName && 
                     selectedCell?.row === rowIndex && 
                     selectedCell?.col === colKey;
    
    return (
      <div
        className={`
          min-w-[100px] p-2 border-r border-b border-border/50 cursor-pointer
          hover:bg-muted/50 transition-colors
          ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''}
          ${formula ? 'bg-accent/20' : ''}
        `}
        onClick={() => setSelectedCell({ sheet: sheetName, row: rowIndex, col: colKey })}
        title={formula ? `Formula: ${formula.formula}` : undefined}
      >
        <div className="flex items-center gap-1">
          {formula && <Calculator className="h-3 w-3 text-primary" />}
          <span className="text-sm">
            {typeof value === 'number' ? value.toLocaleString() : String(value)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {title}
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{data.metadata.totalSheets} sheets</Badge>
                {data.metadata.hasFormulas && (
                  <Badge variant="outline" className="text-primary">
                    <Calculator className="h-3 w-3 mr-1" />
                    Formulas
                  </Badge>
                )}
                {data.metadata.hasCharts && (
                  <Badge variant="outline" className="text-accent">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Charts
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {onGenerateCharts && (
                <Button
                  onClick={() => onGenerateCharts(data)}
                  variant="default"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Charts
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in spreadsheet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sheets */}
      <Tabs defaultValue={data.sheets[0]?.name} className="space-y-4">
        <TabsList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.sheets.map((sheet) => (
            <TabsTrigger key={sheet.name} value={sheet.name} className="flex items-center gap-2">
              {sheet.name}
              <Badge variant="secondary" className="text-xs">
                {sheet.data.length} rows
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {filteredSheets.map((sheet) => (
          <TabsContent key={sheet.name} value={sheet.name}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sheet.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(sheet.data, sheet.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToJSON(sheet.data, sheet.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>
                {sheet.formulas && sheet.formulas.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Contains {sheet.formulas.length} formulas
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {sheet.data.length > 0 ? (
                  <ScrollArea className="w-full">
                    <div className="min-w-max">
                      {/* Header */}
                      <div className="flex bg-muted/50">
                        {Object.keys(sheet.data[0]).map((header) => (
                          <div
                            key={header}
                            className="min-w-[100px] p-3 font-medium border-r border-b border-border text-sm"
                          >
                            {header}
                          </div>
                        ))}
                      </div>
                      
                      {/* Data rows */}
                      {sheet.data.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex">
                          {Object.entries(row).map(([key, value]) => (
                            <div key={key}>
                              {renderCell(value, sheet.name, rowIndex, key)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data found in this sheet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Selected cell info */}
      {selectedCell && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm">
              <div className="font-medium">Selected Cell: {selectedCell.col}{selectedCell.row + 1}</div>
              {(() => {
                const formula = getCellFormula(selectedCell.sheet, selectedCell.row, selectedCell.col);
                return formula ? (
                  <div className="mt-1 text-muted-foreground">
                    Formula: <code className="bg-muted px-1 rounded">{formula.formula}</code>
                  </div>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};