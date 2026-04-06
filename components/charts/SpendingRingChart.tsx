'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatAmount } from '@/lib/currency';

interface SpendingData {
  name: string;
  value: number;
  color: string;
  icon: string;
}

interface SpendingRingChartProps {
  data: SpendingData[];
  currency?: string;
}

export function SpendingRingChart({ data, currency = 'BDT' }: SpendingRingChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No spending data yet
      </div>
    );
  }

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as SpendingData;
                return (
                  <div className="rounded-lg bg-white px-3 py-2 shadow-lg dark:bg-gray-800 text-sm border border-gray-100 dark:border-gray-700">
                    <p className="font-medium">{d.icon} {d.name}</p>
                    <p className="text-gray-500">{formatAmount(d.value, currency)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-gray-400">Total</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {formatAmount(total, currency)}
        </p>
      </div>
    </div>
  );
}
