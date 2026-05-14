interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  unit: string;
}

export function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#222] px-3 py-2 rounded text-[18px]">
      <div className="text-[#555] mb-1 text-[16px]">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }} className="font-semibold">
          {entry.value.toFixed(1)}{unit}
        </div>
      ))}
    </div>
  );
}
