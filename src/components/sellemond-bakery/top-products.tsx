'use client';

import { Progress } from '@/components/sellemond-bakery/ui/progress';
import { Product } from '@/types';

export function TopProducts({ data }: { data: Product[] }) {
  // Procesar datos para obtener totales por producto
  const productTotals = data.reduce((acc: { id: number; name: string; total: number }[], item) => {
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
