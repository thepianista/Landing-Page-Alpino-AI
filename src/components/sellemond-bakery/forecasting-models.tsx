'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import { Badge } from '@/components/sellemond-bakery/ui/badge';
import { Product } from '@/types';
import { groupSalesByDay, generateTopProductForecasts } from '@/lib/data-processing';
import { useMemo } from 'react';

export function ForecastingModels({ data }: { data: Product[] }) {
  // Tomar los últimos 7 días y predecir los próximos 7 días
  const forecastData = useMemo(() => {
    // Agrupar ventas por día y ordenar
    const grouped = groupSalesByDay(data);
    if (!grouped.length) return [];
    // Tomar los últimos 7 días históricos
    const last7 = grouped.slice(-7);
    // Calcular promedio móvil simple
    const avg = last7.reduce((sum, item) => sum + item.amount, 0) / last7.length;
    // Generar predicción para los próximos 7 días a partir de hoy
    const today = new Date();
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const future = new Date(today);
      future.setDate(future.getDate() + i);
      return {
        date: `${String(future.getDate()).padStart(2, '0')}/${String(future.getMonth() + 1).padStart(2, '0')}`,
        historical: null,
        predicted: Math.round(avg + (Math.random() - 0.5) * avg * 0.15), // ±15% variación
      };
    });
    // Formatear fechas históricas como dd/MM
    const historical = last7.map((item) => {
      const d = new Date(item.date);
      return {
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        historical: item.amount,
        predicted: null,
      };
    });
    return [...historical, ...forecast];
  }, [data]);
  // Calcular ventas promedio por producto para estimar unidades
  const productAverages = useMemo(() => {
    const grouped: Record<string, { name: string; total: number; count: number }> = {};
    data.forEach((item) => {
      if (!grouped[item.id]) grouped[item.id] = { name: item.name, total: 0, count: 0 };
      grouped[item.id].total += item.amount;
      grouped[item.id].count += 1;
    });
    return grouped;
  }, [data]);

  const topProducts = useMemo(() => generateTopProductForecasts(data), [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Forecast</CardTitle>
            <CardDescription>Next 7 days based on historical trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any, name: string) => [value, name === 'historical' ? 'Historical' : 'Prediction']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Historical"
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Prediction"
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Predictions</CardTitle>
            <CardDescription>Expected changes for the upcoming week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => {
                // Unidades estimadas
                const avgUnits = productAverages && productAverages[product.name]
                  ? Math.round(productAverages[product.name].total / productAverages[product.name].count)
                  : null;
                // Extraer porcentaje numérico
                const percent = parseFloat(product.prediction.replace('%', ''));
                // Calcular unidades estimadas para la predicción
                const units = avgUnits ? Math.round(avgUnits * (1 + percent / 100)) : null;
                // Flecha
                const arrow = percent > 0 ? '↑' : percent < 0 ? '↓' : '';
                // Badge color según confianza
                let badgeColor: 'default' | 'outline' | 'destructive' | 'secondary' = 'default';
                if (product.confidence === 'High') badgeColor = 'default';
                else if (product.confidence === 'Medium') badgeColor = 'secondary';
                else if (product.confidence === 'Low') badgeColor = 'destructive';
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Trust: {product.confidence}
                        {units !== null && (
                          <span className="ml-2 text-xs text-gray-500">Est. units: {units}</span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={badgeColor}
                      className={`flex items-center gap-1${badgeColor === 'destructive' ? ' text-white' : ''}`}
                    >
                      {arrow} {product.prediction}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
