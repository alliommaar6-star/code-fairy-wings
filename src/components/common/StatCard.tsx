import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlight?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-700",
  trend,
  highlight = false,
  onClick,
}) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
        highlight
          ? "border-lime-500/50 ring-2 ring-lime-400/20 shadow-md"
          : "border-slate-200/80 hover:border-slate-300"
      } ${onClick ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {value}
          </div>
        </div>
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold shrink-0 ml-auto flex items-center gap-0.5 ${
                trend.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
