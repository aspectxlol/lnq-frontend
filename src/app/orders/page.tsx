"use client";

import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";
import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatIDR, formatDate } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useOrders, useDeleteOrder } from "@/lib/queries";
import type { Order } from "@/lib/types";

type ViewMode = "list" | "calendar";
type SortField = "id" | "customer" | "pickupDate" | "total";
type SortDir = "asc" | "desc";

function orderTotal(order: Order) {
  return order.items.reduce((sum, it) => {
    if (it.itemType === 'product') {
      const price = typeof it.priceAtSale === "number" ? it.priceAtSale : (it.product?.price ?? 0);
      return sum + price * it.amount;
    } else {
      return sum + it.customPrice;
    }
  }, 0);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isPastOrder(order: Order) {
  if (!order.pickupDate) return false;
  return order.pickupDate < todayKey();
}

function sortOrders(orders: Order[], field: SortField, dir: SortDir) {
  const sorted = [...orders];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "id":
        cmp = a.id - b.id;
        break;
      case "customer":
        cmp = a.customerName.localeCompare(b.customerName);
        break;
      case "pickupDate":
        cmp = (a.pickupDate ?? "").localeCompare(b.pickupDate ?? "");
        break;
      case "total":
        cmp = orderTotal(a) - orderTotal(b);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
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

  // Filters & sort
  const [search, setSearch] = React.useState("");
  const [hidePast, setHidePast] = React.useState(true);
  const [sortField, setSortField] = React.useState<SortField>("id");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc"
      ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />;
  };

  const filteredOrders = React.useMemo(() => {
    let result = orders;

    // Hide past orders
    if (hidePast) {
      result = result.filter((o) => !isPastOrder(o));
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.customerName.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o.items.some((it) =>
          it.itemType === "product"
            ? (it.product?.name ?? "").toLowerCase().includes(q)
            : it.customName.toLowerCase().includes(q)
        )
      );
    }

    // Sort
    return sortOrders(result, sortField, sortDir);
  }, [orders, hidePast, search, sortField, sortDir]);

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>History</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 w-full sm:w-[200px]"
                  />
                </div>
                <Select value={hidePast ? "upcoming" : "all"} onValueChange={(v) => setHidePast(v === "upcoming")}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming only</SelectItem>
                    <SelectItem value="all">All orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={styles.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("id")}>
                      ID<SortIcon field="id" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("customer")}>
                      Customer<SortIcon field="customer" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("pickupDate")}>
                      Pickup Date<SortIcon field="pickupDate" />
                    </TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("total")}>
                      Total<SortIcon field="total" />
                    </TableHead>
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
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o) => (
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
                        <TableCell className="text-muted-foreground">
                          {o.items.map((it) =>
                            it.itemType === 'product'
                              ? (it.product?.name || `#${it.productId}`)
                              : it.customName
                          ).join(", ")}
                        </TableCell>
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
                    className="text-center text-xs font-medium text-muted-foreground py-2 border-b"
                  >
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="min-h-[90px] rounded-md" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-muted-foreground py-2 bg-muted/50"
                  >
                    {day}
                  </div>
                ))}
                {calendarDays.map((date, i) => {
                  if (!date) {
                    return <div key={`empty-${i}`} className="min-h-[90px] bg-muted/20" />;
                  }
                  const dateKey = formatDateKey(date);
                  const dayOrders = ordersByDate.get(dateKey) || [];
                  const isToday = formatDateKey(new Date()) === dateKey;
                  const isPast = dateKey < todayKey();

                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[90px] p-1.5 flex flex-col bg-background transition-colors ${
                        isToday
                          ? "bg-primary/5 ring-2 ring-inset ring-primary/40"
                          : isPast
                            ? "bg-muted/10"
                            : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium leading-none ${
                            isToday
                              ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                              : isPast
                                ? "text-muted-foreground/60"
                                : "text-foreground"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {dayOrders.length > 0 && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        {dayOrders.map((order) => (
                          <Link
                            key={order.id}
                            href={`/orders/${order.id}`}
                            className="block text-xs px-1.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/10 group"
                          >
                            <span className="font-medium block truncate group-hover:underline">
                              {order.customerName}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {formatIDR(orderTotal(order))}
                            </span>
                          </Link>
                        ))}
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
