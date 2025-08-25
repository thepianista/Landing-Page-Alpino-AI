'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Home, TrendingUp, BarChart3, PieChart, HomeIcon, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sellemond-bakery/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/sellemond-bakery/ui/select';
import { SalesOverview } from '@/components/sellemond-bakery/sales-overview';
import { ProductSales } from '@/components/sellemond-bakery/product-sales';
import { WeeklyTrends } from '@/components/sellemond-bakery/weekly-trends';
import { SeasonalAnalysis } from '@/components/sellemond-bakery/seasonal-analysis';
import { ForecastingModels } from '@/components/sellemond-bakery/forecasting-models';
import { TopProducts } from '@/components/sellemond-bakery/top-products';
import Logo from '@/public/Logo.png';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/sellemond-bakery/ui/badge';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Product } from '@/types';
import {
  getBestWeekday,
  getMonthlyComparison,
  getTopProduct,
  getTotalUnitsSold,
  getUniqueProductCount,
} from '@/lib/data-processing';
import { Skeleton } from '@/components/sellemond-bakery/ui/skeleton';

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    id: 'dashboard',
  },
  {
    title: 'Análisis de Ventas',
    icon: BarChart3,
    id: 'sales',
  },
  {
    title: 'Tendencias',
    icon: TrendingUp,
    id: 'trends',
  },
  {
    title: 'Forecasting',
    icon: PieChart,
    id: 'forecasting',
  },
];

function AppSidebar() {
  return (
    <aside className="w-64 sticky top-0 max-h-screen overflow-y-auto bg-muted border-r flex flex-col">
      <div className="border-b py-2 flex justify-center">
        <Image src={Logo} alt="logo image" width={178} />
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {/* {menuItems.map((item) => (
          <button
            key={item.id}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-md text-left hover:bg-accent hover:text-accent-foreground transition"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.title}</span>
          </button>
        ))} */}
      </nav>
      <div className="border-t p-4 hover:bg-black/10 transition">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium">
          <LogOut className="h-4 w-4" />
          <span>Salir</span>
        </Link>
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://ai.alpino-ai.com/webhook/sellemond-bakery');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const processedData = Array.isArray(result) ? result : [result];
      setData(processedData);
      setLastUpdated(new Date());
      console.log(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
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

  const topProduct = getTopProduct(data);
  const totalUnits = getTotalUnitsSold(data).toFixed(0);
  const productTypes = getUniqueProductCount(data);
  const bestDay = getBestWeekday(data);
  const { percentChange } = getMonthlyComparison(data);

  return (
    <div className="flex flex-row min-h-screen bg-background">
      <AppSidebar />
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
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Update
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">
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
                    <div className="text-2xl font-bold">{totalUnits.toLocaleString()} units</div>
                    <p className="text-xs text-muted-foreground">+{percentChange}% from last month</p>
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
                    <div className="text-2xl font-bold">{productTypes}</div>
                    <p className="text-xs text-muted-foreground">
                      +{(productTypes * 0.08).toFixed(1)}% from last month
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
                    <p className="text-xs text-muted-foreground">Average: €{bestDay.average}/day</p>
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
                    <div className="text-2xl font-bold">{topProduct?.name || ""}</div>
                    <p className="text-xs text-muted-foreground">{topProduct?.amount || ""} units sold</p>
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
                  <SelectTrigger className="w-[200px]">
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
