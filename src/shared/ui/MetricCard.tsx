import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success";
  trend?: { direction: "up" | "down"; value: string };
}

export function MetricCard({ label, value, hint, icon, tone = "neutral", trend }: Props) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span>{label}</span>
        <div className="metric-card__icon">{icon}</div>
      </div>
      <div className="metric-card__value-row">
        <strong>{value}</strong>
        {trend ? (
          <span className={`metric-trend metric-trend--${trend.direction}`}>
            {trend.direction === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend.value}
          </span>
        ) : null}
      </div>
      <p>{hint}</p>
    </article>
  );
}
