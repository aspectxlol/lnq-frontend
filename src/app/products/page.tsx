"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { toast } from "sonner";
import { ArrowDown, ArrowUp, LayoutGrid, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatIDR } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useProducts, useDeleteProduct } from "@/lib/queries";
import { buildBackendUrl } from "@/lib/backend";
import type { Product } from "@/lib/types";

type ViewMode = "list" | "card";
type SortField = "name" | "price" | "created";
type SortDir = "asc" | "desc";

function sortProducts(products: Product[], field: SortField, dir: SortDir) {
  const sorted = [...products];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "price":
        cmp = a.price - b.price;
        break;
      case "created":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export default function ProductsPage() {
  const { data: products = [], isLoading: loading } = useProducts();
  const deleteMutation = useDeleteProduct();
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  // Filters & sort
  const [search, setSearch] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "created" ? "desc" : "asc");
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc"
      ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />;
  };

  const filteredProducts = React.useMemo(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return sortProducts(result, sortField, sortDir);
  }, [products, search, sortField, sortDir]);

  async function onDeleteConfirm() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Product deleted");
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete product");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>Create and manage items for sale.</p>
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
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/products/new">New product</Link>
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Catalog</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={styles.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      Name<SortIcon field="name" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("price")}>
                      Price<SortIcon field="price" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created")}>
                      Created<SortIcon field="created" />
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-5 w-[200px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-[150px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-[80px] ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        {products.length === 0 ? "No products yet." : "No products match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <Link href={`/products/${p.id}`} className="hover:underline">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>{formatIDR(p.price)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(p.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/products/${p.id}`}>Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteId(p.id)}>Delete</DropdownMenuItem>
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
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={`${sortField}-${sortDir}`}
              onValueChange={(v) => {
                const [f, d] = v.split("-") as [SortField, SortDir];
                setSortField(f);
                setSortDir(d);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="price-asc">Price low–high</SelectItem>
                <SelectItem value="price-desc">Price high–low</SelectItem>
                <SelectItem value="created-desc">Newest first</SelectItem>
                <SelectItem value="created-asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : products.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                No products yet.
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                No products match your search.
              </CardContent>
            </Card>
          ) : (
            filteredProducts.map((p) => (
              <Card key={p.id} className="overflow-hidden group">
                <Link href={`/products/${p.id}`} className="block">
                  <div className="aspect-square relative bg-muted">
                    {p.imageId ? (
                      <Image
                        src={buildBackendUrl(`/api/images/${p.imageId}`)}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-4xl">📦</span>
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${p.id}`} className="hover:underline">
                        <h3 className="font-medium truncate">{p.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">{formatIDR(p.price)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${p.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(p.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => setDeleteId(o ? deleteId : null)}
        title="Delete product?"
        description="This action cannot be undone."
        confirmText="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={onDeleteConfirm}
      />
    </main>
  );
}
