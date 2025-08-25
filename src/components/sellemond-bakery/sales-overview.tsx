'use client';

import { Product } from '@/types';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function SalesOverview({ data }: { data: Product[] }) {
  // Procesar datos para obtener totales por día
  const dailySales = data.reduce((acc: { date: string; amount: number }[], item) => {
    const existingDay = acc.find((day) => day.date === item.order_date);

    if (existingDay) {
      existingDay.amount += item.amount;
    } else {
      acc.push({
        date: item.order_date,
        amount: item.amount,
      });
    }

    return acc;
  }, []);

  // Ordenar por fecha
  dailySales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={dailySales}>
        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
