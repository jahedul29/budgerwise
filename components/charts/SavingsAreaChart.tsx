'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount } from '@/lib/currency';

interface DataPoint {
  month: string;
  savings: number;
}

export function SavingsAreaChart({ data, currency = 'BDT' }: { data: DataPoint[]; currency?: string }) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:opacity-20" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [formatAmount(Number(value), currency), 'Net Savings']}
        />
        <Area type="monotone" dataKey="savings" stroke="#6366F1" strokeWidth={2.5} fill="url(#savingsGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
