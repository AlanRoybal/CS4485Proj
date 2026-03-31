'use client'

import { useState } from 'react'
import { GitBranch, Layers, Target, BarChart3, Zap, TreePine, Settings2, Grid3X3 } from 'lucide-react'
import type { ModelMetrics, ModelInfo, XGBoostDeepDiveInfo } from '@/lib/api'

interface Props {
  metrics: ModelMetrics
  info: ModelInfo
  deepDive?: XGBoostDeepDiveInfo | null
}

const CATEGORY_META: Record<string, { label: string; description: string }> = {
  price_history: {
    label: 'Price History',
    description: 'Historical price lags that anchor predictions to recent and long-term trends',
  },
  market_segment: {
    label: 'Market Segments',
    description: 'Prices across bedroom tiers and market percentiles to capture cross-segment dynamics',
  },
  momentum: {
    label: 'Momentum',
    description: 'Year-over-year price change that captures the overall market direction',
  },
  context: {
    label: 'Context',
    description: 'Temporal and geographic signals like seasonality, long-term trends, and market size',
  },
}

const HORIZON_LABELS: Record<string, string> = {
  '1m': '1-Month',
  '3m': '3-Month',
  '6m': '6-Month',
}

function formatNum(n: number): string {
  return n.toLocaleString()
}

export default function XGBoostDeepDive({ metrics, info, deepDive }: Props) {
  const [openSection, setOpenSection] = useState<string | null>('what-is')

  const toggle = (key: string) =>
    setOpenSection(prev => (prev === key ? null : key))

  const m1 = metrics['1m']

  const sections = [
    {
      key: 'what-is',
      icon: TreePine,
      title: 'What is XGBoost?',
      content: (
        <div className="space-y-4">
          <p>
            XGBoost (Extreme Gradient Boosting) is a machine learning algorithm that builds
            hundreds of small decision trees, each one learning from the mistakes of the
            previous ones. Think of it like getting a second opinion, then a third, then a
            hundredth — each expert focuses on the cases the previous ones got wrong.
          </p>
          <p>
            It&apos;s one of the most widely used algorithms in industry for structured data
            problems (like predicting home prices from market stats), consistently winning
            machine learning competitions and powering real-world forecasting systems.
          </p>

          {/* Gradient boosting visual */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700">How gradient boosting works:</p>
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {[
                { label: 'Training Data', sub: 'Historical prices' },
                { label: 'Tree 1', sub: 'Initial guess' },
                { label: 'Residuals', sub: 'What Tree 1 got wrong' },
                { label: 'Tree 2', sub: 'Corrects Tree 1' },
                { label: '...', sub: 'Repeat' },
                { label: 'Final Prediction', sub: 'Sum of all trees' },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center text-center px-2 min-w-[80px]">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 text-[10px] font-bold ${
                      i === arr.length - 1
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-white border border-gray-200 text-gray-500'
                    }`}>
                      {i === 4 ? '...' : i + 1}
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700 leading-tight">{step.label}</p>
                    <p className="text-[9px] text-gray-400 leading-tight">{step.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-gray-300 mx-0.5">
                      <path d="M5 3.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { term: 'Ensemble Learning', def: 'Combining many weak models into one strong predictor' },
                { term: 'Gradient Descent', def: 'Each tree minimizes the remaining prediction error' },
                { term: 'Regularization', def: 'Constraints that prevent the model from memorizing noise' },
              ].map((c) => (
                <div key={c.term} className="rounded bg-white border border-gray-100 p-2.5">
                  <p className="text-[10px] font-semibold text-teal-800 mb-0.5">{c.term}</p>
                  <p className="text-[10px] text-gray-500 leading-snug">{c.def}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'config',
      icon: Settings2,
      title: 'Model Configuration',
      content: deepDive ? (
        <div className="space-y-4">
          <p>
            Our XGBoost models were tuned with specific hyperparameters that control
            how the algorithm learns. Here&apos;s the configuration and what each setting does:
          </p>

          {/* Hyperparameters grid */}
          <div className="space-y-1.5">
            {Object.entries(deepDive.hyperparameters).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-gray-50 px-4 py-2.5 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-[11px] font-mono font-semibold text-teal-800">{key}</code>
                    <span className="text-[11px] font-semibold text-gray-950 tabular-nums">{value}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    {deepDive.hyperparameter_descriptions[key]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Trees actually used per horizon */}
          <div className="rounded-lg bg-teal-50/60 border border-teal-100 p-4">
            <p className="text-xs font-semibold text-teal-800 mb-2">
              Trees actually used (after early stopping)
            </p>
            <p className="text-[11px] text-gray-600 mb-3">
              Although the maximum is {deepDive.hyperparameters.n_estimators?.toLocaleString()} trees,
              early stopping halted training once accuracy plateaued:
            </p>
            <div className="grid grid-cols-3 gap-3">
              {deepDive.training.horizons.map((h) => (
                <div key={h} className="text-center">
                  <p className="text-lg font-serif text-gray-950">
                    {deepDive.training.trees_used[h]?.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    {HORIZON_LABELS[h] ?? h}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Model configuration data is not available.</p>
      ),
    },
    {
      key: 'features',
      icon: Grid3X3,
      title: 'The 14 Features',
      content: deepDive ? (
        <div className="space-y-4">
          <p>
            Every prediction uses exactly 14 data points about a zipcode. These features
            are grouped into four categories:
          </p>

          {/* Group features by category */}
          {Object.entries(CATEGORY_META).map(([catKey, catMeta]) => {
            const catFeatures = deepDive.features.filter(f => f.category === catKey)
            if (catFeatures.length === 0) return null
            return (
              <div key={catKey} className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-teal-800">{catMeta.label}</p>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    ({catFeatures.length} feature{catFeatures.length > 1 ? 's' : ''})
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">{catMeta.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {catFeatures.map((f) => (
                    <span
                      key={f.name}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-gray-200 text-[11px] text-gray-700"
                    >
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}

          <p className="text-[11px] text-gray-400">
            Two features (1-month and 3-month price changes) were removed during development
            because they encoded the target variable — a form of data leakage. The remaining 14
            are verified clean predictors.
          </p>
        </div>
      ) : (
        <p className="text-gray-500">Feature data is not available.</p>
      ),
    },
    {
      key: 'how-it-works',
      icon: GitBranch,
      title: 'How Your Prediction Was Made',
      content: (
        <div className="space-y-4">
          <p>
            When you enter a zipcode, here&apos;s what happens behind the scenes:
          </p>

          {/* Prediction steps — from backend if available, otherwise static */}
          <div className="space-y-0">
            {(deepDive?.prediction_steps ?? [
              'Collect the latest Zillow ZHVI data for the selected zipcode',
              'Extract 14 market features: price lags, bedroom tiers, momentum, and seasonal context',
              'Feed features into the trained XGBoost model to predict future overall ZHVI',
              'Scale the ZHVI prediction to the selected bedroom tier using current price ratios',
              'Derive direction signal, confidence score, and expected price range from the forecast',
            ]).map((step, i) => (
              <div key={i} className="flex gap-3 py-2.5">
                <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-teal-700">{i + 1}</span>
                </div>
                <p className="text-[13px] text-gray-600 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Bedroom scaling formula */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Bedroom scaling formula</p>
            <p className="text-[11px] text-gray-500 mb-2">
              The XGBoost model predicts overall ZHVI. To get a bedroom-specific price, we
              apply the current ratio:
            </p>
            <div className="bg-white rounded border border-gray-200 px-4 py-3 text-center">
              <code className="text-[12px] text-gray-800">
                predicted_price = predicted_zhvi × (current_bedroom_price ÷ current_zhvi)
              </code>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'three-models',
      icon: Layers,
      title: 'Three Models, Three Horizons',
      content: (
        <div className="space-y-3">
          <p>
            We don&apos;t use one model for everything. We trained three separate XGBoost
            models, each specialized for a different time horizon:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: '1-Month', horizon: '1m', desc: 'Short-term forecast. Most accurate — prices rarely shift dramatically in 30 days.' },
              { label: '3-Month', horizon: '3m', desc: 'Medium-term outlook. Captures quarterly trends and seasonal shifts.' },
              { label: '6-Month', horizon: '6m', desc: 'Longer-range view. More uncertainty, but useful for planning ahead.' },
            ].map((h) => {
              const m = metrics[h.horizon]
              const trees = deepDive?.training.trees_used[h.horizon]
              return (
                <div key={h.horizon} className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-teal-800 mb-1">{h.label}</p>
                  <p className="text-[11px] text-gray-500 mb-3">{h.desc}</p>
                  {(m || trees) && (
                    <div className="space-y-1 text-[11px]">
                      {trees && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trees used</span>
                          <span className="font-medium text-gray-700">{trees.toLocaleString()}</span>
                        </div>
                      )}
                      {m && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg. error</span>
                            <span className="font-medium text-gray-700">{m.mape.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">RMSE</span>
                            <span className="font-medium text-gray-700">${m.rmse.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">MAE</span>
                            <span className="font-medium text-gray-700">${m.mae.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Each model was trained on the same 14 features but optimized for its specific
            target — the actual home value 1, 3, or 6 months into the future.
          </p>
        </div>
      ),
    },
    {
      key: 'training',
      icon: Target,
      title: 'How We Trained It',
      content: (
        <div className="space-y-3">
          <p>
            The model was trained on{' '}
            <span className="font-medium text-gray-700">
              {deepDive
                ? `${formatNum(deepDive.training.train_rows)} training rows`
                : `${(info.dataset.data_points / 1000).toFixed(0)}k+ data points`}
            </span>{' '}
            from{' '}
            <span className="font-medium text-gray-700">
              {info.dataset.zipcodes} Dallas-area zipcodes
            </span>
            , spanning{' '}
            {new Date((deepDive?.training.date_range_start ?? info.dataset.date_range_start) + 'T12:00:00').getFullYear()} to{' '}
            {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
              new Date((deepDive?.training.date_range_end ?? info.dataset.date_range_end) + 'T12:00:00'),
            )}.
          </p>

          {/* Train/test split stats */}
          {deepDive && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-serif text-gray-950">{formatNum(deepDive.training.train_rows)}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Training rows</p>
                <p className="text-[10px] text-gray-400">Before {deepDive.training.split_date.slice(0, 7)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-serif text-gray-950">{formatNum(deepDive.training.test_rows)}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Test rows</p>
                <p className="text-[10px] text-gray-400">After {deepDive.training.split_date.slice(0, 7)}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Key training decisions:</p>
            <ul className="list-disc list-inside text-[12px] text-gray-600 space-y-1.5">
              <li>
                <span className="font-medium">Time-based split</span> — all data before Jan 2025
                is training data; everything after is test data. We never let the model
                &quot;peek&quot; at future prices.
              </li>
              <li>
                <span className="font-medium">Leakage investigation</span> — we removed 2 features
                (1-month and 3-month price changes) that were essentially encoding the
                answer. The remaining 14 features were verified to be clean predictors.
              </li>
              <li>
                <span className="font-medium">Data source</span> — Zillow Home Value Index (ZHVI),
                which represents the typical home value for a given area. It&apos;s smoothed
                and seasonally adjusted by Zillow.
              </li>
              <li>
                <span className="font-medium">Early stopping</span> — training halts automatically
                when {deepDive?.hyperparameters.early_stopping_rounds ?? 50} consecutive rounds
                show no improvement, preventing overfitting.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      key: 'accuracy',
      icon: BarChart3,
      title: 'Understanding the Accuracy Numbers',
      content: (
        <div className="space-y-3">
          <p>
            We measure accuracy three ways. Here&apos;s what each metric means in plain terms:
          </p>
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                MAPE (Mean Absolute Percentage Error){m1 && `: ${m1.mape.toFixed(1)}%`}
              </p>
              <p className="text-[12px] text-gray-500">
                On average, our 1-month prediction is within {m1?.mape.toFixed(1)}% of the actual
                price. For a $400,000 home, that&apos;s roughly
                {m1 && ` $${Math.round(400000 * m1.mape / 100).toLocaleString()}`} off.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                MAE (Mean Absolute Error){m1 && `: $${m1.mae.toLocaleString()}`}
              </p>
              <p className="text-[12px] text-gray-500">
                The average dollar amount the prediction is off by. Unlike MAPE, this
                doesn&apos;t scale with price — it&apos;s the raw error in dollars.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                RMSE (Root Mean Square Error){m1 && `: $${m1.rmse.toLocaleString()}`}
              </p>
              <p className="text-[12px] text-gray-500">
                Similar to MAE, but penalizes large errors more heavily. If RMSE is much
                larger than MAE, it means the model occasionally makes bigger misses —
                ours are close, which means predictions are consistently reliable.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'direction',
      icon: Zap,
      title: 'The Direction Signal',
      content: (
        <div className="space-y-3">
          <p>
            The &quot;up&quot; or &quot;down&quot; direction signal comes directly from the XGBoost
            1-month prediction. If the predicted price is higher than the current price,
            the direction is &quot;up&quot;; otherwise it&apos;s &quot;down.&quot;
          </p>
          <p>
            Confidence is derived from the size of the predicted change — a larger predicted
            move means more confidence. A near-zero change gives ~50% confidence (essentially
            a coin flip), while a {'>'}5% predicted change approaches maximum confidence.
          </p>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Confidence scale:</p>
            <div className="space-y-1.5 text-[12px]">
              {[
                { label: 'Very strong', range: '80–100%', desc: 'Large predicted price move' },
                { label: 'Strong', range: '70–79%', desc: 'Clear directional signal' },
                { label: 'Moderate', range: '60–69%', desc: 'Moderate predicted change' },
                { label: 'Slight lean', range: '50–59%', desc: 'Near-zero predicted change' },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="font-medium text-gray-700 w-24">{c.label}</span>
                  <span className="text-gray-400 w-16">{c.range}</span>
                  <span className="text-gray-500">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white rounded border border-gray-200/80 divide-y divide-gray-100">
      {sections.map((s) => {
        const Icon = s.icon
        const isOpen = openSection === s.key
        return (
          <div key={s.key}>
            <button
              type="button"
              onClick={() => toggle(s.key)}
              className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50/50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isOpen ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-400'
              }`}>
                <Icon size={16} />
              </div>
              <span className={`text-sm font-medium flex-1 transition-colors ${
                isOpen ? 'text-teal-800' : 'text-gray-700'
              }`}>
                {s.title}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-5 pl-[4.25rem] text-[13px] text-gray-600 leading-relaxed">
                  {s.content}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
