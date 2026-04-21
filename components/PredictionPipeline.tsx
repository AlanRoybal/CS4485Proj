import { Database, Cpu, BarChart3, TrendingUp } from "lucide-react";
import type { ModelInfo } from "@/lib/api";

interface Props {
  info: ModelInfo;
  predictedPrice?: number;
  mape?: number;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PredictionPipeline({
  info,
  predictedPrice,
  mape,
}: Props) {
  const forecastDetail =
    predictedPrice != null && mape != null
      ? `${formatPrice(predictedPrice)} (±${mape.toFixed(1)}%)`
      : predictedPrice != null
      ? formatPrice(predictedPrice)
      : mape != null
      ? `±${mape.toFixed(1)}% typical error`
      : "1m / 3m / 6m ahead";

  const steps = [
    {
      icon: Database,
      label: "Zillow + FRED",
      detail: `${(info.dataset.data_points / 1000).toFixed(0)}k+ data points`,
    },
    {
      icon: BarChart3,
      label: "15 Market Features",
      detail: "Price lags, tiers, mortgage rates",
    },
    {
      icon: Cpu,
      label: "XGBoost Model",
      detail: `Trained on ${info.dataset.zipcodes} zipcodes`,
    },
    {
      icon: TrendingUp,
      label: predictedPrice != null ? "Your Forecast" : "Forecast",
      detail: forecastDetail,
    },
  ];

  return (
    <div className="flex items-stretch gap-0 overflow-x-auto">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.label} className="flex items-center min-w-0">
            <div className="flex flex-col items-center text-center px-3 py-3 min-w-[100px]">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
                <Icon size={16} className="text-teal-700" />
              </div>
              <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                {step.label}
              </p>
              <p className="text-[9px] text-gray-400 leading-tight mt-0.5">
                {step.detail}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className="shrink-0 text-gray-300 mx-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
