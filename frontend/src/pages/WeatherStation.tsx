import { useState, useEffect } from "react";
import type { WeatherReading } from "../types";
import { fetchReadings, fetchLatest } from "../services/weatherService";
import { StatCard } from "../components/StatCard";
import { MetricChart } from "../components/MetricChart";
import { avg, formatTime, exportCSV, exportJSON } from "../utils/helpers";

const RANGES = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7 dni", hours: 168 },
  { key: "30d", label: "30 dni", hours: 720 },
];

export default function WeatherStation() {
  const [latest, setLatest] = useState<WeatherReading | null | undefined>(undefined);
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [range, setRange] = useState("24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // daty od/do
  function getRangeDates(): [Date, Date] {
    const to = new Date();
    const selectedRange = RANGES.find((r) => r.key === range)!;
    const from = new Date(to.getTime() - selectedRange.hours * 60 * 60 * 1000);
    return [from, to];
  }

  // pobieranie danych
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [from, to] = getRangeDates();
      const latestData = await fetchLatest();
      const rangeData = await fetchReadings(from, to);
      setLatest(latestData);
      setReadings(rangeData);
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    }
    setLoading(false);
  }

  // załadowanie danych i odswiezanie co minute
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10_000);
    return () => clearInterval(interval);
  }, [range]);

  const [from, to] = getRangeDates();

  // dane do wykresów
  const chartData = readings.map((r) => ({
    time: formatTime(r.recorded_at, range),
    temperature: parseFloat(r.temperature.toFixed(1)),
    humidity: parseFloat(r.humidity.toFixed(1)),
    pressure: parseFloat(r.pressure.toFixed(1)),
  }));

  // tablice do liczenia statystyk
  const temps = readings.map((r) => r.temperature);
  const hums = readings.map((r) => r.humidity);
  const pressures = readings.map((r) => r.pressure ?? 0).filter(v => v > 0);

  const tempMin = temps.length ? Math.floor(Math.min(...temps)) - 2 : 0;
  const tempMax = temps.length ? Math.ceil(Math.max(...temps)) + 2 : 40;
  const humMin = Math.max(0, hums.length ? Math.floor(Math.min(...hums)) - 5 : 0);
  const humMax = Math.min(100, hums.length ? Math.ceil(Math.max(...hums)) + 5 : 100);
  const presMin = pressures.length ? Math.floor(Math.min(...pressures)) - 2 : 970;
  const presMax = pressures.length ? Math.ceil(Math.max(...pressures)) + 2 : 1040;

  function getLatestValue(field: "temperature" | "humidity"  | "pressure" ): string | null {
    if (latest === undefined) return null; 
    if (latest === null) return "–";      
    return (latest[field] as number).toFixed(1);
  }

  const isEmpty = readings.length === 0;

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] p-8 box-border">

      {/* nagłówek */}
      <header className="mb-8">
        <h1 className="text-5xl font-bold text-white m-0 tracking-tight">
          Stacja pogodowa
        </h1>
      </header>

      {/* błąd połączenia */}
      {error && (
        <div className="bg-[#1a0a0a] border border-[#5a1a1a] text-red-400 px-3.5 py-2.5 text-[13px] mb-6 rounded">
          {error}
        </div>
      )}

      {/* karty z aktualnymi wartościami */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Temperatura" value={getLatestValue("temperature")} unit="°C" accentColor="#D85A30" />
        <StatCard label="Wilgotność" value={getLatestValue("humidity")} unit="%" accentColor="#1D9E75" />
        <StatCard label="Ciśnienie" value={getLatestValue("pressure")} unit="hPa" accentColor="#378ADD" />
        
      </div>

      {/* wybór zakresu */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[30px] text-[#666]">Historia pomiarów</span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 text-[16px] rounded border cursor-pointer transition-colors ${
                range === r.key
                  ? "bg-[#222] border-[#444] text-white"
                  : "bg-transparent border-transparent text-[#555] hover:text-[#888]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* wykresy */}
      <div className="flex flex-col gap-3 mb-8">
        <MetricChart
          title="Temperatura"
          unit=" °C"
          dataKey="temperature"
          color="#D85A30"
          data={chartData}
          min={tempMin}
          max={tempMax}
          empty={isEmpty}
          loading={loading}
          stats={
            temps.length > 0
              ? [
                  { label: "średnia", value: `${avg(temps).toFixed(1)} °C` },
                  { label: "min", value: `${Math.min(...temps).toFixed(1)} °C` },
                  { label: "max", value: `${Math.max(...temps).toFixed(1)} °C` },
                ]
              : []
          }
        />
        <MetricChart
          title="Wilgotność"
          unit=" %"
          dataKey="humidity"
          color="#1D9E75"
          data={chartData}
          min={humMin}
          max={humMax}
          empty={isEmpty}
          loading={loading}
          stats={
            hums.length > 0
              ? [
                  { label: "średnia", value: `${avg(hums).toFixed(1)} %` },
                  { label: "min", value: `${Math.min(...hums).toFixed(1)} %` },
                  { label: "max", value: `${Math.max(...hums).toFixed(1)} %` },
                ]
              : []
          }
        />
 
        <MetricChart
          title="Ciśnienie"
          unit=" hPa"
          dataKey="pressure"
          color="#378ADD"
          data={chartData}
          min={presMin}
          max={presMax}
          empty={isEmpty}
          loading={loading}
          stats={
            pressures.length > 0
              ? [
                  { label: "średnia", value: `${avg(pressures).toFixed(1)} hPa` },
                  { label: "min", value: `${Math.min(...pressures).toFixed(1)} hPa` },
                  { label: "max", value: `${Math.max(...pressures).toFixed(1)} hPa` },
                ]
              : []
          }
        />
        
      </div>

      {/* eksporty */}
      <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-5">
        <span className="text-[25px] text-[#666]">Eksport danych</span>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(readings, from, to)}
            disabled={readings.length === 0}
            className="px-3.5 py-1.5 text-[16px] bg-transparent border border-[#333] rounded text-[#aaa] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#555] hover:text-white transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => exportJSON(readings, from, to)}
            disabled={readings.length === 0}
            className="px-3.5 py-1.5 text-[16px] bg-transparent border border-[#333] rounded text-[#aaa] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#555] hover:text-white transition-colors"
          >
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}
