
import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Calendar, Clock, Package, Scissors, Sparkles, ShirtIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProcessData {
  id: string;
  processName: string;
  offsetDays: number;
  isPrimary: boolean;
  icon: string;
  description: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  duration: number;
  status: 'pending' | 'in-progress' | 'completed';
}

const ProcessesGrid: React.FC = () => {
  // Base sewing start date (primary process)
  const [sewingStartDate, setSewingStartDate] = useState(new Date('2024-02-15'));

  const calculateDate = (baseDate: Date, offsetDays: number): string => {
    const newDate = new Date(baseDate);
    newDate.setDate(newDate.getDate() + offsetDays);
    return newDate.toISOString().split('T')[0];
  };

  const calculateEndDate = (startDate: string, duration: number): string => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + duration - 1);
    return start.toISOString().split('T')[0];
  };

  const processData: ProcessData[] = useMemo(() => [
    {
      id: '1',
      processName: 'Cutting',
      offsetDays: -3,
      isPrimary: false,
      icon: 'scissors',
      description: 'Fabric cutting and pattern preparation',
      scheduledStartDate: calculateDate(sewingStartDate, -3),
      scheduledEndDate: calculateEndDate(calculateDate(sewingStartDate, -3), 2),
      duration: 2,
      status: 'completed'
    },
    {
      id: '2',
      processName: 'Sewing',
      offsetDays: 0,
      isPrimary: true,
      icon: 'shirt',
      description: 'Primary sewing operations and assembly',
      scheduledStartDate: calculateDate(sewingStartDate, 0),
      scheduledEndDate: calculateEndDate(calculateDate(sewingStartDate, 0), 5),
      duration: 5,
      status: 'in-progress'
    },
    {
      id: '3',
      processName: 'Finishing',
      offsetDays: 2,
      isPrimary: false,
      icon: 'sparkles',
      description: 'Quality control, pressing, and final touches',
      scheduledStartDate: calculateDate(sewingStartDate, 2),
      scheduledEndDate: calculateEndDate(calculateDate(sewingStartDate, 2), 3),
      duration: 3,
      status: 'pending'
    },
    {
      id: '4',
      processName: 'Packing',
      offsetDays: 5,
      isPrimary: false,
      icon: 'package',
      description: 'Final packaging and shipping preparation',
      scheduledStartDate: calculateDate(sewingStartDate, 5),
      scheduledEndDate: calculateEndDate(calculateDate(sewingStartDate, 5), 2),
      duration: 2,
      status: 'pending'
    }
  ], [sewingStartDate]);

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

  const columnDefs: ColDef[] = [
    {
      headerName: 'Process',
      field: 'processName',
      width: 150,
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
      headerName: 'Start Date',
      field: 'scheduledStartDate',
      width: 130,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-1 h-full">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="text-sm">{new Date(params.value).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      headerName: 'End Date',
      field: 'scheduledEndDate',
      width: 130,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-1 h-full">
          <Calendar className="h-4 w-4 text-green-500" />
          <span className="text-sm">{new Date(params.value).toLocaleDateString()}</span>
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
    },
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSewingStartDate(new Date(event.target.value));
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Garment Manufacturing Process Schedule
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">
                  Sewing Start Date:
                </label>
                <input
                  type="date"
                  value={sewingStartDate.toISOString().split('T')[0]}
                  onChange={handleDateChange}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Primary Process (drives schedule)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-200 border border-orange-300 rounded"></div>
              <span>Negative Offset (before sewing)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
              <span>Positive Offset (after sewing)</span>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Process Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {processData.map((process, index) => (
              <div
                key={process.id}
                className={`p-4 border rounded-lg ${
                  process.isPrimary 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getIcon(process.icon)}
                  <h3 className={`font-semibold ${process.isPrimary ? 'text-blue-700' : 'text-gray-700'}`}>
                    {process.processName}
                  </h3>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Offset: {process.offsetDays > 0 ? `+${process.offsetDays}` : process.offsetDays} days</p>
                  <p>Duration: {process.duration} days</p>
                  <p>Start: {new Date(process.scheduledStartDate).toLocaleDateString()}</p>
                </div>
                {index < processData.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-[-12px] transform -translate-y-1/2">
                    <div className="w-6 h-0.5 bg-gray-300"></div>
                    <div className="w-0 h-0 border-l-[6px] border-l-gray-300 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-6 -mt-0.5"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessesGrid;
