import type { WeatherReading } from "../types";

export function formatTime(iso: string, range: string): string {
  const d = new Date(iso);
  if (range === "24h") {
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export function avg(arr: number[]): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum / arr.length;
}

export function exportCSV(readings: WeatherReading[], from: Date, to: Date): void {
  const dateStr = from.toISOString().slice(0, 10) + "_" + to.toISOString().slice(0, 10);
  let csv = "id,temperature,humidity,pressure,recorded_at\n";
  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    csv += `${r.id},${r.temperature},${r.humidity},${r.pressure},${r.recorded_at}\n`;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weather_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(readings: WeatherReading[], from: Date, to: Date): void {
  const dateStr = from.toISOString().slice(0, 10) + "_" + to.toISOString().slice(0, 10);
  const json = JSON.stringify(readings, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weather_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
