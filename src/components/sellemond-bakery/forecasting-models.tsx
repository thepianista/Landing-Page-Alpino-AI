'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import { Badge } from '@/components/sellemond-bakery/ui/badge';
import { Product } from '@/types';
import { generateForecast, generateTopProductForecasts } from '@/lib/data-processing';
import { useMemo } from 'react';

export function ForecastingModels({ data }: { data: Product[] }) {
  const forecastData = useMemo(() => generateForecast(data), [data]);
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
              <LineChart data={forecastData}>
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Historical"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Prediction"
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
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">Trust: {product.confidence}</p>
                  </div>
                  <Badge variant={product.prediction.startsWith('+') ? 'default' : 'outline'}>
                    {product.prediction}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
