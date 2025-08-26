'use client';

import { useMemo } from 'react';
import { Product } from '@/types';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';


// Función para obtener el número de semana del año
function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  // 0 = Sunday, 1 = Monday, ...
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function WeeklyTrends({ data }: { data: Product[] }) {
  // Encontrar el último año disponible en los datos
  const lastYear = useMemo(() => {
    if (!data.length) return null;
    return Math.max(...data.map((item) => new Date(item.order_date).getFullYear()));
  }, [data]);

  // Filtrar datos solo del último año
  const dataLastYear = useMemo(() => {
    if (!lastYear) return [];
    return data.filter((item) => new Date(item.order_date).getFullYear() === lastYear);
  }, [data, lastYear]);


    // Agrupar ventas por semana del año y mostrar el rango de fechas de cada semana como etiqueta
    const salesPerWeek = useMemo(() => {
      // Map: weekNumber -> { total, minDate, maxDate }
      const weekMap: Record<number, { total: number; minDate: Date | null; maxDate: Date | null }> = {};
      dataLastYear.forEach((item) => {
        const date = new Date(item.order_date);
        const week = getWeekNumber(date);
        if (!weekMap[week]) {
          weekMap[week] = { total: 0, minDate: date, maxDate: date };
        }
        weekMap[week].total += item.amount;
        // Guardar la fecha más temprana y más tardía de la semana
        if (date < (weekMap[week].minDate as Date)) {
          weekMap[week].minDate = date;
        }
        if (date > (weekMap[week].maxDate as Date)) {
          weekMap[week].maxDate = date;
        }
      });
      // Convertir a array ordenado por semana y formatear la fecha como dd/MM a dd/MM
      return Object.entries(weekMap)
        .map(([week, { total, minDate, maxDate }]) => {
          let label = '';
          if (minDate && maxDate) {
            const day1 = String(minDate.getDate()).padStart(2, '0');
            const month1 = String(minDate.getMonth() + 1).padStart(2, '0');
            const day2 = String(maxDate.getDate()).padStart(2, '0');
            const month2 = String(maxDate.getMonth() + 1).padStart(2, '0');
            label = `${day1}/${month1} to ${day2}/${month2}`;
          } else {
            label = `W${week}`;
          }
          return {
            week: label,
            total: total,
          };
        })
        .sort((a, b) => {
          // Ordenar por fecha real (usar primer día del rango)
          const [dA, mA] = a.week.split(' ')[0].split('/').map(Number);
          const [dB, mB] = b.week.split(' ')[0].split('/').map(Number);
          return mA !== mB ? mA - mB : dA - dB;
        });
    }, [dataLastYear]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={salesPerWeek}>
        <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip />
        <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" name="Sales per week" fillOpacity={0.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
