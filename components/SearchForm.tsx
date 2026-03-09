"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import zipcodes from "@/lib/dallas-zipcodes.json";

/** Wait for Next.js to finish rendering the new page after router.push */
function waitForDomSettled(): Promise<void> {
  return new Promise((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 50);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    // Safety fallback
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 3000);
  });
}

const BEDROOM_OPTIONS = [
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5+", value: 5 },
];

interface SearchFormProps {
  /** Called when a valid 5-digit zipcode is typed (for map integration) */
  onZipcodeChange?: (zipcode: string | null) => void;
}

export default function SearchForm({ onZipcodeChange }: SearchFormProps = {}) {
  const router = useRouter();
  const [zipcode, setZipcode] = useState("");
  const [bedrooms, setBedrooms] = useState(3);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function handleChange(value: string) {
    setZipcode(value);
    setError("");

    const trimmed = value.trim();
    if (/^\d{5}$/.test(trimmed) && (zipcodes as string[]).includes(trimmed)) {
      setConfirmed(true);
      onZipcodeChange?.(trimmed);
    } else {
      if (confirmed) {
        setConfirmed(false);
        onZipcodeChange?.(null);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = zipcode.trim();

    if (!/^\d{5}$/.test(trimmed)) {
      setError("Enter a 5-digit zipcode");
      triggerShake();
      return;
    }

    if (!(zipcodes as string[]).includes(trimmed)) {
      setError("Not a valid Dallas-area zipcode");
      triggerShake();
      return;
    }

    setError("");
    setLoading(true);
    const url = `/dashboard/${trimmed}?bedrooms=${bedrooms}`;
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        router.push(url);
        await waitForDomSettled();
      });
    } else {
      router.push(url);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-5">
      {/* Zipcode */}
      <div>
        <label
          htmlFor="zipcode-input"
          className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-2"
        >
          Zipcode
        </label>
        <input
          id="zipcode-input"
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="75252"
          value={zipcode}
          onChange={(e) => handleChange(e.target.value)}
          className={`
            w-full border-b-2 bg-transparent px-0 py-2
            text-xl font-serif text-gray-950 tracking-wide
            placeholder:text-gray-300
            focus:outline-none transition-colors duration-200
            ${error ? "border-red-400" : confirmed ? "border-teal-600" : "border-gray-200 focus:border-teal-600"}
            ${shake ? "animate-shake" : ""}
          `}
          aria-describedby={error ? "zipcode-error" : undefined}
          aria-invalid={!!error}
          disabled={loading}
        />
        {error && (
          <p
            id="zipcode-error"
            className="mt-2 text-xs text-red-500 font-medium"
            role="alert"
          >
            {error}
          </p>
        )}
        {confirmed && !error && (
          <p className="mt-2 text-xs text-teal-700 font-medium">
            Viewing on map
          </p>
        )}
      </div>

      {/* Bedrooms */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-3">
          Bedrooms
        </p>
        <div
          className="grid grid-cols-4 gap-2"
          role="group"
          aria-label="Select bedroom count"
        >
          {BEDROOM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBedrooms(opt.value)}
              disabled={loading}
              aria-pressed={bedrooms === opt.value}
              className={`
                py-2.5 rounded text-sm font-semibold transition-all duration-150 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-teal-600/40
                ${
                  bedrooms === opt.value
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={`
          group w-full py-3.5 rounded font-semibold text-[15px]
          transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-teal-600/40
          flex items-center justify-center gap-2
          ${
            confirmed
              ? "bg-teal-800 hover:bg-teal-900 text-white shadow-md shadow-teal-900/20"
              : "bg-gray-900 hover:bg-gray-800 text-white"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Loading</span>
          </>
        ) : (
          <>
            <span>Analyze Market</span>
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </button>
    </form>
  );
}
