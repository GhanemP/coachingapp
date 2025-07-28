import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  target?: number;
  previousValue?: number;
  description?: string;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

export function MetricCard({
  title,
  value,
  unit,
  target,
  previousValue,
  description,
  className,
  trend,
}: MetricCardProps) {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  const percentage = target ? (numericValue / target) * 100 : null;
  
  // Calculate trend if not provided
  let calculatedTrend = trend;
  if (!trend && previousValue !== undefined) {
    if (numericValue > previousValue) {calculatedTrend = "up";}
    else if (numericValue < previousValue) {calculatedTrend = "down";}
    else {calculatedTrend = "neutral";}
  }

  const getColorClasses = () => {
    if (!percentage) {return "";}
    if (percentage >= 95) {return "text-green-600 bg-green-50 border-green-200";}
    if (percentage >= 80) {return "text-yellow-600 bg-yellow-50 border-yellow-200";}
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getTrendIcon = () => {
    switch (calculatedTrend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "neutral":
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const formatValue = () => {
    if (unit === "percentage") {return `${numericValue}%`;}
    if (unit === "currency") {return `$${numericValue.toLocaleString()}`;}
    if (unit === "number") {return numericValue.toLocaleString();}
    return numericValue.toString();
  };

  return (
    <div
      className={cn(
        "p-6 rounded-lg border transition-all hover:shadow-md",
        percentage ? getColorClasses() : "bg-white border-gray-200",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{formatValue()}</span>
            {calculatedTrend && (
              <span className="flex items-center gap-1">
                {getTrendIcon()}
                {previousValue !== undefined && (
                  <span className="text-xs text-gray-500">
                    {numericValue > previousValue ? "+" : ""}
                    {((numericValue - previousValue) / previousValue * 100).toFixed(1)}%
                  </span>
                )}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
          {target && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Target: {target}{unit === "percentage" ? "%" : ""}</span>
                <span className="font-medium">{percentage?.toFixed(0)}%</span>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    percentage && percentage >= 95 && "bg-green-600",
                    percentage && percentage >= 80 && percentage < 95 && "bg-yellow-600",
                    percentage && percentage < 80 && "bg-red-600"
                  )}
                  style={{ width: `${Math.min(percentage || 0, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}