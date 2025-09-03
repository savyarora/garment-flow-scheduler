
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Package, Scissors, Sparkles, ShirtIcon, Lock, LockOpen, Edit3, Check, X, RotateCcw, Layers, Eye, Info, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// View level types for hierarchical summary
export type ViewLevel = 'strip' | 'planning-unit' | 'order' | 'style';

export interface ViewLevelConfig {
  label: string;
  multiplier: number;
  isEditable: boolean;
}

export const VIEW_LEVEL_CONFIGS: Record<ViewLevel, ViewLevelConfig> = {
  'strip': {
    label: 'Strip Level',
    multiplier: 1,
    isEditable: true,
  },
  'planning-unit': {
    label: 'Planning Unit Level',
    multiplier: 2.5,
    isEditable: false,
  },
  'order': {
    label: 'Order Level',
    multiplier: 7,
    isEditable: false,
  },
  'style': {
    label: 'Style Level',
    multiplier: 10,
    isEditable: false,
  },
};

interface DailySchedule {
  date: string;
  quantity: number;
}

interface ProcessData {
  id: string;
  processName: string;
  offsetDays: number;
  isPrimary: boolean;
  icon: string;
  description: string;
  schedule: DailySchedule[];
  status: 'pending' | 'in-progress' | 'completed';
  isManualOverride: boolean;
  isFrozen: boolean;
}

interface WorkingCalendar {
  weekendsOff: boolean;
  holidays: string[];
}

interface ScheduleGridProps {
  processData: ProcessData[];
  onProcessUpdate: (processId: string, updates: Partial<ProcessData>) => void;
  onScheduleUpdate: (processId: string, schedule: DailySchedule[]) => void;
  calendar: WorkingCalendar;
  onResetProcess?: (processId: string) => void;
  onChangeOffset?: (processId: string, newOffset: number) => void;
  viewLevel?: ViewLevel;
  onViewLevelChange?: (level: ViewLevel) => void;
}

const toISO = (d: Date) => d.toISOString().split('T')[0];
const addDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return toISO(d); };
const clampRange = (start: string, end: string): [string, string] => {
  if (new Date(start) <= new Date(end)) return [start, end];
  return [end, start];
};

const enumerateDates = (startISO: string, endISO: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const isWeekendISO = (iso: string) => { const d = new Date(iso).getDay(); return d === 0 || d === 6; };
const isHolidayISO = (iso: string, holidays: string[]) => holidays.includes(iso);
const isNonWorkingISO = (iso: string, cal: WorkingCalendar) => (cal.weekendsOff && isWeekendISO(iso)) || isHolidayISO(iso, cal.holidays);

const nextWorkingDayAfter = (fromISO: string, cal: WorkingCalendar): string => {
  let iso = addDays(fromISO, 1);
  while (isNonWorkingISO(iso, cal)) iso = addDays(iso, 1);
  return iso;
};

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ 
  processData, 
  onProcessUpdate, 
  onScheduleUpdate,
  calendar,
  onResetProcess,
  onChangeOffset,
  viewLevel = 'strip',
  onViewLevelChange,
}) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Get current view configuration
  const currentViewConfig = VIEW_LEVEL_CONFIGS[viewLevel];

  const getIcon = (iconName: string) => {
    const iconMap = {
      'scissors': Scissors,
      'shirt': ShirtIcon,
      'sparkles': Sparkles,
      'package': Package
    };
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Package;
    return <IconComponent className="h-4 w-4" />;
  };

  const primaryProcess = React.useMemo(() => processData.find(p => p.isPrimary), [processData]);
  const primaryTotal = React.useMemo(() => {
    const baseTotal = primaryProcess ? primaryProcess.schedule.reduce((s, d) => s + d.quantity, 0) : 0;
    return Math.round(baseTotal * currentViewConfig.multiplier);
  }, [primaryProcess, currentViewConfig.multiplier]);

  // Initial window: fit to data
  const initialWindow = React.useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;
    for (const p of processData) {
      for (const d of p.schedule) {
        if (!min || d.date < min) min = d.date;
        if (!max || d.date > max) max = d.date;
      }
    }
    const today = toISO(new Date());
    return {
      start: min ?? today,
      end: max ?? addDays(today, 14),
    };
  }, [processData]);

  const [viewStart, setViewStart] = useState<string>(initialWindow.start);
  const [viewEnd, setViewEnd] = useState<string>(initialWindow.end);

  const setWindow = (start: string, end: string) => {
    const [s, e] = clampRange(start, end);
    // Limit range length to prevent ultra-wide tables
    const maxSpan = 365; // days
    const span = Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / (24*60*60*1000));
    if (span > maxSpan) {
      const limitedEnd = addDays(s, maxSpan);
      setViewStart(s);
      setViewEnd(limitedEnd);
    } else {
      setViewStart(s);
      setViewEnd(e);
    }
  };

  // Auto-fit to data whenever the plan range changes
  React.useEffect(() => {
    setWindow(initialWindow.start, initialWindow.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWindow.start, initialWindow.end]);

  const shiftWindow = (days: number) => {
    setWindow(addDays(viewStart, days), addDays(viewEnd, days));
  };

  const growWindow = (deltaStart: number, deltaEnd: number) => {
    setWindow(addDays(viewStart, deltaStart), addDays(viewEnd, deltaEnd));
  };

  // Visible dates are the configured window, not just existing schedule dates
  const allDates = React.useMemo(() => enumerateDates(viewStart, viewEnd), [viewStart, viewEnd]);

  const getQuantityForDate = (process: ProcessData, date: string): number => {
    const scheduleDay = process.schedule.find(day => day.date === date);
    const baseQuantity = scheduleDay ? scheduleDay.quantity : 0;
    return Math.round(baseQuantity * currentViewConfig.multiplier);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getProcessRowClass = (process: ProcessData) => {
    if (process.isPrimary) return 'bg-blue-50 border-l-4 border-blue-500';
    if (process.isFrozen) return 'bg-red-50 border-l-4 border-red-500';
    if (process.isManualOverride) return 'bg-orange-50 border-l-4 border-orange-500';
    return 'bg-white';
  };

  const getCellClass = (quantity: number, process: ProcessData, isEditable: boolean = false, isHolidayOrWeekend: boolean = false, isReadOnlyMode: boolean = false) => {
    let baseClass = 'relative group transition-colors duration-150';
    
    if (isEditable) {
      baseClass += ' cursor-pointer hover:bg-gray-100 hover:shadow-sm';
    } else if (isReadOnlyMode && !process.isPrimary && !process.isFrozen) {
      // Special styling for read-only mode
      baseClass += ' cursor-not-allowed';
    }
    
    if (isHolidayOrWeekend) baseClass += ' opacity-80';
    
    if (quantity === 0) {
      return `${baseClass} bg-gray-50 text-gray-400 ${isReadOnlyMode ? 'border-dashed' : ''}`;
    }
    
    if (process.isPrimary) {
      return `${baseClass} bg-blue-100 text-blue-800 font-semibold ${isReadOnlyMode ? 'opacity-90' : ''}`;
    }
    
    if (process.isFrozen) {
      return `${baseClass} bg-red-100 text-red-800`;
    }
    
    if (process.isManualOverride) {
      return `${baseClass} bg-orange-100 text-orange-800 ${isReadOnlyMode ? 'opacity-90' : ''}`;
    }
    
    // Regular process cells
    if (isReadOnlyMode) {
      return `${baseClass} bg-slate-50 text-slate-700 border-slate-200`;
    }
    
    return `${baseClass} bg-green-50 text-green-800`;
  };

  const handleCellClick = (processId: string, date: string, currentQuantity: number) => {
    const process = processData.find(p => p.id === processId);
    if (!process || process.isPrimary || process.isFrozen || !currentViewConfig.isEditable) return;
    
    const cellKey = `${processId}-${date}`;
    setEditingCell(cellKey);
    // For editing, we need to show the base quantity (not multiplied)
    const scheduleDay = process.schedule.find(day => day.date === date);
    const baseQuantity = scheduleDay ? scheduleDay.quantity : 0;
    setEditValue(baseQuantity.toString());
  };

  const handleCellSave = (processId: string, date: string) => {
    const process = processData.find(p => p.id === processId);
    if (!process) return;

    let newQuantity = Math.max(0, parseInt(editValue) || 0);
    
    // For non-primary processes: tail-first balancing, keep totals equal to primary
    if (primaryProcess && !process.isPrimary) {
      const targetTotal = primaryTotal;

      // Build working copy
      let updatedSchedule: DailySchedule[] = [...process.schedule].sort((a, b) => a.date.localeCompare(b.date));

      const currentIndex = updatedSchedule.findIndex(d => d.date === date);
      const currentCellQuantity = currentIndex >= 0 ? updatedSchedule[currentIndex].quantity : 0;

      // Ensure we can place the new value
      if (currentIndex >= 0) {
        updatedSchedule[currentIndex] = { date, quantity: newQuantity };
      } else if (newQuantity > 0) {
        updatedSchedule.push({ date, quantity: newQuantity });
        updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
      }
      
      // Compute delta against target
      const currentTotal = updatedSchedule.reduce((s, d) => s + d.quantity, 0);
      let delta = currentTotal - targetTotal; // positive means we need to reduce elsewhere; negative we need to add elsewhere

      const isEditableCell = (d: DailySchedule) => d.date !== date && d.quantity > 0;

      if (delta > 0) {
        // Need to reduce other days by delta, tail-first
        for (let i = updatedSchedule.length - 1; i >= 0 && delta > 0; i--) {
          const cell = updatedSchedule[i];
          if (!isEditableCell(cell)) continue;
          const reduction = Math.min(cell.quantity, delta);
          cell.quantity -= reduction;
          delta -= reduction;
          if (cell.quantity === 0) {
            updatedSchedule.splice(i, 1);
          }
        }
        // If still delta > 0 (not enough to reduce), cap the edited cell accordingly
        if (delta > 0) {
          // Reduce the edited cell to absorb remaining delta
          const idx = updatedSchedule.findIndex(d => d.date === date);
          if (idx >= 0) {
            const reduceMore = Math.min(updatedSchedule[idx].quantity, delta);
            updatedSchedule[idx].quantity -= reduceMore;
            delta -= reduceMore;
            if (updatedSchedule[idx].quantity === 0) updatedSchedule.splice(idx, 1);
          }
        }
      } else if (delta < 0) {
        // Need to add -delta to other days, tail-first; if none, optionally create new working day
        let need = -delta;
        // Prefer to add to the latest existing day
        for (let i = updatedSchedule.length - 1; i >= 0 && need > 0; i--) {
          const cell = updatedSchedule[i];
          if (cell.date === date) continue; // skip edited cell; we already set it
          // No explicit capacity per day; simply add
          cell.quantity += need;
          need = 0;
        }
        if (need > 0) {
          // No place to put remaining; ask user if we can create a new working day at the tail
          const lastDate = updatedSchedule.length > 0 ? updatedSchedule[updatedSchedule.length - 1].date : date;
          const allow = window.confirm('Add a new working day at the end to keep totals balanced?');
          if (allow) {
            let next = nextWorkingDayAfter(lastDate, calendar);
            updatedSchedule.push({ date: next, quantity: need });
            updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
            need = 0;
          } else {
            // Revert the edit
            if (currentIndex >= 0) {
              updatedSchedule[currentIndex] = { date, quantity: currentCellQuantity };
            } else {
              updatedSchedule = updatedSchedule.filter(d => d.date !== date);
            }
          }
        }
      }

      // Final clean-up: sort and save
      updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
      onScheduleUpdate(processId, updatedSchedule);
    } else {
      // For primary processes, simple update (no balancing needed here)
      const updatedSchedule = [...process.schedule];
      const existingIndex = updatedSchedule.findIndex(day => day.date === date);
      if (existingIndex >= 0) {
        if (newQuantity === 0) {
          updatedSchedule.splice(existingIndex, 1);
        } else {
          updatedSchedule[existingIndex].quantity = newQuantity;
        }
      } else if (newQuantity > 0) {
        updatedSchedule.push({ date, quantity: newQuantity });
        updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
      }
      onScheduleUpdate(processId, updatedSchedule);
    }
    
    onProcessUpdate(processId, { isManualOverride: true });
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const toggleFreeze = (processId: string) => {
    const process = processData.find(p => p.id === processId);
    if (!process || process.isPrimary) return;
    
    onProcessUpdate(processId, { isFrozen: !process.isFrozen });
  };

  const resetToAutoSchedule = (processId: string) => {
    const process = processData.find(p => p.id === processId);
    if (!process || process.isPrimary) return;
    
    onProcessUpdate(processId, { isManualOverride: false });
  };

  const downloadExcel = () => {
    // Prepare data for Excel export
    const allDates = enumerateDates(viewStart, viewEnd);
    const today = new Date().toISOString().split('T')[0];
    
    // Create metadata rows
    const metadataRows = [
      ['Production Schedule Export'],
      [''],
      ['Export Date:', today],
      ['View Level:', currentViewConfig.label],
      ['Date Range:', `${viewStart} to ${viewEnd}`],
      [''],
      ['']
    ];
    
    // Create header row
    const headers = ['Process', ...allDates, 'Total'];
    
    // Create data rows
    const rows = processData.map(process => {
      const basePlannedTotal = process.schedule.reduce((sum, day) => sum + day.quantity, 0);
      const plannedTotal = Math.round(basePlannedTotal * currentViewConfig.multiplier);
      
      const row = [
        process.processName,
        ...allDates.map(date => {
          const scheduleDay = process.schedule.find(day => day.date === date);
          const baseQuantity = scheduleDay ? scheduleDay.quantity : 0;
          const quantity = Math.round(baseQuantity * currentViewConfig.multiplier);
          return quantity > 0 ? quantity : '';
        }),
        plannedTotal
      ];
      return row;
    });
    
    // Combine all data
    const worksheetData = [...metadataRows, headers, ...rows];
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Process name column
      ...allDates.map(() => ({ wch: 12 })), // Date columns
      { wch: 12 } // Total column
    ];
    worksheet['!cols'] = colWidths;
    
    // Style the header row
    const headerRowIndex = metadataRows.length;
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "CCCCCC" } }
      };
    }
    
    // Add worksheet to workbook
    const sheetName = 'Production Schedule';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate filename with current date and view level
    const levelName = currentViewConfig.label.replace(/\s+/g, '_');
    const filename = `Production_Schedule_${levelName}_${today}.xlsx`;
    
    // Download the file
    XLSX.writeFile(workbook, filename);
  };

  return (
    <Card className="card-soft">
      <CardHeader>
        {/* Main Title and Controls Row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5" />
              Production Schedule Grid
            </CardTitle>
            
            <div className="flex gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500"></div>
                <span>Primary Process</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500"></div>
                <span>Frozen</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-100 border-l-2 border-orange-500"></div>
                <span>Manual Override</span>
              </div>
              {!currentViewConfig.isEditable && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-400"></div>
                  <span>Read-only Summary</span>
                </div>
              )}
            </div>
          </div>

          {/* Date range toolbar */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={viewStart} onChange={(e) => setWindow(e.target.value, viewEnd)} className="h-8 input-soft" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={viewEnd} onChange={(e) => setWindow(viewStart, e.target.value)} className="h-8 input-soft" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => shiftWindow(-30)} title="Back 30 days">« 30</Button>
              <Button size="sm" variant="outline" onClick={() => shiftWindow(-7)} title="Back 7 days">‹ 7</Button>
              <Button size="sm" variant="outline" onClick={() => shiftWindow(-1)} title="Back 1 day">‹ 1</Button>
              <Button size="sm" variant="outline" onClick={() => shiftWindow(1)} title="Forward 1 day">1 ›</Button>
              <Button size="sm" variant="outline" onClick={() => shiftWindow(7)} title="Forward 7 days">7 ›</Button>
              <Button size="sm" variant="outline" onClick={() => shiftWindow(30)} title="Forward 30 days">30 »</Button>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => growWindow(-7, 7)} title="Expand window by 1 week each side">±7</Button>
              <Button size="sm" variant="ghost" onClick={() => growWindow(-30, 30)} title="Expand window by 30 days each side">±30</Button>
              <Button size="sm" variant="outline" onClick={() => { setWindow(initialWindow.start, initialWindow.end); }} title="Fit to data">Fit</Button>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="default" onClick={downloadExcel} className="flex items-center gap-1" title="Download Excel file">
                <Download className="h-3 w-3" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {/* View Level Selector Row */}
        {onViewLevelChange && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">View Level:</span>
              <Select value={viewLevel} onValueChange={onViewLevelChange}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VIEW_LEVEL_CONFIGS).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Full-width Read-only Mode Alert */}
        {!currentViewConfig.isEditable && (
          <Alert className="mt-4 border-amber-200 bg-amber-50">
            <Eye className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>View-Only Mode:</strong> You're viewing aggregated data at the {currentViewConfig.label.toLowerCase()}. 
              Switch to "Strip Level" to edit individual quantities.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 rounded-lg shadow-sm">
            {/* Header Row */}
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left font-semibold min-w-[250px]">
                  Process
                </th>
                {allDates.map(date => {
                  const weekend = calendar.weekendsOff && isWeekendISO(date);
                  const isHoliday = isHolidayISO(date, calendar.holidays);
                  const shaded = weekend || isHoliday;
                  return (
                    <th key={date} className={`border border-gray-300 p-2 text-center font-semibold min-w-[100px] ${shaded ? 'bg-gray-50' : ''}`}>
                    <div className="text-xs">{formatDate(date)}</div>
                    <div className="text-xs text-gray-500">{date}</div>
                      {isHoliday && <div className="text-[10px] text-red-600">Holiday</div>}
                  </th>
                  );
                })}
                <th className="border border-gray-300 p-3 text-center font-semibold min-w-[80px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {processData.map(process => {
                const basePlannedTotal = process.schedule.reduce((sum, day) => sum + day.quantity, 0);
                const plannedTotal = Math.round(basePlannedTotal * currentViewConfig.multiplier);
                const delta = plannedTotal - primaryTotal;
                const deltaClass = delta === 0 ? 'bg-gray-100 text-gray-700' : delta > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';
                const isReadOnlyMode = !currentViewConfig.isEditable;

                return (
                  <tr key={process.id} className={getProcessRowClass(process)}>
                    <td className="border border-gray-300 p-3">
                      <div className="flex items-center gap-2">
                        {getIcon(process.icon)}
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {process.processName}
                            {process.isPrimary && (
                              <Badge variant="default" className="bg-blue-500 text-xs px-1 py-0">
                                PRIMARY
                              </Badge>
                            )}
                            {process.isManualOverride && currentViewConfig.isEditable && (
                              <Badge variant="outline" className="text-xs px-1 py-0 border-orange-300 text-orange-600">
                                MANUAL
                              </Badge>
                            )}
                            {process.isFrozen && currentViewConfig.isEditable && (
                              <Badge variant="outline" className="text-xs px-1 py-0 border-red-300 text-red-600">
                                FROZEN
                              </Badge>
                            )}
                          </div>
                          {/* Only show offset controls in editable mode */}
                          {currentViewConfig.isEditable && (
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>Offset:</span>
                              {process.isPrimary ? (
                                <span>{process.offsetDays > 0 ? `+${process.offsetDays}` : process.offsetDays} days</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    className="h-6 w-20"
                                    value={process.offsetDays}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      if (onChangeOffset) {
                                        onChangeOffset(process.id, val);
                                      } else {
                                        onProcessUpdate(process.id, { offsetDays: val, isManualOverride: false });
                                        if (onResetProcess) onResetProcess(process.id);
                                      }
                                    }}
                                  />
                                  <span>days</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {!process.isPrimary && currentViewConfig.isEditable && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleFreeze(process.id)}
                              className="h-6 w-6 p-0"
                              title={process.isFrozen ? 'Unfreeze schedule' : 'Freeze schedule'}
                            >
                              {process.isFrozen ? 
                                <Lock className="h-3 w-3 text-red-500" /> : 
                                <LockOpen className="h-3 w-3 text-gray-500" />
                              }
                            </Button>
                            {(!process.isPrimary) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onResetProcess && onResetProcess(process.id)}
                                className="h-6 w-6 p-0"
                                title="Reset to system plan"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    {allDates.map(date => {
                      const quantity = getQuantityForDate(process, date);
                      const cellKey = `${process.id}-${date}`;
                      const isEditing = editingCell === cellKey;
                      const isEditable = !process.isPrimary && !process.isFrozen && currentViewConfig.isEditable;
                      const isHolidayOrWeekend = isNonWorkingISO(date, calendar);
                      const isReadOnlyMode = !currentViewConfig.isEditable;
                      
                      // Tooltip for read-only cells
                      const getTooltipText = () => {
                        if (isReadOnlyMode && !process.isPrimary && !process.isFrozen && quantity > 0) {
                          return `View-only: Aggregated data (${currentViewConfig.label})`;
                        }
                        return undefined;
                      };
                      
                      return (
                        <td 
                          key={date} 
                          className={`border border-gray-300 p-2 text-center ${getCellClass(quantity, process, isEditable, isHolidayOrWeekend, isReadOnlyMode)}`}
                          onClick={() => isEditable && !isEditing ? handleCellClick(process.id, date, quantity) : undefined}
                          title={getTooltipText()}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-6 w-16 text-xs input-soft"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave(process.id, date);
                                  if (e.key === 'Escape') handleCellCancel();
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCellSave(process.id, date)}
                                className="h-4 w-4 p-0"
                              >
                                <Check className="h-2 w-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCellCancel}
                                className="h-4 w-4 p-0"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ) : (
                            <div>
                              {quantity > 0 ? (
                                <div>
                                  <div className="font-medium flex items-center justify-center gap-1">
                                    {quantity}
                                    {isReadOnlyMode && !process.isPrimary && !process.isFrozen && (
                                      <Eye className="h-2 w-2 opacity-60" />
                                    )}
                                  </div>
                                  <div className="text-xs">pcs</div>
                                </div>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                              {isEditable && quantity > 0 && (
                                <Edit3 className="h-2 w-2 absolute top-1 right-1 opacity-0 group-hover:opacity-50" />
                              )}
                              {isReadOnlyMode && !isEditable && !process.isPrimary && !process.isFrozen && quantity > 0 && (
                                <div className="absolute inset-0 bg-slate-100 bg-opacity-20 pointer-events-none"></div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className={`border border-gray-300 p-3 text-center ${isReadOnlyMode ? 'bg-slate-100' : 'bg-gray-50'}`}>
                      <div className="font-semibold flex items-center justify-center gap-1">
                        {plannedTotal}
                        {isReadOnlyMode && (
                          <Eye className="h-3 w-3 opacity-60" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">pcs</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleGrid;
