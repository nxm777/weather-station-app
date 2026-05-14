import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MiniStat } from "./MiniStat";
import { CustomTooltip } from "./CustomTooltip";

interface MetricChartProps {
  title: string;
  unit: string;
  dataKey: string;
  color: string;
  data: Record<string, unknown>[];
  min: number;
  max: number;
  stats: { label: string; value: string }[];
  empty: boolean;
  loading: boolean;
}

export function MetricChart({ title, unit, dataKey, color, data, min, max, stats, empty, loading }: MetricChartProps) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-md p-5">

      {/* nagłówek */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[20px] text-[#aaa]">{title}</span>
        <span className="text-[18px] text-[#444]">{unit}</span>
      </div>

      {/* wykresy */}
      {empty && !loading ? (
        <div className="h-40 flex items-center justify-center text-[#444] text-[13px]">
          Brak danych
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#444" }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(1, Math.floor(data.length / 8))}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 11, fill: color }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${unit.trim()}`}
              width={48}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* statystyki */}
      {stats.length > 0 && (
        <div className="flex justify-around mt-4 pt-4 border-t border-[#1a1a1a]">
          {stats.map((s) => (
            <MiniStat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}
    </div>
  );
}
