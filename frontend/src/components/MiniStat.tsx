interface MiniStatProps {
  label: string;
  value: string;
}

export function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="text-center">
      <div className="text-[18px] text-[#555] uppercase tracking-widest mb-0.5">
        {label}
      </div>
      <div className="text-[18px] text-[#ccc]">{value}</div>
    </div>
  );
}
