'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, TrendingUp, BarChart3, PieChart, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sellemond-bakery/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/sellemond-bakery/ui/select';
import { SalesOverview } from '@/components/sellemond-bakery/sales-overview';
import { ProductSales } from '@/components/sellemond-bakery/product-sales';
import { WeeklyTrends } from '@/components/sellemond-bakery/weekly-trends';
import { SeasonalAnalysis } from '@/components/sellemond-bakery/seasonal-analysis';
import { ForecastingModels } from '@/components/sellemond-bakery/forecasting-models';
import { TopProducts } from '@/components/sellemond-bakery/top-products';
import { Badge } from '@/components/sellemond-bakery/ui/badge';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Product } from '@/types';
import {
  getSalesByWeekday,
  getMonthlyComparison,
  getTopProduct,
  getTotalUnitsSold,
  getUniqueProductCount,
} from '@/lib/data-processing';
import { Skeleton } from '@/components/sellemond-bakery/ui/skeleton';

export default function Dashboard() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('https://ai.alpino-ai.com/webhook/sellemond-bakery', {
        signal: controller.signal,
        // Puedes añadir cache o headers aquí si lo necesitas
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      // Normaliza a array de Product
      const list: Product[] = Array.isArray(json) ? json : [json];
      setData(list);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productOptions = useMemo(() => {
    const seen = new Set<number>();
    return data.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data]);

  // Años presentes en los datos
  const years = Array.from(new Set(data.map((item) => new Date(item.order_date).getFullYear()))).sort((a, b) => b - a);
  const lastYear = years[0];
  const prevYear = years[1];

  const dataLastYear = lastYear ? data.filter((i) => new Date(i.order_date).getFullYear() === lastYear) : [];
  const dataPrevYear = prevYear ? data.filter((i) => new Date(i.order_date).getFullYear() === prevYear) : [];

  // Best day por año
  const bestDayData = getSalesByWeekday(dataLastYear);
  const bestDay = bestDayData.length
    ? bestDayData.reduce((max, curr) => (curr.total > max.total ? curr : max), bestDayData[0])
    : { day: '-', total: 0 };

  let prevBestDay: { day: string; total: number } | null = null;
  if (dataPrevYear.length) {
    const prevBestDayData = getSalesByWeekday(dataPrevYear);
    prevBestDay = prevBestDayData.length
      ? prevBestDayData.reduce((max, curr) => (curr.total > max.total ? curr : max), prevBestDayData[0])
      : null;
  }

  // Métricas varias
  const topProduct = getTopProduct(dataLastYear);
  const prevTopProduct = dataPrevYear.length ? getTopProduct(dataPrevYear) : null;

  const totalUnits = Number(getTotalUnitsSold(dataLastYear) || 0);
  const prevTotalUnits = dataPrevYear.length ? Number(getTotalUnitsSold(dataPrevYear) || 0) : null;

  const productTypes = Number(getUniqueProductCount(dataLastYear) || 0);
  const prevProductTypes = dataPrevYear.length ? Number(getUniqueProductCount(dataPrevYear) || 0) : null;

  const { percentChange } = getMonthlyComparison(data); // lo usas si quieres mostrar % extra

  const disabledRefresh = loading;

  return (
    <div className="flex flex-row min-h-screen bg-background">
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-20 items-center justify-between px-8">
            <div>
              <h1 className="text-xl font-bold text-black">Sellemond Bakery Dashboard</h1>
              <p className="text-gray-700">Real-time data visualization</p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <Badge variant="secondary" className="text-xs">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </Badge>
              )}
              <Button onClick={fetchData} variant="outline" size="sm" disabled={disabledRefresh} aria-label="Refresh">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Updating' : 'Update'}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {/* Banner de error si algo falló */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3">
              <strong className="mr-1">Error:</strong>
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-36 mb-2" />
                    <Skeleton className="h-4 w-44" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{totalUnits.toFixed(0)} units</div>
                    <p className="text-xs text-muted-foreground">
                      {prevTotalUnits !== null && <span>Previous year: {prevTotalUnits.toFixed(0)} units</span>}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Product Types</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-36 mb-2" />
                    <Skeleton className="h-4 w-44" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{productTypes.toFixed(0)}</div>
                    <p className="text-xs text-muted-foreground">
                      {prevProductTypes !== null && <span>Previous year: {prevProductTypes.toFixed(0)}</span>}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Day</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-36 mb-2" />
                    <Skeleton className="h-4 w-44" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{bestDay.day}</div>
                    <p className="text-xs text-muted-foreground">
                      Orders: {Number(bestDay.total || 0).toFixed(0)} (last year)
                      {prevBestDay && (
                        <span className="block mt-1">
                          Previous year: {prevBestDay.day} ({Number(prevBestDay.total || 0).toFixed(0)} orders)
                        </span>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Product</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-36 mb-2" />
                    <Skeleton className="h-4 w-44" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{topProduct?.name || '-'}</div>
                    <p className="text-xs text-muted-foreground">
                      {topProduct?.amount ? Number(topProduct.amount).toFixed(0) : '0'} units sold
                      {prevTopProduct && (
                        <span className="block mt-1">
                          Previous year: {prevTopProduct.name} ({Number(prevTopProduct.amount || 0).toFixed(0)} units)
                        </span>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Daily Sales</CardTitle>
                    <CardDescription>Summary of sales from the last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-[300px] w-full rounded-md" /> : <SalesOverview data={data} />}
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Top-Selling Products</CardTitle>
                    <CardDescription>Top 5 products of the month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-[300px] w-full rounded-md" /> : <TopProducts data={data} />}
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Analysis</CardTitle>
                    <CardDescription>Average sales per weekday</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-[300px] w-full rounded-md" /> : <WeeklyTrends data={data} />}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Analysis</CardTitle>
                    <CardDescription>Trends by time of year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-[300px] w-full rounded-md" /> : <SeasonalAnalysis data={data} />}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="w-[200px]" aria-label="Select product">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((product: Product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Product</CardTitle>
                  <CardDescription>Detailed sales analysis by type of bread</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductSales data={data} selectedProduct={selectedProduct} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Trends</CardTitle>
                    <CardDescription>Sales patterns by day of the week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-[300px] w-full rounded-md" /> : <WeeklyTrends data={data} />}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trends</CardTitle>
                    <CardDescription>Month-over-month sales evolution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SeasonalAnalysis data={data} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="forecasting" className="space-y-4">
              <div>
                <CardHeader>
                  <CardTitle>Forecasting Models</CardTitle>
                  <CardDescription>Sales predictions based on historical data</CardDescription>
                </CardHeader>
                <CardContent>
                  <ForecastingModels data={data} />
                </CardContent>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
