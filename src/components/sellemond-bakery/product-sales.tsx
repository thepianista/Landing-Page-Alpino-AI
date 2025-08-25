'use client';

import { useMemo } from 'react';
import { Product } from '@/types';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

interface ProductSalesProps {
  selectedProduct: string;
  data: Product[];
}

export function ProductSales({ selectedProduct, data }: ProductSalesProps) {
  const MAX_DAYS = 90;

  const filteredData = useMemo(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - MAX_DAYS);

    return data.filter((item) => {
      const itemDate = new Date(item.order_date);
      const matchDate = itemDate >= past && itemDate <= now;
      const matchProduct = selectedProduct === 'all' || item.id.toString() === selectedProduct;
      return matchDate && matchProduct;
    });
  }, [data, selectedProduct]);

  const processedData = useMemo(() => {
    return filteredData.reduce((acc: any[], item) => {
      const existingDay = acc.find((day) => day.date === item.order_date);

      if (existingDay) {
        existingDay[item.name] = (existingDay[item.name] || 0) + item.amount;
      } else {
        acc.push({
          date: item.order_date,
          [item.name]: item.amount,
        });
      }

      return acc;
    }, []);
  }, [filteredData]);

  const allProductNames = [...new Set(filteredData.map((item) => item.name))];

  const productNames =
    selectedProduct === 'all'
      ? allProductNames
      : allProductNames.filter((name) => {
          const productById = filteredData.find((item) => item.id.toString() === selectedProduct);
          return productById ? name === productById.name : name === selectedProduct;
        });

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff'];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={processedData}>
        <XAxis
          dataKey="date"
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
            })
          }
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value, name) => [`${value} unidades`, name]}
          labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-ES')}`}
        />
        <Legend />
        {productNames.map((product, index) => (
          <Bar key={product} dataKey={product} fill={colors[index % colors.length]} name={product} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
