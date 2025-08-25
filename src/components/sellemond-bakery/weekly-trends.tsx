'use client';

import { getSalesByWeekday } from '@/lib/data-processing';
import { Product } from '@/types';
import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const daysMap: Record<string, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

export function WeeklyTrends({ data }: { data: Product[] }) {
  const weeklyData = useMemo(() => {
    return getSalesByWeekday(data).map((item) => ({
      day: daysMap[item.day],
      average: item.average,
      current: item.total,
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={weeklyData}>
        <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="average" fill="#e2e34f" name="Promedio" />
        <Bar dataKey="current" fill="#8884d8" name="Actual" />
      </BarChart>
    </ResponsiveContainer>
  );
}
