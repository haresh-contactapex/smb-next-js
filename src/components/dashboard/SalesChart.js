"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { getCurrencySymbol } from "@/lib/currency";

function chartColors() {
  const dark = document.documentElement.classList.contains("dark");
  return {
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
    text: dark ? "#8a97b3" : "#64748b",
    tooltipBg: dark ? "#182142" : "#ffffff",
    tooltipText: dark ? "#e5e9f5" : "#1e293b",
    tooltipBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };
}

export default function SalesChart({ data: salesChartData }) {
  const { currency, formatMoney } = useGeneralSettings();
  const symbol = getCurrencySymbol(currency);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [period, setPeriod] = useState("daily");
  const periodTotal = salesChartData[period].sales.reduce((sum, v) => sum + v, 0);

  function build(activePeriod) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const d = salesChartData[activePeriod];
    const c = chartColors();
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, "rgba(28,59,106,0.28)");
    gradient.addColorStop(1, "rgba(28,59,106,0)");

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ctx, {
      data: {
        labels: d.labels,
        datasets: [
          {
            type: "line",
            label: `Sales (${symbol})`,
            data: d.sales,
            borderColor: "#1c3b6a",
            backgroundColor: gradient,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#1c3b6a",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
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
            callbacks: {
              label: (item) => ` Sales: ${formatMoney(item.raw)}`,
              afterLabel: (item) => ` Orders: ${d.orders[item.dataIndex]}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: c.text, font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: c.grid },
            border: { display: false },
            ticks: { display: false },
          },
        },
      },
    });
  }

  useEffect(() => {
    build(period);
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    function handleThemeChange() {
      build(period);
    }
    window.addEventListener("adminpanel:theme-change", handleThemeChange);
    return () => window.removeEventListener("adminpanel:theme-change", handleThemeChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Sales Overview</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{formatMoney(periodTotal)}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">Paid sales over the selected period</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-darksurface2 rounded-lg p-1">
            {["daily", "weekly", "monthly"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`period-btn px-3 py-1.5 rounded-md text-[12px] font-semibold text-slate-500 dark:text-slate-300 transition-colors ${
                  period === p ? "active" : ""
                }`}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-72 sm:h-80 mt-4">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
