"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { toast } from "sonner";
import { Printer } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR, formatDate } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useOrder, useUpdateOrder, useDeleteOrder, usePrintOrder, useProducts } from "@/lib/queries";
import type { Product } from "@/lib/types";

type Item = { productId: number; amount: number; notes: string; priceAtSale?: number };

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id, 10);

  const { data: order, isLoading: loading } = useOrder(id);
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const updateMutation = useUpdateOrder(id);
  const deleteMutation = useDeleteOrder();
  const printMutation = usePrintOrder();

  const [customerName, setCustomerName] = React.useState("");
  const [pickupDate, setPickupDate] = React.useState("");
  const [orderNotes, setOrderNotes] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<string>("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (order) {
      setCustomerName(order.customerName);
      setPickupDate(order.pickupDate ?? "");
      setOrderNotes(order.notes ?? "");
      setItems(
        order.items.map((it) => ({
          productId: it.productId,
          amount: it.amount,
          notes: it.notes ?? "",
          priceAtSale: typeof it.priceAtSale === "number" ? it.priceAtSale : undefined,
        }))
      );
    }
  }, [order]);

  const byId = React.useMemo(() => {
    const m = new Map<number, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const productOptions = React.useMemo(
    () => products.map((p) => ({ value: String(p.id), label: `${p.name} — ${formatIDR(p.price)}` })),
    [products],
  );

  function addProduct(productId: number) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === productId);
      if (idx === -1) return [...prev, { productId, amount: 1, notes: "" }];
      const next = [...prev];
      next[idx] = { ...next[idx]!, amount: next[idx]!.amount + 1 };
      return next;
    });
  }

  function handleAddSelectedProduct() {
    if (selectedProduct) {
      addProduct(Number.parseInt(selectedProduct, 10));
      setSelectedProduct("");
    }
  }

  function setAmount(productId: number, amount: number) {
    setItems((prev) =>
      prev
        .map((it) => (it.productId === productId ? { ...it, amount } : it))
        .filter((it) => it.amount > 0),
    );
  }

  function setItemNotes(productId: number, notes: string) {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, notes } : it)),
    );
  }

  const total = items.reduce((sum, it) => {
    const price = typeof it.priceAtSale === "number" ? it.priceAtSale : (byId.get(it.productId)?.price ?? 0);
    return sum + price * it.amount;
  }, 0);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        customerName,
        pickupDate: pickupDate || null,
        notes: orderNotes || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          amount: it.amount,
          notes: it.notes || undefined,
          priceAtSale: typeof it.priceAtSale === "number" ? it.priceAtSale : undefined,
        })),
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

  async function onPrint() {
    try {
      const result = await printMutation.mutateAsync(id);
      if (result.printed) {
        toast.success("Receipt printed successfully");
      } else {
        toast.error("Failed to print receipt");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to print receipt");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Order #{id}</h1>
          <p className={styles.subtitle}>
            {order ? (
              <>
                {order.pickupDate && (
                  <>
                    Pickup: {formatDate(order.pickupDate)} • {" "}
                  </>
                )}
                Total: {formatIDR(total)}
              </>
            ) : (
              "Order details"
            )}
          </p>
        </div>
        <div className={styles.actionsRow}>
          <Button
            variant="outline"
            onClick={onPrint}
            disabled={loading || printMutation.isPending}
          >
            <Printer className="h-4 w-4 mr-2" />
            {printMutation.isPending ? "Printing…" : "Print Receipt"}
          </Button>
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
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-20 w-full" />
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
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
                <div className={styles.inputRow}>
                  <Label htmlFor="orderNotes">Order notes (optional)</Label>
                  <Textarea
                    id="orderNotes"
                    placeholder="e.g., Call when ready, Rush order"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
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
          {loading ? (
            <div className={styles.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
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
                        <Skeleton className="h-5 w-[120px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-[100px]" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className={styles.form}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={productOptions}
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    placeholder="Select a product..."
                    searchPlaceholder="Search products..."
                    emptyText="No products found."
                    disabled={loadingProducts}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddSelectedProduct}
                  disabled={!selectedProduct || loadingProducts}
                >
                  Add
                </Button>
              </div>

              <div className={styles.tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={5} className="text-muted-foreground">
                            No items yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                          items.map((it) => {
                            const p = byId.get(it.productId);
                            const price = typeof it.priceAtSale === "number" ? it.priceAtSale : (p?.price ?? 0);
                            return (
                              <TableRow key={it.productId}>
                                <TableCell className="font-medium">{p ? p.name : `#${it.productId}`}</TableCell>
                                <TableCell>
                                  <Input
                                    inputMode="numeric"
                                    value={typeof it.priceAtSale === "number" ? formatIDR(it.priceAtSale) : (p ? formatIDR(p.price) : "")}
                                    min={0}
                                    onChange={(e) => {
                                      // Remove non-digit characters except comma and dot
                                      const raw = e.target.value.replace(/[^\d.,]/g, "");
                                      // Remove thousands separator and parse
                                      const value = Number.parseInt(raw.replace(/[^\d]/g, "") || "0", 10);
                                      setItems((prev) => prev.map((item) => item.productId === it.productId ? { ...item, priceAtSale: value } : item));
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="w-[140px]">
                                  <Input
                                    inputMode="numeric"
                                    value={String(it.amount)}
                                    onChange={(e) =>
                                      setAmount(
                                        it.productId,
                                        Number.parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10),
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell className="w-[200px]">
                                  <Input
                                    placeholder="e.g., Extra hot, No sugar"
                                    value={it.notes}
                                    onChange={(e) => setItemNotes(it.productId, e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>{formatIDR(price * it.amount)}</TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">{formatIDR(total)}</div>
              </div>
            </div>
          )}
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
