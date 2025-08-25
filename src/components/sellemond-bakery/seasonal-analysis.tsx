'use client';

import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Product } from '@/types';
import { getSalesByMonth } from '@/lib/data-processing';

export function SeasonalAnalysis({ data }: { data: Product[] }) {
  const seasonalData = useMemo(() => {
    return getSalesByMonth(data).map((item) => ({
      month: item.month,
      sales: Number(item.amount),
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={seasonalData}>
        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Sales']} />
        <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} name="Sales" />
      </LineChart>
    </ResponsiveContainer>
  );
}
