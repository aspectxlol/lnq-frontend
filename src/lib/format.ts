export function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? value.replace(/\D/g, "") : String(value);
  if (!num) return "";
  return "Rp " + num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseFormattedNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}
