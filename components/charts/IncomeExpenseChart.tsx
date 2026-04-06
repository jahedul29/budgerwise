'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatAmount } from '@/lib/currency';

interface DataPoint {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: DataPoint[];
  currency?: string;
}

export function IncomeExpenseChart({ data, currency = 'BDT' }: IncomeExpenseChartProps) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
          formatter={(value, name) => [formatAmount(Number(value), currency), name === 'income' ? 'Income' : 'Expenses']}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Income" />
        <Line type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Expenses" />
      </LineChart>
    </ResponsiveContainer>
  );
}
