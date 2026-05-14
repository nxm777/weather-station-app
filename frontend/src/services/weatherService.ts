import type { WeatherReading } from "../types";

//const API_BASE = "http://127.0.0.1:3000";
const API_BASE = "";

//  Mock do usuniecia
function generateMockReadings(from: Date, to: Date): WeatherReading[] {
  const readings: WeatherReading[] = [];
  const step = 10 * 60 * 1000; 
  let id = 1;
  for (let t = from.getTime(); t <= to.getTime(); t += step) {
    readings.push({
      id: id++,
      temperature: 18 + Math.sin(t / 3_600_000) * 6 + (Math.random() - 0.5) * 1.5,
      humidity: 55 + Math.cos(t / 7_200_000) * 15 + (Math.random() - 0.5) * 3,
      pressure: 1013 + Math.sin(t / 10_800_000) * 10 + (Math.random() - 0.5) * 2,
      recorded_at: new Date(t).toISOString(),
    });
  }
  return readings;
}



export async function fetchReadings(from: Date, to: Date): Promise<WeatherReading[]> {
  //  mock - zakomentuj
  return generateMockReadings(from, to);
  // backend - odkomentuj
  // const params = new URLSearchParams({
  //   from: from.toISOString(),
  //   to: to.toISOString(),
  //   limit: "1000",
  // });
  // const res = await fetch(`${API_BASE}/readings?${params}`);
  // if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // return res.json();
}

//do zakomentowania
export async function fetchLatest(): Promise<WeatherReading | null> {
  // mock 
  const to = new Date();
  const from = new Date(to.getTime() - 60 * 60 * 1000);
  const data = await fetchReadings(from, to);
  return data.length > 0 ? data[data.length - 1] : null;
  // backend
  // const res = await fetch(`${API_BASE}/readings/latest`);
  // if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // return res.json();
}

//do odkomentowania
/*export async function fetchLatest(): Promise<WeatherReading | null> {
  const to = new Date();
  const from = new Date(to.getTime() - 60 * 60 * 1000); // ostatnia godzina
  const readings = await fetchReadings(from, to);
  if (readings.length === 0) return null;
  return readings[readings.length - 1]; // ostatni = najnowszy
}*/