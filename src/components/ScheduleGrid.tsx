
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Package, Scissors, Sparkles, ShirtIcon, Lock, LockOpen, Edit3, Check, X } from 'lucide-react';

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

interface ScheduleGridProps {
  processData: ProcessData[];
  onProcessUpdate: (processId: string, updates: Partial<ProcessData>) => void;
  onScheduleUpdate: (processId: string, schedule: DailySchedule[]) => void;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ 
  processData, 
  onProcessUpdate, 
  onScheduleUpdate 
}) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

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

  // Get all unique dates from all processes
  const allDates = React.useMemo(() => {
    const dateSet = new Set<string>();
    processData.forEach(process => {
      process.schedule.forEach(day => {
        dateSet.add(day.date);
      });
    });
    return Array.from(dateSet).sort();
  }, [processData]);

  const getQuantityForDate = (process: ProcessData, date: string): number => {
    const scheduleDay = process.schedule.find(day => day.date === date);
    return scheduleDay ? scheduleDay.quantity : 0;
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

  const getCellClass = (quantity: number, process: ProcessData, isEditable: boolean = false) => {
    let baseClass = 'relative group';
    if (isEditable) baseClass += ' cursor-pointer hover:bg-gray-100';
    
    if (quantity === 0) return `${baseClass} bg-gray-50 text-gray-400`;
    if (process.isPrimary) return `${baseClass} bg-blue-100 text-blue-800 font-semibold`;
    if (process.isFrozen) return `${baseClass} bg-red-100 text-red-800`;
    if (process.isManualOverride) return `${baseClass} bg-orange-100 text-orange-800`;
    return `${baseClass} bg-green-50 text-green-800`;
  };

  const handleCellClick = (processId: string, date: string, currentQuantity: number) => {
    const process = processData.find(p => p.id === processId);
    if (!process || process.isPrimary) return;
    
    const cellKey = `${processId}-${date}`;
    setEditingCell(cellKey);
    setEditValue(currentQuantity.toString());
  };

  const handleCellSave = (processId: string, date: string) => {
    const process = processData.find(p => p.id === processId);
    if (!process) return;

    let newQuantity = Math.max(0, parseInt(editValue) || 0);
    
    // For non-primary processes, cap quantity based on primary process quantity on offset-adjusted date
    const primaryProcess = processData.find(p => p.isPrimary);
    if (primaryProcess && !process.isPrimary) {
      // Calculate the primary process date by subtracting the offset
      const primaryDate = new Date(date);
      primaryDate.setDate(primaryDate.getDate() - process.offsetDays);
      const primaryDateString = primaryDate.toISOString().split('T')[0];
      
      const primaryQuantity = getQuantityForDate(primaryProcess, primaryDateString);
      newQuantity = Math.min(newQuantity, primaryQuantity);
    }
    
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            {/* Header Row */}
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left font-semibold min-w-[250px]">
                  Process
                </th>
                {allDates.map(date => (
                  <th key={date} className="border border-gray-300 p-2 text-center font-semibold min-w-[100px]">
                    <div className="text-xs">{formatDate(date)}</div>
                    <div className="text-xs text-gray-500">{date}</div>
                  </th>
                ))}
                <th className="border border-gray-300 p-3 text-center font-semibold min-w-[80px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {processData.map(process => {
                const totalQuantity = process.schedule.reduce((sum, day) => sum + day.quantity, 0);
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
                            {process.isManualOverride && (
                              <Badge variant="outline" className="text-xs px-1 py-0 border-orange-300 text-orange-600">
                                MANUAL
                              </Badge>
                            )}
                            {process.isFrozen && (
                              <Badge variant="outline" className="text-xs px-1 py-0 border-red-300 text-red-600">
                                FROZEN
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Offset: {process.offsetDays > 0 ? `+${process.offsetDays}` : process.offsetDays} days
                          </div>
                        </div>
                        {!process.isPrimary && (
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
                            {process.isManualOverride && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => resetToAutoSchedule(process.id)}
                                className="h-6 w-6 p-0 text-blue-500"
                                title="Reset to auto schedule"
                              >
                                ↻
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
                      const isEditable = !process.isPrimary && !process.isFrozen;
                      
                      return (
                        <td 
                          key={date} 
                          className={`border border-gray-300 p-2 text-center ${getCellClass(quantity, process, isEditable)}`}
                          onClick={() => isEditable && !isEditing ? handleCellClick(process.id, date, quantity) : undefined}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-6 w-16 text-xs"
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
                                  <div className="font-medium">{quantity}</div>
                                  <div className="text-xs">pcs</div>
                                </div>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                              {isEditable && quantity > 0 && (
                                <Edit3 className="h-2 w-2 absolute top-1 right-1 opacity-0 group-hover:opacity-50" />
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 p-3 text-center bg-gray-50">
                      <div className="font-semibold">{totalQuantity}</div>
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
