interface StatCardProps {
  label: string;
  value: string | null;
  unit: string;
  accentColor: string;
}

export function StatCard({ label, value, unit, accentColor }: StatCardProps) {
  return (
    <div
      className="bg-[#111] rounded-md p-5"
      style={{
        border: `1px solid ${accentColor}33`,
        borderTop: `2px solid ${accentColor}`,
      }}
    >
      <div className="text-[18px] text-[#666] uppercase tracking-widest mb-2.5">
        {label}
      </div>
      {value === null ? (
        <div className="text-[18px] text-[#444]">—</div>
      ) : (
        <div>
          <span className="text-[40px] font-semibold text-white tracking-tight">
            {value}
          </span>
          <span className="text-[28px] text-[#555] ml-1">{unit}</span>
        </div>
      )}
    </div>
  );
}
