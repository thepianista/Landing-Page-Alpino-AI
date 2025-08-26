'use client';

import { Progress } from '@/components/sellemond-bakery/ui/progress';
import { Product } from '@/types';

export function TopProducts({ data }: { data: Product[] }) {
  // Encontrar el mes más reciente con datos
  let targetMonth: number | null = null;
  let targetYear: number | null = null;
  if (data.length > 0) {
    // Ordenar fechas descendente
    const sorted = [...data].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    // Buscar el mes más reciente con datos
    const monthsWithData: { year: number; month: number }[] = [];
    sorted.forEach((item) => {
      const d = new Date(item.order_date);
      const year = d.getFullYear();
      const month = d.getMonth();
      if (!monthsWithData.some((m) => m.year === year && m.month === month)) {
        monthsWithData.push({ year, month });
      }
    });
    // Buscar el primer mes con datos (más reciente)
    for (let i = 0; i < monthsWithData.length; i++) {
      const { year, month } = monthsWithData[i];
      const filtered = data.filter((item) => {
        const d = new Date(item.order_date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      if (filtered.length > 0) {
        targetMonth = month;
        targetYear = year;
        break;
      }
    }
  }

  // Filtrar datos del mes objetivo
  const filteredData = (targetMonth !== null && targetYear !== null)
    ? data.filter((item) => {
        const d = new Date(item.order_date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      })
    : [];

  // Procesar datos para obtener totales por producto
  const productTotals = filteredData.reduce((acc: { id: number; name: string; total: number }[], item) => {
    const existingProduct = acc.find((product) => product.id === item.id);
    if (existingProduct) {
      existingProduct.total += item.amount;
    } else {
      acc.push({
        id: item.id,
        name: item.name,
        total: item.amount,
      });
    }
    return acc;
  }, []);

  // Ordenar por total descendente y tomar los top 5
  const topProducts = productTotals.sort((a, b) => b.total - a.total).slice(0, 5);

  // Calcular porcentajes basados en el producto más vendido
  const maxSales = topProducts[0]?.total || 1;

  return (
    <div className="space-y-4">
      {topProducts.map((product, index) => {
        const percentage = (product.total / maxSales) * 100;
        return (
          <div key={product.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{product.name}</span>
              <span className="text-muted-foreground">{product.total} unidades</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}
