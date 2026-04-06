'use client';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/currency';

interface HeatmapProps {
  data: { day: string; amount: number }[];
  currency?: string;
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SpendingHeatmap({ data, currency = 'BDT' }: HeatmapProps) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const intensity = item.amount / maxAmount;
        return (
          <div key={item.day} className="flex items-center gap-3">
            <span className="w-8 text-xs text-gray-500 font-medium">{item.day}</span>
            <div className="flex-1 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
              <div
                className="h-full rounded-lg transition-all duration-500"
                style={{
                  width: `${Math.max(intensity * 100, 2)}%`,
                  backgroundColor: intensity > 0.7 ? '#F43F5E' : intensity > 0.4 ? '#F59E0B' : '#10B981',
                  opacity: Math.max(intensity, 0.3),
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600 dark:text-gray-400">
                {formatAmount(item.amount, currency)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
