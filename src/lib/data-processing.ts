import { Product } from '@/types';

// Función para agrupar ventas por día
export function groupSalesByDay(data: Product[]) {
  return data
    .reduce((acc: { date: string; amount: number }[], item) => {
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
    }, [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Función para agrupar ventas por producto
export function groupSalesByProduct(data: Product[]) {
  return data
    .reduce((acc: { name: string; totalAmount: number; id: number }[], item) => {
      const existingProduct = acc.find((product) => product.id === item.id);

      if (existingProduct) {
        existingProduct.totalAmount += item.amount;
      } else {
        acc.push({
          id: item.id,
          name: item.name,
          totalAmount: item.amount,
        });
      }

      return acc;
    }, [])
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

// Función para obtener ventas por día de la semana
export function getSalesByWeekday(data: Product[]) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdaySales = Array(7)
    .fill(0)
    .map((_, index) => ({
      day: weekdays[index],
      amount: 0,
      count: 0,
    }));

  data.forEach((item) => {
    const dayOfWeek = new Date(item.order_date).getDay();

    const amount = Number(item.amount);
    if (!isNaN(amount)) {
      weekdaySales[dayOfWeek].amount += amount;
      weekdaySales[dayOfWeek].count += 1;
    }
  });

  return weekdaySales.map((day) => ({
    day: day.day,
    average: day.count > 0 ? Math.round(day.amount / day.count) : 0,
    total: day.amount,
  }));
}

// Función para obtener ventas por mes
export function getSalesByMonth(data: Product[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlySales = Array(12)
    .fill(0)
    .map((_, index) => ({
      month: months[index],
      amount: 0,
    }));

  data.forEach((item) => {
    const month = new Date(item.order_date).getMonth();
    monthlySales[month].amount += item.amount;
  });

  return monthlySales;
}

// Función para obtener los productos más vendidos
export function getTopProducts(data: Product[], limit = 5) {
  const productSales = groupSalesByProduct(data);
  return productSales.slice(0, limit);
}

// Función para filtrar datos por rango de fechas
export function filterByDateRange(data: Product[], startDate: string, endDate: string) {
  return data.filter((item) => {
    const itemDate = new Date(item.order_date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return itemDate >= start && itemDate <= end;
  });
}

// Función para filtrar por producto específico
export function filterByProduct(data: Product[], productId: number) {
  return data.filter((item) => item.id === productId);
}

// Devuelve últimos N días + predicción para próximos M días
export function generateForecast(data: Product[], daysBack = 7, forecastForward = 5) {
  // Agrupar ventas por fecha
  const grouped = groupSalesByDay(data);

  // Tomar los últimos N días
  const recent = grouped.slice(-daysBack);

  // Generar datos históricos para el gráfico
  const historical = recent.map((item) => ({
    date: new Date(item.date).getDate().toString().padStart(2, '0'),
    historical: item.amount,
    predicted: null,
  }));

  // Calcular promedio simple como predicción base
  const avg = recent.reduce((sum, item) => sum + item.amount, 0) / daysBack;

  const lastDate = new Date(recent[recent.length - 1].date);

  const predicted = Array.from({ length: forecastForward }, (_, i) => {
    const future = new Date(lastDate);
    future.setDate(future.getDate() + i + 1);
    return {
      date: future.getDate().toString().padStart(2, '0'),
      historical: null,
      predicted: Math.round(avg + (Math.random() - 0.5) * avg * 0.1), // ±10% variación
    };
  });

  return [...historical, ...predicted];
}

type TopProductForecast = {
  name: string;
  prediction: string; // Ej: "+12%"
  confidence: 'High' | 'Medium' | 'Low';
};

export function generateTopProductForecasts(data: Product[], limit = 5): TopProductForecast[] {
  const top = getTopProducts(data, limit);

  return top.map((product) => {
    const growth = (Math.random() * 20 - 5).toFixed(1); // Simula crecimiento entre -5% y +15%
    const numericGrowth = parseFloat(growth);

    let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
    if (Math.abs(numericGrowth) > 10) confidence = 'High';
    else if (Math.abs(numericGrowth) < 5) confidence = 'Low';

    return {
      name: product.name,
      prediction: numericGrowth > 0 ? `+${growth}%` : `${growth}%`,
      confidence,
    };
  });
}

export function getTopProduct(data: Product[]) {
  const salesByProduct = data.reduce((acc: Record<string, { name: string; amount: number }>, item) => {
    if (!acc[item.id]) {
      acc[item.id] = { name: item.name, amount: 0 };
    }
    acc[item.id].amount += item.amount;
    return acc;
  }, {});

  const top = Object.values(salesByProduct).sort((a, b) => b.amount - a.amount)[0];

  return top;
}

export function getTotalUnitsSold(data: Product[]) {
  return data.reduce((sum, item) => {
    const amount = Number(item.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
}

export function getUniqueProductCount(data: Product[]) {
  const uniqueNames = new Set(data.map((item) => item.name));
  return uniqueNames.size;
}

export function getBestWeekday(data: Product[]) {
  const sales = getSalesByWeekday(data);
  const best = sales.sort((a, b) => b.total - a.total)[0];
  return {
    day: best.day,
    average: best.average,
  };
}

export function getMonthlyComparison(data: Product[]) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const thisYear = now.getFullYear();
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  let thisMonthTotal = 0;
  let lastMonthTotal = 0;

  data.forEach((item) => {
    const d = new Date(item.order_date);
    const m = d.getMonth();
    const y = d.getFullYear();

    if (m === thisMonth && y === thisYear) thisMonthTotal += item.amount;
    if (m === lastMonth && y === lastMonthYear) lastMonthTotal += item.amount;
  });

  const change = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  return {
    thisMonthTotal,
    lastMonthTotal,
    percentChange: change.toFixed(1),
  };
}
