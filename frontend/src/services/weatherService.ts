import type { WeatherReading } from "../types";

const API_BASE = "";


export async function fetchReadings(from: Date, to: Date): Promise<WeatherReading[]> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    limit: "1000",
  });
  const res = await fetch(`${API_BASE}/readings?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchLatest(): Promise<WeatherReading | null> {
  const to = new Date();
  const from = new Date(to.getTime() - 60 * 60 * 1000);
  const readings = await fetchReadings(from, to);
  if (readings.length === 0) return null;
  return readings[readings.length - 1];
}
