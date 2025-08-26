'use client';

import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Product } from '@/types';
import { getSalesByMonth } from '@/lib/data-processing';

export function SeasonalAnalysis({ data }: { data: Product[] }) {
  // Encontrar los dos últimos años disponibles
  const years = useMemo(() => {
    const allYears = Array.from(new Set(data.map((item) => new Date(item.order_date).getFullYear())));
    return allYears.sort((a, b) => b - a); // descendente
  }, [data]);

  const lastYear = years[0];
  const prevYear = years[1];

  // Helper para obtener datos mensuales de órdenes y cantidades
  function getMonthlyOrdersAndAmounts(filtered: Product[]) {
    // Inicializar 12 meses
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly = Array(12).fill(0).map((_, i) => ({
      month: months[i],
      orders: 0,
      quantity: 0,
    }));
    filtered.forEach((item) => {
      const d = new Date(item.order_date);
      const m = d.getMonth();
      monthly[m].orders += 1;
      monthly[m].quantity += Number(item.amount);
    });
    return monthly;
  }

  // Datos del último año
  const lastYearData = useMemo(() => {
    const filtered = data.filter((item) => new Date(item.order_date).getFullYear() === lastYear);
    return getMonthlyOrdersAndAmounts(filtered);
  }, [data, lastYear]);

  // Datos del año anterior
  const prevYearData = useMemo(() => {
    if (!prevYear) return Array(12).fill(0).map((_, i) => ({ month: lastYearData[i]?.month || '', orders: 0, quantity: 0 }));
    const filtered = data.filter((item) => new Date(item.order_date).getFullYear() === prevYear);
    return getMonthlyOrdersAndAmounts(filtered);
  }, [data, prevYear, lastYearData]);

  // Unir ambos años para el gráfico
  const seasonalData = lastYearData.map((item, i) => ({
    month: item.month,
    [`orders_${lastYear}`]: item.orders,
    [`orders_${prevYear ?? ''}`]: prevYearData[i]?.orders ?? 0,
    [`quantity_${lastYear}`]: item.quantity,
    [`quantity_${prevYear ?? ''}`]: prevYearData[i]?.quantity ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={seasonalData}>
        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value: any, name: any) => [value, name]} />
        {/* Orders */}
        <Line type="monotone" dataKey={`orders_${lastYear}`} stroke="#8884d8" strokeWidth={2} name={`Orders ${lastYear}`} />
        {prevYear && (
          <Line type="monotone" dataKey={`orders_${prevYear}`} stroke="#e2e34f" strokeWidth={2} name={`Orders ${prevYear}`} />
        )}
        {/* Product units */}
        <Line type="monotone" dataKey={`quantity_${lastYear}`} stroke="#4fdbe2" strokeWidth={2} name={`Units ${lastYear}`} strokeDasharray="5 5" />
        {prevYear && (
          <Line type="monotone" dataKey={`quantity_${prevYear}`} stroke="#e28a4f" strokeWidth={2} name={`Units ${prevYear}`} strokeDasharray="5 5" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
