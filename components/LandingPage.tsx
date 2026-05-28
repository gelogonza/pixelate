"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MONO_STACK = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const PLAYFAIR_STACK = "'Playfair Display', Georgia, 'Times New Roman', serif";
const ASCII_TRAIL = ["@", "#", "%", "*", "+", ":", ".", "="];
const GITHUB_URL = "https://github.com/gelogonza/pixelate";

const CAPABILITIES = [
  { title: "30+ Render Modes", description: "ASCII, dots, flow field, string art, and more", tag: "render" },
  { title: "Timeline Editor", description: "Keyframe multiple effects and export as video", tag: "export" },
  { title: "Mouse Interaction", description: "Every mode responds to your cursor with spring physics", tag: "interact" },
  { title: "Live Controls", description: "Every parameter updates the canvas in real time", tag: "interact" },
  { title: "Color Modes", description: "Match image, palette, complementary, single color", tag: "render" },
  { title: "Export Anything", description: "PNG, SVG, React component, MP4, favicon", tag: "export" },
  { title: "Open Source", description: "Contribute a renderer, fork it, make it yours", tag: "community" },
  { title: "Runs in Browser", description: "No install, no server, no data sent anywhere", tag: "privacy" },
];

type LandingProps = { demoVideos: string[] };

type TrailPoint = {
  id: number;
  x: number;
  y: number;
  glyph: string;
  size: number;
  hue: number;
};

function BeforeAfter() {
  const [split, setSplit] = useState(50);
  return (
    <section className="ed-before-after">
      <div className="editorial-grid">
        <div className="col-span-12">
          <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">Compare</div>
          <div className="mt-4 relative overflow-hidden bg-black">
            <img
              src="/demos/dreamscape-field.png"
              alt="Before"
              className="block w-full aspect-video object-cover"
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${split}%)` }}
            >
              <video autoPlay muted loop playsInline preload="auto" className="block w-full aspect-video object-cover">
                <source src="/demos/pixelate(11).webm" type="video/webm" />
              </video>
            </div>
            <div className="pointer-events-none absolute left-3 top-3 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">
              Before
            </div>
            <div className="pointer-events-none absolute right-3 top-3 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">
              Mosaic mode
            </div>
            <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }}>
              <div className="h-full w-px bg-black/70" />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              className="absolute inset-x-3 bottom-3 h-6 appearance-none bg-transparent"
              aria-label="Compare slider"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** IntersectionObserver-based scroll reveal. Adds `io-in` to sections and their children as they enter the viewport. */
function useReveal() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-io]"));

    const applyReveal = (section: HTMLElement) => {
      section.classList.add("io-in");
      Array.from(section.querySelectorAll<HTMLElement>("[data-io-child]")).forEach(
        (child, idx) => {
          child.style.transitionDelay = `${idx * 80}ms`;
          child.classList.add("io-in");
        }
      );
    };

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          applyReveal(entry.target as HTMLElement);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0 }
    );

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        applyReveal(section);
      } else {
        obs.observe(section);
      }
    });

    return () => obs.disconnect();
  }, []);
}

/** Spring-physics magnet: pulls the element toward the cursor within a 100px radius. */
function useMagnetic(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const loop = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      node.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: MouseEvent) => {
      const r = node.getBoundingClientRect();
      const mx = r.left + r.width / 2;
      const my = r.top + r.height / 2;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      const d = Math.hypot(dx, dy);
      tx = d <= 100 ? clamp((dx / 100) * 8, -8, 8) : 0;
      ty = d <= 100 ? clamp((dy / 100) * 8, -8, 8) : 0;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    loop();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [ref]);
}

/** Animated dot-field wordmark. Rasterizes "PIXELATE" into an offscreen canvas, then animates dots at non-transparent pixels. */
function AsciiWordmark() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const off = document.createElement("canvas");
    const ox = off.getContext("2d");
    if (!ox) return;

    let dpr = 1;
    let w = 0;
    let h = 0;
    let step = 5;
    let data = new Uint8ClampedArray();
    let raf = 0;

    const setup = () => {
      dpr = window.devicePixelRatio || 1;
      // Reset inline width so CSS width:100% gives us the column width
      canvas.style.width = "";
      canvas.style.marginLeft = "";
      w = canvas.offsetWidth || canvas.parentElement?.clientWidth || 400;
      h = Math.max(100, Math.round(window.innerHeight * 0.2));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      off.width = w;
      off.height = h;
      ox.clearRect(0, 0, w, h);
      ox.fillStyle = "#0a0a0a";
      ox.textAlign = "left";
      ox.textBaseline = "middle";

      const startX = 0;
      let fontSize = Math.floor(h * 0.66);
      ox.font = `700 ${fontSize}px ${MONO_STACK}`;
      const measured = ox.measureText("PIXELATE").width;
      if (measured > w) {
        fontSize = Math.floor(fontSize * (w / measured));
        ox.font = `700 ${fontSize}px ${MONO_STACK}`;
      }
      ox.fillText("PIXELATE", startX, Math.floor(h * 0.52));
      data = ox.getImageData(0, 0, w, h).data;
      step = Math.max(4, Math.floor(w / 220));
    };

    const draw = (tms: number) => {
      const t = tms * 0.0017;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(10,10,10,0.88)";
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4 + 3;
          if (data[idx] < 60) continue;
          const dx = Math.sin((x + y) * 0.035 + t) * 0.65;
          const dy = Math.cos((x - y) * 0.03 + t * 0.85) * 0.35;
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, step * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    setup();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", setup);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return <canvas ref={ref} className="ed-wordmark" />;
}

function NavLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls =
    "relative inline-block pb-0.5 text-[12px] uppercase tracking-[0.2em] text-[#0a0a0a] transition-opacity duration-200 hover:opacity-50 after:absolute after:left-0 after:bottom-0 after:h-px after:w-full after:bg-[#0a0a0a] after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return <Link href={href} className={cls}>{children}</Link>;
}

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <div className={`ed-mobile-menu${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
      <button className="ed-mobile-close" onClick={onClose} aria-label="Close menu">
        ✕
      </button>
      <nav className="ed-mobile-links">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="ed-mobile-link"
          onClick={onClose}
        >
          GitHub
        </a>
        <Link href="/app" className="ed-mobile-link" onClick={onClose}>
          Open App →
        </Link>
      </nav>
    </div>
  );
}

function MediaModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-9 right-0 text-white/70 text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors"
          style={{ fontFamily: MONO_STACK }}
        >
          Close ✕
        </button>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="w-full max-h-[85vh] object-contain"
        >
          <source src={src} type="video/webm" />
        </video>
      </div>
    </div>
  );
}

function CTAButton() {
  const wrapRef = useRef<HTMLDivElement>(null);
  useMagnetic(wrapRef);
  return (
    <div ref={wrapRef} className="inline-flex will-change-transform">
      <Link href="/app" className="ed-cta-btn">
        Open Pixelate →
      </Link>
    </div>
  );
}

export function LandingPage({ demoVideos }: LandingProps) {
  useReveal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const trailId = useRef(1);
  const lastPointAt = useRef(0);
  const textColRef = useRef<HTMLDivElement>(null);
  const videoColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      if (!textColRef.current || !videoColRef.current) return;
      if (window.innerWidth < 768) {
        videoColRef.current.style.height = "";
        videoColRef.current.style.paddingTop = "";
        return;
      }
      // The wordmark canvas draws PIXELATE at canvasH*0.52 with textBaseline="middle".
      // fontSize = canvasH*0.66, so the top of the letter is at canvasH*0.52 - canvasH*0.33 = canvasH*0.19.
      // Offset the video column down by that amount so the video top aligns with PIXELATE.
      const canvasH = Math.max(100, Math.round(window.innerHeight * 0.2));
      const topOffset = Math.floor(canvasH * 0.19);
      videoColRef.current.style.paddingTop = topOffset + "px";
      videoColRef.current.style.height = textColRef.current.offsetHeight + "px";
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (textColRef.current) ro.observe(textColRef.current);
    window.addEventListener("resize", sync);
    return () => { ro.disconnect(); window.removeEventListener("resize", sync); };
  }, []);

  const heroVideo =
    demoVideos.find((v) => v.includes("pixelate(8).webm") || v.includes("pixelate_8_.webm")) ??
    demoVideos[0] ??
    null;
  const marquee = demoVideos.filter(
    (v) => !v.includes("pixelate(11).webm") && !v.includes("pixelate_11_.webm")
  );
  const marqueeTrack = marquee.length ? [...marquee, ...marquee] : [];

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastPointAt.current < 22) return;
      lastPointAt.current = now;
      const point: TrailPoint = {
        id: trailId.current++,
        x: e.clientX,
        y: e.clientY,
        glyph: ASCII_TRAIL[Math.floor(Math.random() * ASCII_TRAIL.length)],
        size: 14 + Math.floor(Math.random() * 5),
        hue: 34 + Math.random() * 18,
      };
      setTrail((prev) => [...prev.slice(-70), point]);
      setTimeout(() => {
        setTrail((prev) => prev.filter((p) => p.id !== point.id));
      }, 900);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="ed-root text-[#0a0a0a]" style={{ fontFamily: MONO_STACK }}>
      <div className="ed-noise pointer-events-none" />
      {activeMedia && <MediaModal src={activeMedia} onClose={() => setActiveMedia(null)} />}
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="pointer-events-none fixed inset-0 z-[90]">
        {trail.map((p) => (
          <span
            key={p.id}
            className="ed-trail-glyph absolute"
            style={{ left: p.x, top: p.y, fontSize: p.size, color: `hsla(${p.hue}, 60%, 15%, 1)` }}
          >
            {p.glyph}
          </span>
        ))}
      </div>

      <nav className="ed-nav">
        <div className="text-[12px] uppercase tracking-[0.2em] text-black/100">PIXELATE</div>
        <div
          className="hidden md:flex items-center gap-6"
          style={{ fontFamily: "Geist, Inter, 'Segoe UI', sans-serif" }}
        >
          <NavLink href={GITHUB_URL} external>
            Github
          </NavLink>
          <NavLink href="/app">
            Open App →
          </NavLink>
        </div>
        <button
          className="ed-hamburger md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="ed-hero" data-io>
        <div className="editorial-grid ed-hero-grid w-full pt-20 md:pt-28">
          <div ref={textColRef} className="col-span-12 md:col-span-6 md:self-start md:pr-10 md:pl-6">
            <div data-io-child>
              <AsciiWordmark />
            </div>
            <div data-io-child className="mt-3 text-[10px] uppercase tracking-[0.2em] text-black/100">
             A tool for creatives
            </div>
            <h1
              data-io-child
              className="mt-3 text-left leading-[0.95]"
              style={{
                fontFamily: PLAYFAIR_STACK,
                fontStyle: "normal",
                fontSize: "clamp(40px, 8vw, 140px)",
              }}
            >
              <span className="block">Any image or video,</span>
              <span className="block">infinite styles.</span>
            </h1>
            <p
              data-io-child
              className="mt-5 md:mt-10 max-w-2xl text-[13px] md:text-[15px] leading-[1.8] tracking-[0.02em] text-black/70"
            >
              30+ render modes. Timeline editor. Export anything. Runs entirely in your browser.
            </p>
          </div>
          <div
            ref={videoColRef}
            data-io-child
            className="col-span-12 md:col-span-6 mt-6 md:mt-0"
          >
            {heroVideo ? (
              <div className="ed-hero-bleed">
                <video autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover">
                  <source src={heroVideo} type="video/webm" />
                </video>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Showcase ── */}
      <section className="ed-showcase" data-io>
        <div className="editorial-grid">
          <div className="col-span-12">
            <div className="ed-marquee-wrap">
              <div className="ed-marquee-track">
                {marqueeTrack.map((src, idx) => (
                  <article
                    key={`${src}-${idx}`}
                    className="ed-marquee-item cursor-pointer"
                    onClick={() => setActiveMedia(src)}
                  >
                    <video autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover pointer-events-none">
                      <source src={src} type="video/webm" />
                    </video>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Before / After ── */}
      <BeforeAfter />

      {/* ── Features ── */}
      <section className="ed-features" data-io>
        <div className="editorial-grid">
          <div className="col-span-12">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">
              Capabilities
            </div>
            <div className="mt-5 border-t border-black/10">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  data-io-child
                  className="ed-cap-row"
                >
                  <div className="ed-cap-title">{cap.title}</div>
                  <div className="ed-cap-desc">{cap.description}</div>
                  <div className="ed-cap-tag">{cap.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ed-cta" data-io>
        <div className="editorial-grid">
          <div className="col-span-12">
            <h2
              className="mx-auto max-w-5xl leading-[0.95]"
              style={{
                fontFamily: PLAYFAIR_STACK,
                fontStyle: "normal",
                fontSize: "clamp(72px, 10vw, 160px)",
              }}
            >
              Start making
              <br />
              something.
            </h2>
            <div className="mt-10">
              <CTAButton />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="ed-footer">
        <div className="editorial-grid border-t border-black/10 pt-6">
          <div className="col-span-12 md:col-span-6 text-left">
            <div className="text-[12px] uppercase tracking-[0.2em] text-black/70">PIXELATE</div>
            <div className="mt-2 text-[11px] text-black/45">by Angelo Gonzalez</div>
            <div className="mt-2 text-[11px] text-black/45">© 2026</div>
          </div>
          <div className="col-span-12 md:col-span-6 mt-5 md:mt-0 md:text-right">
            <div className="flex gap-6 md:justify-end">
              <NavLink href={GITHUB_URL} external>
                Github
              </NavLink>
              <NavLink href="/app">
                Open App
              </NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
