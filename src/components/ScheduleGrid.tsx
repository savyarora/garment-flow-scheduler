
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, Scissors, Sparkles, ShirtIcon } from 'lucide-react';

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
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ processData }) => {
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

  const getCellClass = (quantity: number, process: ProcessData) => {
    if (quantity === 0) return 'bg-gray-50 text-gray-400';
    if (process.isPrimary) return 'bg-blue-100 text-blue-800 font-semibold';
    if (process.isFrozen) return 'bg-red-100 text-red-800';
    if (process.isManualOverride) return 'bg-orange-100 text-orange-800';
    return 'bg-green-50 text-green-800';
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
                <th className="border border-gray-300 p-3 text-left font-semibold min-w-[200px]">
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
                        <div>
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
                      </div>
                    </td>
                    {allDates.map(date => {
                      const quantity = getQuantityForDate(process, date);
                      return (
                        <td 
                          key={date} 
                          className={`border border-gray-300 p-2 text-center ${getCellClass(quantity, process)}`}
                        >
                          {quantity > 0 ? (
                            <div>
                              <div className="font-medium">{quantity}</div>
                              <div className="text-xs">pcs</div>
                            </div>
                          ) : (
                            <div className="text-gray-400">-</div>
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
            {/* Totals Row */}
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 p-3">Daily Totals</td>
                {allDates.map(date => {
                  const dailyTotal = processData.reduce((sum, process) => {
                    return sum + getQuantityForDate(process, date);
                  }, 0);
                  return (
                    <td key={date} className="border border-gray-300 p-2 text-center bg-blue-50">
                      <div className="font-semibold text-blue-800">{dailyTotal}</div>
                      <div className="text-xs text-blue-600">pcs</div>
                    </td>
                  );
                })}
                <td className="border border-gray-300 p-3 text-center bg-blue-100">
                  <div className="font-bold text-blue-800">
                    {processData.reduce((sum, process) => {
                      return sum + process.schedule.reduce((pSum, day) => pSum + day.quantity, 0);
                    }, 0)}
                  </div>
                  <div className="text-xs text-blue-600">total pcs</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleGrid;
