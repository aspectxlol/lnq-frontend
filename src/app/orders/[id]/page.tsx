"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useOrder, useUpdateOrder, useDeleteOrder } from "@/lib/queries";
import type { Order } from "@/lib/types";

function orderTotal(order: Order) {
  return order.items.reduce((sum, it) => sum + it.amount * (it.product?.price ?? 0), 0);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id, 10);

  const { data: order, isLoading: loading } = useOrder(id);
  const updateMutation = useUpdateOrder(id);
  const deleteMutation = useDeleteOrder();

  const [customerName, setCustomerName] = React.useState("");
  const [pickupDate, setPickupDate] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (order) {
      setCustomerName(order.customerName);
      // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
      if (order.pickupDate) {
        const date = new Date(order.pickupDate);
        const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setPickupDate(localIso);
      } else {
        setPickupDate("");
      }
    }
  }, [order]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        customerName,
        pickupDate: pickupDate ? new Date(pickupDate).toISOString() : null,
      });
      toast.success("Order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    }
  }

  async function onDelete() {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Order deleted");
      router.push("/orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Order #{id}</h1>
          <p className={styles.subtitle}>{order ? `Total: ${formatIDR(orderTotal(order))}` : "Order details"}</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={loading}>
            Delete
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={styles.form}>
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[140px] mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-[80px]" />
                <Skeleton className="h-10 w-[80px]" />
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSave}>
              <div className={styles.inputRow}>
                <Label htmlFor="customer">Customer name</Label>
                <Input id="customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
              </div>
              <div className={styles.inputRow}>
                <Label htmlFor="pickupDate">Pickup date (optional)</Label>
                <Input
                  id="pickupDate"
                  type="datetime-local"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={updateMutation.isPending}>
                  Back
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
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
                    </TableRow>
                  ))
                ) : !order || order.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No items.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.product?.name ?? `Product #${it.productId}`}</TableCell>
                      <TableCell>{it.product ? formatIDR(it.product.price) : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{it.amount}</TableCell>
                      <TableCell>{it.product ? formatIDR(it.product.price * it.amount) : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete order?"
        description="This action cannot be undone."
        confirmText="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={onDelete}
      />
    </main>
  );
}
