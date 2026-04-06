'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatAmount } from '@/lib/currency';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  icon: string;
}

export function CategoryBarChart({ data, currency = 'BDT' }: { data: CategoryData[]; currency?: string }) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          width={80}
          tickFormatter={(value, index) => `${data[index]?.icon || ''} ${value}`}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [formatAmount(Number(value), currency), 'Spent']}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
