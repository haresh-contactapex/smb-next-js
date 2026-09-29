"use client";

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

function chartColors() {
  const dark = document.documentElement.classList.contains("dark");
  return {
    text: dark ? "#8a97b3" : "#64748b",
    tooltipBg: dark ? "#182142" : "#ffffff",
    tooltipText: dark ? "#e5e9f5" : "#1e293b",
    tooltipBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    segmentBorder: dark ? "#121a2e" : "#ffffff",
  };
}

/** Reusable category-breakdown doughnut, styled like SalesChart.js and theme-aware the same way. */
export default function ReportDoughnutChart({ title, subtitle, labels, data, colors }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const total = data.reduce((sum, value) => sum + value, 0);

  function build() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const c = chartColors();

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderColor: c.segmentBorder, borderWidth: 2, hoverOffset: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: c.text, font: { size: 11 }, usePointStyle: true, padding: 14 },
          },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: c.tooltipText,
            bodyColor: c.tooltipText,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
          },
        },
      },
    });
  }

  useEffect(() => {
    if (total > 0) build();
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleThemeChange() {
      if (total > 0) build();
    }
    window.addEventListener("adminpanel:theme-change", handleThemeChange);
    return () => window.removeEventListener("adminpanel:theme-change", handleThemeChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
      {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
      <div className="h-64 mt-4">
        {total > 0 ? (
          <canvas ref={canvasRef} />
        ) : (
          <div className="h-full grid place-items-center text-sm text-slate-400">No data yet</div>
        )}
      </div>
    </section>
  );
}
