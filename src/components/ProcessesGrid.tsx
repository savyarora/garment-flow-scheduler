
import React, { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Calendar, Clock, Package, Scissors, Sparkles, ShirtIcon, Lock, LockOpen, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  duration: number;
  status: 'pending' | 'in-progress' | 'completed';
  isManualOverride: boolean;
  isFrozen: boolean;
}

const ProcessesGrid: React.FC = () => {
  // Base sewing schedule (primary process)
  const [sewingSchedule, setSewingSchedule] = useState<DailySchedule[]>([
    { date: '2024-02-15', quantity: 500 },
    { date: '2024-02-16', quantity: 500 },
    { date: '2024-02-17', quantity: 500 },
    { date: '2024-02-18', quantity: 300 },
  ]);

  const [editingProcess, setEditingProcess] = useState<string | null>(null);
  const [tempSchedule, setTempSchedule] = useState<DailySchedule[]>([]);

  const calculateScheduleFromOffset = useCallback((baseSchedule: DailySchedule[], offsetDays: number, duration: number): DailySchedule[] => {
    if (baseSchedule.length === 0) return [];
    
    const startDate = new Date(baseSchedule[0].date);
    startDate.setDate(startDate.getDate() + offsetDays);
    
    const totalQuantity = baseSchedule.reduce((sum, day) => sum + day.quantity, 0);
    const dailyQuantity = Math.ceil(totalQuantity / duration);
    
    const schedule: DailySchedule[] = [];
    for (let i = 0; i < duration; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const remainingQuantity = totalQuantity - (i * dailyQuantity);
      const quantity = Math.min(dailyQuantity, remainingQuantity);
      
      if (quantity > 0) {
        schedule.push({
          date: currentDate.toISOString().split('T')[0],
          quantity: quantity
        });
      }
    }
    
    return schedule;
  }, []);

  const [processData, setProcessData] = useState<ProcessData[]>([
    {
      id: '1',
      processName: 'Cutting',
      offsetDays: -3,
      isPrimary: false,
      icon: 'scissors',
      description: 'Fabric cutting and pattern preparation',
      schedule: [],
      duration: 2,
      status: 'completed',
      isManualOverride: false,
      isFrozen: false
    },
    {
      id: '2',
      processName: 'Sewing',
      offsetDays: 0,
      isPrimary: true,
      icon: 'shirt',
      description: 'Primary sewing operations and assembly',
      schedule: sewingSchedule,
      duration: 4,
      status: 'in-progress',
      isManualOverride: false,
      isFrozen: false
    },
    {
      id: '3',
      processName: 'Finishing',
      offsetDays: 2,
      isPrimary: false,
      icon: 'sparkles',
      description: 'Quality control, pressing, and final touches',
      schedule: [],
      duration: 3,
      status: 'pending',
      isManualOverride: false,
      isFrozen: false
    },
    {
      id: '4',
      processName: 'Packing',
      offsetDays: 5,
      isPrimary: false,
      icon: 'package',
      description: 'Final packaging and shipping preparation',
      schedule: [],
      duration: 2,
      status: 'pending',
      isManualOverride: false,
      isFrozen: false
    }
  ]);

  // Update schedules when sewing schedule changes
  React.useEffect(() => {
    setProcessData(prevData => 
      prevData.map(process => {
        if (process.isPrimary) {
          return { ...process, schedule: sewingSchedule };
        } else if (!process.isManualOverride && !process.isFrozen) {
          return {
            ...process,
            schedule: calculateScheduleFromOffset(sewingSchedule, process.offsetDays, process.duration)
          };
        }
        return process;
      })
    );
  }, [sewingSchedule, calculateScheduleFromOffset]);

  const getIcon = (iconName: string) => {
    const iconMap = {
      'scissors': Scissors,
      'shirt': ShirtIcon,
      'sparkles': Sparkles,
      'package': Package
    };
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Package;
    return <IconComponent className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { variant: 'secondary' as const, label: 'Pending' },
      'in-progress': { variant: 'default' as const, label: 'In Progress' },
      'completed': { variant: 'default' as const, label: 'Completed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge 
        variant={config.variant}
        className={status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 
                  status === 'in-progress' ? 'bg-blue-500 hover:bg-blue-600' : ''}
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
    setProcessData(prevData =>
      prevData.map(process =>
        process.id === processId
          ? { ...process, isFrozen: !process.isFrozen }
          : process
      )
    );
  };

  const openScheduleEditor = (process: ProcessData) => {
    setEditingProcess(process.id);
    setTempSchedule([...process.schedule]);
  };

  const saveScheduleChanges = () => {
    if (!editingProcess) return;
    
    setProcessData(prevData =>
      prevData.map(process =>
        process.id === editingProcess
          ? { 
              ...process, 
              schedule: [...tempSchedule], 
              isManualOverride: true 
            }
          : process
      )
    );
    
    setEditingProcess(null);
    setTempSchedule([]);
  };

  const resetToAutoSchedule = (processId: string) => {
    const process = processData.find(p => p.id === processId);
    if (!process || process.isPrimary) return;

    const newSchedule = calculateScheduleFromOffset(sewingSchedule, process.offsetDays, process.duration);
    
    setProcessData(prevData =>
      prevData.map(p =>
        p.id === processId
          ? { 
              ...p, 
              schedule: newSchedule, 
              isManualOverride: false 
            }
          : p
      )
    );
  };

  const addSewingDay = () => {
    const lastDate = sewingSchedule.length > 0 
      ? sewingSchedule[sewingSchedule.length - 1].date 
      : '2024-02-15';
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    setSewingSchedule(prev => [...prev, {
      date: nextDate.toISOString().split('T')[0],
      quantity: 500
    }]);
  };

  const updateSewingDay = (index: number, field: 'date' | 'quantity', value: string | number) => {
    setSewingSchedule(prev => 
      prev.map((day, i) => 
        i === index 
          ? { ...day, [field]: value }
          : day
      )
    );
  };

  const removeSewingDay = (index: number) => {
    if (sewingSchedule.length > 1) {
      setSewingSchedule(prev => prev.filter((_, i) => i !== index));
    }
  };

  const columnDefs: ColDef[] = [
    {
      headerName: 'Process',
      field: 'processName',
      width: 200,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          {getIcon(params.data.icon)}
          <span className={params.data.isPrimary ? 'font-bold text-blue-600' : 'font-medium'}>
            {params.value}
          </span>
          {params.data.isPrimary && (
            <Badge variant="default" className="bg-blue-500 text-xs px-1 py-0">
              PRIMARY
            </Badge>
          )}
          {params.data.isManualOverride && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-orange-300 text-orange-600">
              MANUAL
            </Badge>
          )}
        </div>
      )
    },
    {
      headerName: 'Description',
      field: 'description',
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="text-sm text-gray-600 py-2">
          {params.value}
        </div>
      )
    },
    {
      headerName: 'Schedule',
      field: 'schedule',
      width: 300,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <div className="text-sm">
            {formatScheduleDisplay(params.value)}
          </div>
          {!params.data.isPrimary && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => openScheduleEditor(params.data)}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      )
    },
    {
      headerName: 'Offset (Days)',
      field: 'offsetDays',
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
          <Badge 
            variant={params.value === 0 ? 'default' : 'outline'}
            className={
              params.value === 0 ? 'bg-blue-500' :
              params.value < 0 ? 'border-orange-300 text-orange-600' : 
              'border-green-300 text-green-600'
            }
          >
            {params.value > 0 ? `+${params.value}` : params.value}
          </Badge>
        </div>
      )
    },
    {
      headerName: 'Duration (Days)',
      field: 'duration',
      width: 130,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-1 justify-center h-full">
          <Clock className="h-4 w-4 text-gray-500" />
          <span>{params.value}</span>
        </div>
      )
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
          {getStatusBadge(params.value)}
        </div>
      )
    },
    {
      headerName: 'Controls',
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-1 h-full">
          {!params.data.isPrimary && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleFreeze(params.data.id)}
                className="h-6 w-6 p-0"
                title={params.data.isFrozen ? 'Unfreeze schedule' : 'Freeze schedule'}
              >
                {params.data.isFrozen ? 
                  <Lock className="h-3 w-3 text-red-500" /> : 
                  <LockOpen className="h-3 w-3 text-gray-500" />
                }
              </Button>
              {params.data.isManualOverride && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resetToAutoSchedule(params.data.id)}
                  className="h-6 w-6 p-0 text-blue-500"
                  title="Reset to auto schedule"
                >
                  ↻
                </Button>
              )}
            </>
          )}
        </div>
      )
    }
  ];

  const gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
    rowHeight: 60,
    suppressRowHoverHighlight: false,
    rowClassRules: {
      'primary-process': (params) => params.data.isPrimary,
      'frozen-process': (params) => params.data.isFrozen,
    },
  };

  const currentEditingProcess = processData.find(p => p.id === editingProcess);

  return (
    <div className="p-6 space-y-6">
      {/* Sewing Schedule Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sewing Schedule (Primary Process)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sewingSchedule.map((day, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={day.date}
                  onChange={(e) => updateSewingDay(index, 'date', e.target.value)}
                  className="w-40"
                />
                <Input
                  type="number"
                  value={day.quantity}
                  onChange={(e) => updateSewingDay(index, 'quantity', parseInt(e.target.value) || 0)}
                  className="w-32"
                  placeholder="Quantity"
                />
                <span className="text-sm text-gray-500">pcs</span>
                {sewingSchedule.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSewingDay(index)}
                    className="text-red-500"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            <Button onClick={addSewingDay} size="sm" variant="outline">
              Add Day
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Garment Manufacturing Process Schedule
          </CardTitle>
          <div className="flex gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Primary Process</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-red-500" />
              <span>Frozen Schedule</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-200 border border-orange-300 rounded"></div>
              <span>Manual Override</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="ag-theme-alpine" style={{ height: '400px', width: '100%' }}>
            <AgGridReact
              rowData={processData}
              columnDefs={columnDefs}
              gridOptions={gridOptions}
              animateRows={true}
            />
          </div>
        </CardContent>
      </Card>

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
                    onChange={(e) => {
                      const newSchedule = [...tempSchedule];
                      newSchedule[index] = { ...newSchedule[index], date: e.target.value };
                      setTempSchedule(newSchedule);
                    }}
                    className="w-40"
                  />
                  <Input
                    type="number"
                    value={day.quantity}
                    onChange={(e) => {
                      const newSchedule = [...tempSchedule];
                      newSchedule[index] = { ...newSchedule[index], quantity: parseInt(e.target.value) || 0 };
                      setTempSchedule(newSchedule);
                    }}
                    className="w-24"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTempSchedule(prev => prev.filter((_, i) => i !== index));
                    }}
                    className="text-red-500"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => {
                  const lastDate = tempSchedule.length > 0 
                    ? tempSchedule[tempSchedule.length - 1].date 
                    : new Date().toISOString().split('T')[0];
                  const nextDate = new Date(lastDate);
                  nextDate.setDate(nextDate.getDate() + 1);
                  setTempSchedule(prev => [...prev, {
                    date: nextDate.toISOString().split('T')[0],
                    quantity: 500
                  }]);
                }}
                size="sm"
                variant="outline"
              >
                Add Day
              </Button>
              <div className="flex gap-2 pt-4">
                <Button onClick={saveScheduleChanges} className="flex-1">
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingProcess(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProcessesGrid;
