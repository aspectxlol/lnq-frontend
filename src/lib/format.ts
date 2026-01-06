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

export function formatDate(dateString: string): string {
  // dateString is in YYYY-MM-DD format
  const [year, month, day] = dateString.split("-").map(Number);

  // Use UTC to avoid timezone issues
  const targetDate = new Date(Date.UTC(year!, month! - 1, day!));
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const diffTime = targetDate.getTime() - todayUTC.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[targetDate.getUTCDay()];

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) return `This ${dayName}`;
  if (diffDays > 6 && diffDays <= 13) return `Next ${dayName}`;

  // For dates further out, show DD/MM/YYYY
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
