import React, { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Calendar, Package, Scissors, Sparkles, ShirtIcon, Lock, LockOpen, Edit3, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ScheduleGrid, { ViewLevel } from './ScheduleGrid';
import SewingTimeline from './SewingTimeline';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

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
  holidays: string[]; // ISO yyyy-mm-dd
}

const isWeekend = (date: Date): boolean => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

const isHolidayISO = (iso: string, calendar: WorkingCalendar): boolean => {
  return calendar.holidays.includes(iso);
};

const isNonWorking = (date: Date, calendar: WorkingCalendar): boolean => {
  const iso = date.toISOString().split('T')[0];
  if (isHolidayISO(iso, calendar)) return true;
  if (calendar.weekendsOff && isWeekend(date)) return true;
  return false;
};

const addWorkingDaysFromISO = (isoDate: string, offsetWorkingDays: number, calendar: WorkingCalendar): string => {
  const date = new Date(isoDate);
  if (offsetWorkingDays === 0) {
    return isoDate;
  }
  let remaining = Math.abs(offsetWorkingDays);
  const direction = offsetWorkingDays > 0 ? 1 : -1;
  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    if (!isNonWorking(date, calendar)) {
      remaining -= 1;
    }
  }
  return date.toISOString().split('T')[0];
};

const calculateScheduleFromOffsetWorkingDays = (
  baseSchedule: DailySchedule[],
  offsetDays: number,
  calendar: WorkingCalendar,
): DailySchedule[] => {
  if (baseSchedule.length === 0) return [];
  const aggregated = new Map<string, number>();
  for (const day of baseSchedule) {
    const targetDate = addWorkingDaysFromISO(day.date, offsetDays, calendar);
    aggregated.set(targetDate, (aggregated.get(targetDate) || 0) + day.quantity);
  }
  return Array.from(aggregated.entries())
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const ProcessesGrid: React.FC = () => {
  // View level state for hierarchical summary
  const [viewLevel, setViewLevel] = useState<ViewLevel>('strip');

  // Global working calendar
  const [calendar, setCalendar] = useState<WorkingCalendar>({ weekendsOff: true, holidays: [] });
  const [newHoliday, setNewHoliday] = useState<string>('');

  // Base sewing schedule (primary process)
  const [sewingSchedule, setSewingSchedule] = useState<DailySchedule[]>([
    { date: '2024-02-15', quantity: 500 },
    { date: '2024-02-16', quantity: 500 },
    { date: '2024-02-17', quantity: 500 },
    { date: '2024-02-18', quantity: 300 },
  ]);

  // New sewing timeline state
  const [sewingStartDate, setSewingStartDate] = useState<string>('2024-02-15');
  const [sewingDurationDays, setSewingDurationDays] = useState<number>(4); // calendar days on strip
  const [sewingTotalQuantity, setSewingTotalQuantity] = useState<number>(() => sewingSchedule.reduce((s, d) => s + d.quantity, 0));

  // Distribute total quantity across WORKING days within the strip window
  const recalcSewingSchedule = useCallback((startDate: string, durationDays: number, totalQty: number) => {
    const start = new Date(startDate);
    const days: string[] = [];
    for (let i = 0; i < durationDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (!isNonWorking(d, calendar)) {
        days.push(d.toISOString().split('T')[0]);
      }
    }
    const workingDays = days.length;
    if (workingDays === 0) {
      setSewingSchedule([]);
      return;
    }
    const perDay = Math.floor(totalQty / workingDays);
    const remainder = totalQty % workingDays;
    const next: DailySchedule[] = days.map((iso, idx) => ({
      date: iso,
      quantity: perDay + (idx < remainder ? 1 : 0),
    })).filter(d => d.quantity > 0);
    setSewingSchedule(next);
  }, [calendar]);

  const handleSewingTimelineChange = (startDate: string, durationDays: number, totalQty: number) => {
    setSewingStartDate(startDate);
    setSewingDurationDays(durationDays);
    setSewingTotalQuantity(totalQty);
    recalcSewingSchedule(startDate, durationDays, totalQty);
  };

  const [editingProcess, setEditingProcess] = useState<string | null>(null);
  const [tempSchedule, setTempSchedule] = useState<DailySchedule[]>([]);

  const [processData, setProcessData] = useState<ProcessData[]>([
    {
      id: '1',
      processName: 'Cutting',
      offsetDays: -3,
      isPrimary: false,
      icon: 'scissors',
      description: 'Fabric cutting and pattern preparation',
      schedule: [],
      status: 'completed',
      isManualOverride: false,
      isFrozen: false,
    },
    {
      id: '2',
      processName: 'Sewing',
      offsetDays: 0,
      isPrimary: true,
      icon: 'shirt',
      description: 'Primary sewing operations and assembly',
      schedule: sewingSchedule,
      status: 'in-progress',
      isManualOverride: false,
      isFrozen: false,
    },
    {
      id: '3',
      processName: 'Finishing',
      offsetDays: 2,
      isPrimary: false,
      icon: 'sparkles',
      description: 'Quality control, pressing, and final touches',
      schedule: [],
      status: 'pending',
      isManualOverride: false,
      isFrozen: false,
    },
    {
      id: '4',
      processName: 'Packing',
      offsetDays: 5,
      isPrimary: false,
      icon: 'package',
      description: 'Final packaging and shipping preparation',
      schedule: [],
      status: 'pending',
      isManualOverride: false,
      isFrozen: false,
    },
  ]);

  // Update schedules when sewing schedule or calendar changes
  React.useEffect(() => {
    setProcessData(prevData => prevData.map(process => {
      if (process.isPrimary) {
        return { ...process, schedule: sewingSchedule };
      } else if (!process.isManualOverride && !process.isFrozen) {
        return {
          ...process,
          schedule: calculateScheduleFromOffsetWorkingDays(sewingSchedule, process.offsetDays, calendar),
        };
      }
      return process;
    }));
  }, [sewingSchedule, calendar]);

  const getIcon = (iconName: string) => {
    const iconMap = {
      'scissors': Scissors,
      'shirt': ShirtIcon,
      'sparkles': Sparkles,
      'package': Package,
    };
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Package;
    return <IconComponent className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { variant: 'secondary' as const, label: 'Pending' },
      'in-progress': { variant: 'default' as const, label: 'In Progress' },
      'completed': { variant: 'default' as const, label: 'Completed' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge
        variant={config.variant}
        className={status === 'completed' ? 'bg-green-500 hover:bg-green-600' : status === 'in-progress' ? 'bg-blue-500 hover:bg-blue-600' : ''}
      >
        {config.label}
      </Badge>
    );
  };

  const formatScheduleDisplay = (schedule: DailySchedule[]) => {
    if (schedule.length === 0) return 'No schedule';
    const startDate = schedule[0].date;
    const endDate = schedule[schedule.length - 1].date;
    const totalQty = schedule.reduce((sum, day) => sum + day.quantity, 0);
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()} (${totalQty} pcs)`;
  };

  const toggleFreeze = (processId: string) => {
    setProcessData(prevData => prevData.map(process => process.id === processId ? { ...process, isFrozen: !process.isFrozen } : process));
  };

  const openScheduleEditor = (process: ProcessData) => {
    setEditingProcess(process.id);
    setTempSchedule([...process.schedule]);
  };

  const saveScheduleChanges = () => {
    if (!editingProcess) return;
    setProcessData(prevData => prevData.map(process => process.id === editingProcess ? { ...process, schedule: [...tempSchedule], isManualOverride: true } : process));
    setEditingProcess(null);
    setTempSchedule([]);
  };

  const resetToAutoSchedule = (processId: string) => {
    const process = processData.find(p => p.id === processId);
    if (!process || process.isPrimary) return;
    const newSchedule = calculateScheduleFromOffsetWorkingDays(sewingSchedule, process.offsetDays, calendar);
    setProcessData(prevData => prevData.map(p => p.id === processId ? { ...p, schedule: newSchedule, isManualOverride: false } : p));
  };

  const handleProcessUpdate = (processId: string, updates: Partial<ProcessData>) => {
    setProcessData(prevData => prevData.map(process => process.id === processId ? { ...process, ...updates } : process));
  };

  const handleScheduleUpdate = (processId: string, schedule: DailySchedule[]) => {
    setProcessData(prevData => prevData.map(process => process.id === processId ? { ...process, schedule } : process));
  };

  const handleOffsetChange = (processId: string, newOffset: number) => {
    setProcessData(prevData => prevData.map(process => {
      if (process.id !== processId) return process;
      if (process.isPrimary) {
        return { ...process, offsetDays: newOffset };
      }
      const newSchedule = calculateScheduleFromOffsetWorkingDays(sewingSchedule, newOffset, calendar);
      return { ...process, offsetDays: newOffset, isManualOverride: false, schedule: newSchedule };
    }));
  };

  // AG Grid definitions left intact but not rendered below
  const columnDefs: ColDef[] = [];
  const gridOptions: GridOptions = { defaultColDef: { sortable: true, filter: true, resizable: true }, rowHeight: 60 };

  const currentEditingProcess = processData.find(p => p.id === editingProcess);

  return (
    <div className="p-6 space-y-6">
      {/* Working days settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Working Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <input
                id="weekends-off"
                type="checkbox"
                checked={calendar.weekendsOff}
                onChange={(e) => setCalendar(c => ({ ...c, weekendsOff: e.target.checked }))}
              />
              <Label htmlFor="weekends-off">Weekends are off</Label>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Add holiday</Label>
                <Input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} className="h-8" />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!newHoliday) return;
                  setCalendar(c => c.holidays.includes(newHoliday) ? c : { ...c, holidays: [...c.holidays, newHoliday].sort() });
                  setNewHoliday('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {calendar.holidays.map(h => (
                <span key={h} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-1">
                  {h}
                  <button
                    aria-label={`Remove ${h}`}
                    onClick={() => setCalendar(c => ({ ...c, holidays: c.holidays.filter(x => x !== h) }))}
                    className="hover:text-red-900"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sewing Schedule Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sewing Schedule (Primary Process)</CardTitle>
        </CardHeader>
        <CardContent>
          <SewingTimeline
            startDate={sewingStartDate}
            durationDays={sewingDurationDays}
            totalQuantity={sewingTotalQuantity}
            onChange={handleSewingTimelineChange}
          />
        </CardContent>
      </Card>

      {/* Schedule Grid Visualization */}
      <ScheduleGrid
        processData={processData}
        onProcessUpdate={handleProcessUpdate}
        onScheduleUpdate={handleScheduleUpdate}
        calendar={calendar}
        onResetProcess={resetToAutoSchedule}
        onChangeOffset={handleOffsetChange}
        viewLevel={viewLevel}
        onViewLevelChange={setViewLevel}
      />

      {/* Schedule Editor Dialog */}
      {editingProcess && currentEditingProcess && (
        <Dialog open={!!editingProcess} onOpenChange={() => setEditingProcess(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {currentEditingProcess.processName} Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {tempSchedule.map((day, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={day.date}
                    onChange={e => {
                      const newSchedule = [...tempSchedule];
                      newSchedule[index] = { ...newSchedule[index], date: e.target.value };
                      setTempSchedule(newSchedule);
                    }}
                    className="w-40"
                  />
                  <Input
                    type="number"
                    value={day.quantity}
                    onChange={e => {
                      const newSchedule = [...tempSchedule];
                      newSchedule[index] = { ...newSchedule[index], quantity: parseInt(e.target.value) || 0 };
                      setTempSchedule(newSchedule);
                    }}
                    className="w-24"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setTempSchedule(prev => prev.filter((_, i) => i !== index)); }}
                    className="text-red-500"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => {
                  const lastDate = tempSchedule.length > 0 ? tempSchedule[tempSchedule.length - 1].date : new Date().toISOString().split('T')[0];
                  const nextDate = new Date(lastDate);
                  nextDate.setDate(nextDate.getDate() + 1);
                  setTempSchedule(prev => [...prev, { date: nextDate.toISOString().split('T')[0], quantity: 500 }]);
                }}
                size="sm"
                variant="outline"
              >
                Add Day
              </Button>
              <div className="flex gap-2 pt-4">
                <Button onClick={saveScheduleChanges} className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => setEditingProcess(null)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProcessesGrid;