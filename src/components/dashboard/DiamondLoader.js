"use client";

import { useEffect, useState } from "react";
import "./diamondLoader.css";

const SPARKLE_PATH = "M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z";

/**
 * Full-screen diamond loader. While `active`, the bar eases toward 88%; when
 * `active` turns false it snaps to 100%, then fades out and unmounts.
 */
export default function DiamondLoader({
  active,
  title = "Loading...",
  subtitle = "Please wait while we prepare your page",
}) {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (active) {
      setMounted(true);
      setHidden(false);
      setProgress(0);
      const t = setInterval(
        () => setProgress((p) => p + (88 - p) * 0.07 + 0.3),
        60,
      );
      return () => clearInterval(t);
    }
    if (!mounted) return undefined;
    setProgress(100);
    const fade = setTimeout(() => setHidden(true), 350);
    const done = setTimeout(() => setMounted(false), 800);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!mounted) return null;
  const pct = Math.min(100, progress);

  return (
    <div
      className={`dl-overlay${hidden ? " dl-hidden" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={hidden}
    >
      <div className="dl-card">
        <span className="dl-amb a" aria-hidden="true" />
        <span className="dl-amb b" aria-hidden="true" />
        <div className="dl-stage">
          <div className="dl-halo" />
          <div className="dl-ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <linearGradient id="dlRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#e6b84e" stopOpacity="0" />
                  <stop offset=".5" stopColor="#e6b84e" stopOpacity=".9" />
                  <stop offset="1" stopColor="#e6b84e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="url(#dlRingGrad)"
                strokeWidth=".35"
                strokeDasharray="210 92"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="dl-orbit a">
            <span className="dl-bead" />
            <span className="dl-bead" />
            <span className="dl-bead" />
            <span className="dl-bead" />
          </div>
          <div className="dl-orbit b">
            <span className="dl-bead" />
            <span className="dl-bead" />
            <span className="dl-bead" />
            <span className="dl-bead" />
          </div>

          <svg
            className="dl-diamond"
            viewBox="0 0 200 170"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="dlLight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff2b8" />
                <stop offset="1" stopColor="#e8bb52" />
              </linearGradient>
              <linearGradient id="dlMid" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f0cb6a" />
                <stop offset="1" stopColor="#c18e24" />
              </linearGradient>
              <linearGradient id="dlDark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#c9982f" />
                <stop offset="1" stopColor="#8a5c10" />
              </linearGradient>
              <linearGradient id="dlDeep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e4b649" />
                <stop offset="1" stopColor="#7c520c" />
              </linearGradient>
              <radialGradient id="dlCore" cx=".5" cy=".3" r=".8">
                <stop offset="0" stopColor="#fff7d0" />
                <stop offset="1" stopColor="#e9bf5a" />
              </radialGradient>
              <clipPath id="dlClip">
                <polygon points="40,20 160,20 195,62 100,160 5,62" />
              </clipPath>
            </defs>
            <polygon points="40,20 75,20 60,62 5,62" fill="url(#dlMid)" />
            <polygon points="75,20 125,20 100,62" fill="url(#dlLight)" />
            <polygon points="75,20 100,62 60,62" fill="url(#dlDark)" />
            <polygon points="125,20 140,62 100,62" fill="url(#dlMid)" />
            <polygon
              points="125,20 160,20 195,62 140,62"
              fill="url(#dlLight)"
            />
            <polygon points="5,62 60,62 100,160" fill="url(#dlDeep)" />
            <polygon points="60,62 100,62 100,160" fill="url(#dlCore)" />
            <polygon points="100,62 140,62 100,160" fill="url(#dlDark)" />
            <polygon points="140,62 195,62 100,160" fill="url(#dlMid)" />
            <polygon
              points="88,62 112,62 112,72 106,72 100,150 94,72 88,72"
              fill="#7a5010"
              opacity=".55"
            />
            <g
              fill="none"
              stroke="#fff3c0"
              strokeOpacity=".8"
              strokeWidth="1.6"
              strokeLinejoin="round"
            >
              <polygon points="40,20 160,20 195,62 100,160 5,62" />
              <polyline points="5,62 195,62" />
              <polyline points="75,20 60,62 100,160" />
              <polyline points="125,20 140,62 100,160" />
              <polyline points="75,20 100,62 125,20" />
              <polyline points="100,62 100,160" />
            </g>
            <g clipPath="url(#dlClip)">
              <rect
                className="dl-sweep"
                x="0"
                y="0"
                width="26"
                height="170"
                fill="#fff"
                opacity="0"
              />
            </g>
          </svg>

          <span className="dl-sparkle s1">
            <svg viewBox="0 0 24 24">
              <path d={SPARKLE_PATH} fill="#ffd968" />
            </svg>
          </span>
          <span className="dl-sparkle s2">
            <svg viewBox="0 0 24 24">
              <path d={SPARKLE_PATH} fill="#fff0b0" />
            </svg>
          </span>
          <span className="dl-sparkle s3">
            <svg viewBox="0 0 24 24">
              <path d={SPARKLE_PATH} fill="#ffd968" />
            </svg>
          </span>
        </div>

        <div className="dl-title">{title}</div>
        <div className="dl-subtitle">{subtitle}</div>
        <div
          className="dl-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="dl-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
