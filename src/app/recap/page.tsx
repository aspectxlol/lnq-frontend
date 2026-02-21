"use client";

import * as React from "react";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useOrders } from "@/lib/queries";
import type { Order } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--secondary)",
  "var(--destructive)",
];

/** Build a sorted list of {year,month} values that appear in orders (by pickupDate) */
function getAvailableMonths(orders: Order[]) {
  const set = new Set<string>();
  for (const o of orders) {
    if (!o.pickupDate) continue;
    const [y, m] = o.pickupDate.split("-").map(Number);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    set.add(key);
  }
  // Always include the current month even if no orders yet
  const now = new Date();
  set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  return Array.from(set)
    .sort()
    .reverse()
    .map((k) => {
      const [y, m] = k.split("-").map(Number);
      return { key: k, year: y!, month: m! - 1 };
    });
}

/** Filter orders to a specific calendar month by pickupDate */
function filterByMonth(orders: Order[], year: number, month: number) {
  return orders.filter((o) => {
    if (!o.pickupDate) return false;
    const [y, m] = o.pickupDate.split("-").map(Number);
    return y === year && m === month + 1;
  });
}

function orderTotal(order: Order) {
  return order.items.reduce((sum, it) => {
    if (it.itemType === "product") {
      const price = typeof it.priceAtSale === "number" ? it.priceAtSale : (it.product?.price ?? 0);
      return sum + price * it.amount;
    }
    return sum + it.customPrice;
  }, 0);
}

type ProductSummary = {
  name: string;
  qty: number;
  revenue: number;
};

type CustomSummary = {
  name: string;
  count: number;
  revenue: number;
};

function computeRecap(orders: Order[]) {
  const productMap = new Map<string, ProductSummary>();
  const customMap = new Map<string, CustomSummary>();
  let totalRevenue = 0;
  const totalOrders = orders.length;

  for (const order of orders) {
    for (const item of order.items) {
      if (item.itemType === "product") {
        const price =
          typeof item.priceAtSale === "number"
            ? item.priceAtSale
            : (item.product?.price ?? 0);
        const lineTotal = price * item.amount;
        const name = item.product?.name ?? `Product #${item.productId}`;

        const existing = productMap.get(name);
        if (existing) {
          existing.qty += item.amount;
          existing.revenue += lineTotal;
        } else {
          productMap.set(name, { name, qty: item.amount, revenue: lineTotal });
        }
        totalRevenue += lineTotal;
      } else {
        const lineTotal = item.customPrice;
        const name = item.customName;

        const existing = customMap.get(name);
        if (existing) {
          existing.count += 1;
          existing.revenue += lineTotal;
        } else {
          customMap.set(name, { name, count: 1, revenue: lineTotal });
        }
        totalRevenue += lineTotal;
      }
    }
  }

  const products = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  const customs = Array.from(customMap.values()).sort((a, b) => b.revenue - a.revenue);

  return { products, customs, totalRevenue, totalOrders };
}

/** Orders per day for bar chart */
function computeOrdersPerDay(orders: Order[], year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const map = new Map<number, { orders: number; revenue: number }>();

  for (let d = 1; d <= daysInMonth; d++) {
    map.set(d, { orders: 0, revenue: 0 });
  }

  for (const order of orders) {
    if (!order.pickupDate) continue;
    const day = Number(order.pickupDate.split("-")[2]);
    const entry = map.get(day);
    if (entry) {
      entry.orders += 1;
      entry.revenue += orderTotal(order);
    }
  }

  return Array.from(map.entries()).map(([day, data]) => ({
    day: String(day),
    orders: data.orders,
    revenue: data.revenue,
  }));
}

/** Revenue breakdown for pie chart */
function computeRevenueBreakdown(products: ProductSummary[], customs: CustomSummary[]) {
  const slices: { name: string; value: number }[] = [];

  for (const p of products) {
    slices.push({ name: p.name, value: p.revenue });
  }

  const customTotal = customs.reduce((s, c) => s + c.revenue, 0);
  if (customTotal > 0) {
    slices.push({ name: "Custom Items", value: customTotal });
  }

  return slices.sort((a, b) => b.value - a.value);
}

/** Cumulative revenue per day for line chart */
function computeCumulativeRevenue(orders: Order[], year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyRevenue = new Map<number, number>();

  for (let d = 1; d <= daysInMonth; d++) {
    dailyRevenue.set(d, 0);
  }

  for (const order of orders) {
    if (!order.pickupDate) continue;
    const day = Number(order.pickupDate.split("-")[2]);
    dailyRevenue.set(day, (dailyRevenue.get(day) ?? 0) + orderTotal(order));
  }

  let cumulative = 0;
  return Array.from(dailyRevenue.entries()).map(([day, rev]) => {
    cumulative += rev;
    return { day: String(day), revenue: cumulative };
  });
}

/** Average order value */
function avgOrderValue(orders: Order[]) {
  if (orders.length === 0) return 0;
  const total = orders.reduce((s, o) => s + orderTotal(o), 0);
  return Math.round(total / orders.length);
}

/* Custom tooltip formatter */
function idrFormatter(value: number | undefined) {
  return formatIDR(value ?? 0);
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "oklch(0.2850 0 0)",
  border: "1px solid oklch(0.3791 0 0)",
  borderRadius: 8,
  fontSize: 12,
  color: "oklch(0.9067 0 0)",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RecapPage() {
  const { data: orders = [], isLoading: loading } = useOrders();

  const availableMonths = React.useMemo(() => getAvailableMonths(orders), [orders]);

  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const selected = React.useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return { year: y!, month: m! - 1 };
  }, [selectedMonth]);

  const filtered = React.useMemo(
    () => filterByMonth(orders, selected.year, selected.month),
    [orders, selected.year, selected.month],
  );

  const recap = React.useMemo(() => computeRecap(filtered), [filtered]);

  const ordersPerDay = React.useMemo(
    () => computeOrdersPerDay(filtered, selected.year, selected.month),
    [filtered, selected.year, selected.month],
  );

  const revenueBreakdown = React.useMemo(
    () => computeRevenueBreakdown(recap.products, recap.customs),
    [recap.products, recap.customs],
  );

  const cumulativeRevenue = React.useMemo(
    () => computeCumulativeRevenue(filtered, selected.year, selected.month),
    [filtered, selected.year, selected.month],
  );

  const monthLabel = `${MONTH_NAMES[selected.month]} ${selected.year}`;

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Monthly Recap</h1>
          <p className={styles.subtitle}>Sales summary for {monthLabel}</p>
        </div>
        <div className={styles.actionsRow}>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {MONTH_NAMES[m.month]} {m.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[140px]" />
            ) : (
              <div className="text-2xl font-bold">{formatIDR(recap.totalRevenue)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[60px]" />
            ) : (
              <div className="text-2xl font-bold">{recap.totalOrders}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[60px]" />
            ) : (
              <div className="text-2xl font-bold">
                {recap.products.reduce((sum, p) => sum + p.qty, 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{formatIDR(avgOrderValue(filtered))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders per day + Revenue trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Orders per Day</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ordersPerDay} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    interval={Math.ceil(ordersPerDay.length / 10) - 1}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Bar dataKey="orders" fill="var(--chart-1)" radius={[3, 3, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumulative Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cumulativeRevenue} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    interval={Math.ceil(cumulativeRevenue.length / 10) - 1}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
                      return String(v);
                    }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => `Day ${label}`}
                    formatter={idrFormatter}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue per day + Revenue breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ordersPerDay} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    interval={Math.ceil(ordersPerDay.length / 10) - 1}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
                      return String(v);
                    }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => `Day ${label}`}
                    formatter={idrFormatter}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-2)" radius={[3, 3, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : revenueBreakdown.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No data for {monthLabel}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={false}
                    labelLine={false}
                  >
                    {revenueBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: "oklch(0.9067 0 0)" }}
                    labelStyle={{ color: "oklch(0.9067 0 0)" }}
                    formatter={(value: number | undefined, name?: string) => [formatIDR(value ?? 0), name ?? ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product quantity bar chart */}
      {!loading && recap.products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quantity Sold by Product</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, recap.products.length * 40 + 40)}>
              <BarChart
                data={recap.products}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  width={120}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="qty" fill="var(--chart-3)" radius={[0, 3, 3, 0]} name="Qty Sold" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Product breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-[160px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-[40px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-[100px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : recap.products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No products sold in {monthLabel}.
                    </TableCell>
                  </TableRow>
                ) : (
                  recap.products.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{formatIDR(p.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Custom items breakdown (only shown when present) */}
      {!loading && recap.customs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recap.customs.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right">{formatIDR(c.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
