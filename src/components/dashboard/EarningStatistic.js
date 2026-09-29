"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import Icon from "@/components/admin-panel/Icon";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function chartColors() {
  const dark = document.documentElement.classList.contains("dark");
  return {
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    text: dark ? "#8a97b3" : "#64748b",
    bar: dark ? "#6f92d6" : "#1c3b6a",
    tooltipBg: dark ? "#182142" : "#ffffff",
    tooltipText: dark ? "#e5e9f5" : "#1e293b",
    tooltipBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };
}

function compact(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(value);
  }
}

const TILES = [
  { key: "sales", label: "Sales", icon: "shopping-bag" },
  { key: "income", label: "Income", icon: "dollar-sign" },
  { key: "pending", label: "Pending", icon: "clock" },
];

export default function EarningStatistic({ data, currency }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [yearIndex, setYearIndex] = useState(0);
  const selected = data.years[yearIndex];

  function build() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = chartColors();
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "Income",
            data: selected.income,
            backgroundColor: c.bar,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 16,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: c.tooltipText,
            bodyColor: c.tooltipText,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            callbacks: { label: (item) => ` Income: ${compact(item.raw, currency)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: c.text, font: { size: 11 } } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: c.grid, borderDash: [4, 4] },
            ticks: { color: c.text, font: { size: 11 }, callback: (v) => compact(v, currency) },
          },
        },
      },
    });
  }

  useEffect(() => {
    build();
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearIndex]);

  useEffect(() => {
    window.addEventListener("adminpanel:theme-change", build);
    return () => window.removeEventListener("adminpanel:theme-change", build);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearIndex]);

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Earning Statistic</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">Yearly earning overview</p>
        </div>
        <select
          aria-label="Earning statistic year"
          value={yearIndex}
          onChange={(e) => setYearIndex(Number(e.target.value))}
          className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-darksurface2 px-3 text-[13px] font-medium text-slate-600 dark:text-slate-300 shadow-sm"
        >
          {data.years.map((y, i) => (
            <option key={y.label} value={i}>
              {y.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {TILES.map((tile) => (
          <div
            key={tile.key}
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 min-w-[130px]"
          >
            <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 grid place-items-center shrink-0">
              <Icon name={tile.icon} className="w-[18px] h-[18px]" />
            </span>
            <div>
              <p className="text-[11px] text-slate-400">{tile.label}</p>
              <p className="text-[14px] font-bold text-slate-800 dark:text-white">
                {compact(selected.totals[tile.key], currency)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="h-64 sm:h-72 mt-4">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
