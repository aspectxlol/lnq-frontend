"use client";

import * as React from "react";

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
  let totalOrders = orders.length;

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
      <div className={styles.grid3}>
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
      </div>

      {/* Product breakdown */}
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
