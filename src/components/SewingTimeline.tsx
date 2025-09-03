import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SewingTimelineProps {
  startDate: string; // ISO yyyy-mm-dd
  durationDays: number;
  totalQuantity: number;
  onChange: (startDate: string, durationDays: number, totalQuantity: number) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

const SewingTimeline: React.FC<SewingTimelineProps> = ({ startDate, durationDays, totalQuantity, onChange }) => {
  const CELL_PX = 36; // width per day cell

  // Stable window start so the strip can visibly move/rescale
  const [windowStartDate, setWindowStartDate] = React.useState<string>(() => addDays(startDate, -30));
  const numCells = 180; // ~6 months window

  // Expand the window if the strip approaches edges
  React.useEffect(() => {
    const stripEndDate = addDays(startDate, Math.max(0, durationDays - 1));
    const minDateInWindow = windowStartDate;
    const maxDateInWindow = addDays(windowStartDate, numCells - 1);

    // Shift window left if needed
    if (new Date(startDate) < new Date(minDateInWindow)) {
      setWindowStartDate(addDays(startDate, -30));
    }
    // Shift window right if needed
    if (new Date(stripEndDate) > new Date(maxDateInWindow)) {
      const newStart = addDays(stripEndDate, -numCells + 30);
      setWindowStartDate(newStart);
    }
  }, [startDate, durationDays, windowStartDate]);

  const dates = React.useMemo(() => {
    return Array.from({ length: numCells }, (_, i) => addDays(windowStartDate, i));
  }, [windowStartDate]);

  const startIndex = React.useMemo(() => {
    const idx = Math.max(0, Math.min(numCells - 1, Math.floor((new Date(startDate).getTime() - new Date(windowStartDate).getTime()) / DAY_MS)));
    return idx;
  }, [startDate, windowStartDate]);

  const [dragState, setDragState] = React.useState<null | {
    mode: 'move' | 'resize-left' | 'resize-right';
    startClientX: number;
    startIndex: number;
    duration: number;
  }>(null);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const beginDrag = (e: React.MouseEvent, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ mode, startClientX: e.clientX, startIndex, duration: durationDays });
  };

  const onMouseMove = React.useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const deltaPx = e.clientX - dragState.startClientX;
    const deltaCells = Math.round(deltaPx / CELL_PX);

    if (dragState.mode === 'move') {
      const newStartIndex = clamp(dragState.startIndex + deltaCells, 0, numCells - dragState.duration);
      const newStartDate = dates[newStartIndex];
      onChange(newStartDate, dragState.duration, totalQuantity);
    } else if (dragState.mode === 'resize-right') {
      const newDuration = clamp(dragState.duration + deltaCells, 1, numCells - dragState.startIndex);
      onChange(startDate, newDuration, totalQuantity);
    } else if (dragState.mode === 'resize-left') {
      const newStartIndex = clamp(dragState.startIndex + deltaCells, 0, dragState.startIndex + dragState.duration - 1);
      const newDuration = dragState.duration + (dragState.startIndex - newStartIndex);
      const newStartDate = dates[newStartIndex];
      onChange(newStartDate, newDuration, totalQuantity);
    }
  }, [dragState, dates, numCells, onChange, startDate, totalQuantity]);

  const endDrag = React.useCallback(() => setDragState(null), []);

  React.useEffect(() => {
    if (!dragState) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [dragState, onMouseMove, endDrag]);

  const stripStyle: React.CSSProperties = {
    left: `${startIndex * CELL_PX}px`,
    width: `${Math.max(1, durationDays) * CELL_PX}px`,
  };

  const perDay = durationDays > 0 ? Math.floor(totalQuantity / durationDays) : 0;
  const remainder = durationDays > 0 ? (totalQuantity % durationDays) : 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      if (e.shiftKey) {
        const newStartIndex = clamp(startIndex - 1, 0, startIndex + durationDays - 1);
        const newStartDate = dates[newStartIndex];
        const newDuration = durationDays + (startIndex - newStartIndex);
        onChange(newStartDate, newDuration, totalQuantity);
      } else {
        const newStartIndex = clamp(startIndex - 1, 0, numCells - durationDays);
        const newStartDate = dates[newStartIndex];
        onChange(newStartDate, durationDays, totalQuantity);
      }
    }
    if (e.key === 'ArrowRight') {
      if (e.shiftKey) {
        const newDuration = clamp(durationDays + 1, 1, numCells - startIndex);
        onChange(startDate, newDuration, totalQuantity);
      } else {
        const newStartIndex = clamp(startIndex + 1, 0, numCells - durationDays);
        const newStartDate = dates[newStartIndex];
        onChange(newStartDate, durationDays, totalQuantity);
      }
    }
  };

  return (
    <Card className="card-soft">
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onChange(e.target.value, Math.max(1, durationDays), totalQuantity)}
              className="w-full input-soft"
            />
          </div>
          <div className="space-y-1">
            <Label>Duration (days)</Label>
            <Input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => onChange(startDate, Math.max(1, parseInt(e.target.value) || 1), totalQuantity)}
              className="w-full input-soft"
            />
          </div>
          <div className="space-y-1">
            <Label>Total quantity (pcs)</Label>
            <Input
              type="number"
              min={0}
              value={totalQuantity}
              onChange={(e) => onChange(startDate, Math.max(1, durationDays), Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full input-soft"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-600 flex items-center justify-between">
            <span>Drag the strip to move. Use the side handles to resize. Tip: Shift + Arrow keys to resize; Arrow keys to move.</span>
            <span className="text-xs text-gray-500">{perDay} pcs/day {remainder ? `(+${remainder} spread)` : ''}</span>
          </div>
          <div
            className="relative overflow-x-auto border border-gray-200 rounded bg-white">
            <div
              className="relative"
              style={{ width: `${numCells * CELL_PX}px` }}
            >
              {/* Date axis */}
              <div className="flex">
                {dates.map((d, i) => (
                  <div
                    key={d}
                    className={`h-12 border-r border-gray-200 flex items-end justify-center text-[10px] text-gray-500 select-none ${isWeekend(d) ? 'bg-gray-50' : ''}`}
                    style={{ width: `${CELL_PX}px` }}
                    title={d}
                  >
                    <div className="pb-1">{formatShort(d)}</div>
                  </div>
                ))}
              </div>

              {/* Sewing strip */}
              <div
                className="absolute top-1 left-0 h-10 bg-blue-500/20 border border-blue-500/80 rounded shadow-sm flex items-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={stripStyle}
                onMouseDown={(e) => beginDrag(e, 'move')}
                tabIndex={0}
                onKeyDown={handleKeyDown}
              >
                {/* Left handle */}
                <div
                  className="absolute left-0 top-0 h-full w-3 bg-blue-500/70 hover:bg-blue-600 rounded-l cursor-ew-resize"
                  onMouseDown={(e) => beginDrag(e, 'resize-left')}
                  title="Resize start"
                />

                <div className="flex-1 text-center text-[11px] text-blue-800 font-medium">
                  {formatShort(startDate)} → {formatShort(addDays(startDate, Math.max(0, durationDays - 1)))}
                </div>

                {/* Right handle */}
                <div
                  className="absolute right-0 top-0 h-full w-3 bg-blue-500/70 hover:bg-blue-600 rounded-r cursor-ew-resize"
                  onMouseDown={(e) => beginDrag(e, 'resize-right')}
                  title="Resize end"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SewingTimeline; 