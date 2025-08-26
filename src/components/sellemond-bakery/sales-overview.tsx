'use client';

import { Product } from '@/types';
import { groupSalesByDay } from '@/lib/data-processing';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export function SalesOverview({ data }: { data: Product[] }) {
  // Filtrar solo ventas del año 2025
  const data2025 = data.filter((item) => {
    const year = new Date(item.order_date).getFullYear();
    return year === 2025;
  });

  // Obtener los meses presentes en los datos de 2025
  const monthsPresent = Array.from(
    new Set(data2025.map((item) => new Date(item.order_date).getMonth()))
  ).sort((a, b) => b - a); // Orden descendente

  // Buscar el mes anterior disponible
  let targetMonth = null;
  if (monthsPresent.length > 0) {
    // Mes anterior al actual (agosto = 7, anterior = 6)
    const now = new Date();
    const prevMonth = now.getMonth() - 1;
    if (monthsPresent.includes(prevMonth)) {
      targetMonth = prevMonth;
    } else {
      // Si no hay datos del mes anterior, buscar el anterior a ese
      const prevPrevMonth = prevMonth - 1;
      if (monthsPresent.includes(prevPrevMonth)) {
        targetMonth = prevPrevMonth;
      } else {
        // Si no hay, tomar el mes más reciente disponible
        targetMonth = monthsPresent[0];
      }
    }
  }

  // Filtrar los datos del mes objetivo
  const filteredData = data2025.filter((item) => {
    const d = new Date(item.order_date);
    return d.getMonth() === targetMonth;
  });

  // Agrupar ventas por día usando la función utilitaria
  const dailySales = groupSalesByDay(filteredData);

  // Formatear fechas para el eje X como dd/MM
  const dailySalesFormatted = dailySales.map((item) => {
    const d = new Date(item.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return { ...item, date: `${day}/${month}` };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dailySalesFormatted}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
