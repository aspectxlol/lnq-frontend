"use client";

import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatIDR, formatDate } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useOrders, useDeleteOrder } from "@/lib/queries";
import type { Order } from "@/lib/types";

type ViewMode = "list" | "calendar";

function orderTotal(order: Order) {
  return order.items.reduce((sum, it) => {
    const price = typeof it.priceAtSale === "number" ? it.priceAtSale : (it.product?.price ?? 0);
    return sum + it.amount * price;
  }, 0);
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  // Add empty slots for days before the first of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function OrdersPage() {
  const { data: orders = [], isLoading: loading } = useOrders();
  const deleteMutation = useDeleteOrder();
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Group orders by pickup date for calendar view
  const ordersByDate = React.useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (order.pickupDate) {
        // pickupDate is now a date-only string (YYYY-MM-DD)
        const key = order.pickupDate;
        const existing = map.get(key) || [];
        existing.push(order);
        map.set(key, existing);
      }
    }
    return map;
  }, [orders]);

  const calendarDays = React.useMemo(
    () => getMonthDays(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  async function onDeleteConfirm() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Order deleted");
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete order");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>Create and review sales orders.</p>
        </div>
        <div className={styles.actionsRow}>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              aria-label="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/orders/new">New order</Link>
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-5 w-[60px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-[150px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-[40px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-[80px] ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          <Link href={`/orders/${o.id}`} className="hover:underline">
                            #{o.id}
                          </Link>
                        </TableCell>
                        <TableCell>{o.customerName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {o.pickupDate ? formatDate(o.pickupDate) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{o.items.length}</TableCell>
                        <TableCell>{formatIDR(orderTotal(o))}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/orders/${o.id}`}>View</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteId(o.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pickup Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {monthName}
                </span>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
                {calendarDays.map((date, i) => {
                  if (!date) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }
                  const dateKey = formatDateKey(date);
                  const dayOrders = ordersByDate.get(dateKey) || [];
                  const isToday = formatDateKey(new Date()) === dateKey;

                  return (
                    <div
                      key={dateKey}
                      className={`aspect-square border rounded-md p-1 flex flex-col overflow-hidden ${
                        isToday ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isToday ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex-1 overflow-y-auto space-y-0.5 mt-0.5">
                        {dayOrders.slice(0, 3).map((order) => (
                          <Link
                            key={order.id}
                            href={`/orders/${order.id}`}
                            className="block text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 truncate"
                          >
                            {order.customerName}
                          </Link>
                        ))}
                        {dayOrders.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayOrders.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => setDeleteId(o ? deleteId : null)}
        title="Delete order?"
        description="This action cannot be undone."
        confirmText="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={onDeleteConfirm}
      />
    </main>
  );
}
