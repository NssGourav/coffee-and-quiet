"use client";

import { useEffect, useRef, useState } from "react";

export function SignInLandscape() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<{ setPaused: (paused: boolean) => void } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    // Only the sign-in route loads Three.js; the form renders independently.
    import("./resort-scene")
      .then(({ createResortScene }) => {
        if (cancelled || !canvas.current) return;
        const scene = createResortScene(canvas.current, () => setReady(false));
        controller.current = scene;
        dispose = scene.dispose;
        setReady(true);
      })
      .catch(() => {
        // The illustrated landscape stays visible without WebGL or a network.
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
      controller.current = null;
      dispose?.();
    };
  }, []);

  function toggleMotion() {
    const next = !paused;
    setPaused(next);
    controller.current?.setPaused(next);
  }

  return (
    <section
      className="signin-landscape"
      aria-label="A quiet retreat in the Chikkamagaluru hills"
    >
      <div className="landscape-art" aria-hidden="true">
        <svg
          className="landscape-fallback"
          viewBox="0 0 800 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hill-sky" x2="0" y2="1">
              <stop stopColor="#cfdbc4" />
              <stop offset="1" stopColor="#819d7f" />
            </linearGradient>
          </defs>
          <path fill="url(#hill-sky)" d="M0 0h800v900H0z" />
          <circle cx="590" cy="190" r="68" fill="#efdfb4" />
          <path d="M0 430Q170 180 360 350T800 290V900H0Z" fill="#7e9b82" />
          <path d="M0 510Q180 300 380 490T800 380V900H0Z" fill="#4f795f" />
          <path d="M0 640Q250 370 480 560T800 500V900H0Z" fill="#315b47" />
          <path d="M0 780Q260 570 510 720T800 640V900H0Z" fill="#214936" />
          <path
            d="M350 900Q650 650 410 640T470 490"
            fill="none"
            stroke="#c2b691"
            strokeWidth="24"
          />
        </svg>
        <canvas
          ref={canvas}
          className={ready ? "landscape-canvas is-ready" : "landscape-canvas"}
        />
        <div className="landscape-shade" />
      </div>
      <div className="landscape-location">
        <span className="location-mark" aria-hidden="true" /> CHIKKAMAGALURU,
        KARNATAKA
      </div>
      <div className="landscape-caption">
        <p className="eyebrow">NESTLED IN THE WESTERN GHATS</p>
        <h2>
          Less hurry.
          <br />
          <em>More hillside.</em>
        </h2>
        <p>
          Coffee country. Open skies.
          <br />A little room to simply be.
        </p>
      </div>
      <div className="landscape-bottom">
        <span>COFFEE & QUIET</span>
        {ready && (
          <button
            type="button"
            className="landscape-motion"
            onClick={toggleMotion}
            aria-label={
              paused ? "Play landscape animation" : "Pause landscape animation"
            }
            aria-pressed={paused}
          >
            <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>{" "}
            {paused ? "Play scene" : "Pause scene"}
          </button>
        )}
      </div>
    </section>
  );
}
