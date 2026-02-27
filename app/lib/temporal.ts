const mediumDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const fullDate = new Intl.DateTimeFormat("en-US", { dateStyle: "full" });

export function formatDateMed(date: Date): string {
  return mediumDate.format(date);
}

export function formatDateHuge(date: Date): string {
  return fullDate.format(date);
}
