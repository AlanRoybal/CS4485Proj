import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  fetchModelMetrics,
  fetchModelInfo,
  fetchModelInfoDetailed,
  fetchModelDeepDive,
} from "@/lib/api";
import ModelAccuracy from "@/components/ModelAccuracy";
import ModelInsights from "@/components/ModelInsights";
import PredictionPipeline from "@/components/PredictionPipeline";
import XGBoostDeepDive from "@/components/XGBoostDeepDive";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [modelMetrics, modelInfo, detailedModelInfo, deepDiveInfo] =
    await Promise.all([
      fetchModelMetrics().catch(
        () => ({}) as Awaited<ReturnType<typeof fetchModelMetrics>>,
      ),
      fetchModelInfo().catch(() => null),
      fetchModelInfoDetailed().catch(() => null),
      fetchModelDeepDive().catch(() => null),
    ]);

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-white">
      <div className="relative max-w-2xl mx-auto px-6 lg:px-6 flex flex-col py-10">
        {/* Back arrow */}
        <div className="lg:absolute lg:-left-20 lg:top-[5.75rem] mb-4 lg:mb-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-teal-800 hover:text-teal-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/40 rounded-sm"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
            <span className="lg:hidden">Back</span>
          </Link>
        </div>

        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px w-5 bg-teal-800" />
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-teal-800">
            About
          </span>
        </div>

        {/* Title */}
        <p className="text-sm text-gray-400 mb-8">
          UT Dallas UTDesign Capstone &mdash; Spring 2026 &mdash; Advisor:
          Muhammad Ikram
        </p>

        {/* How We Predict */}
        {modelInfo && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-5 bg-teal-800" />
              <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                How We Predict
              </h2>
            </div>
            <div className="bg-white rounded border border-gray-200/80 p-4 mb-2">
              <PredictionPipeline
                info={modelInfo}
                mape={modelMetrics?.["1m"]?.mape}
              />
            </div>
            <div className="flex items-center gap-4 px-1 py-2 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                <span className="text-[11px] text-gray-500">
                  Home prices:{" "}
                  <span className="font-medium text-gray-700">Zillow ZHVI</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[11px] text-gray-500">
                  Mortgage rates:{" "}
                  <span className="font-medium text-gray-700">
                    Freddie Mac / FRED
                  </span>
                </span>
              </div>
            </div>
            <ModelInsights info={modelInfo} detailedInfo={detailedModelInfo} />
          </section>
        )}

        {/* Model Accuracy */}
        {modelMetrics && Object.keys(modelMetrics).length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-5 bg-teal-800" />
              <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                Model Accuracy
              </h2>
            </div>
            <ModelAccuracy metrics={modelMetrics} />
          </section>
        )}

        {/* Under the Hood: XGBoost */}
        {modelInfo && modelMetrics && Object.keys(modelMetrics).length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-5 bg-teal-800" />
              <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-800">
                Under the Hood: XGBoost
              </h2>
            </div>
            <XGBoostDeepDive
              metrics={modelMetrics}
              info={modelInfo}
              deepDive={deepDiveInfo}
            />
          </section>
        )}
      </div>
    </main>
  );
}
