/* extras.jsx — PantryBuilder, CustomCursor, MobileNav, ScrollReveal */
const { useState, useEffect, useRef } = React;

/* ─── Custom Cursor ─────────────────────────────────────────────── */
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const label = useRef("");
  const raf = useRef(null);

  useEffect(() => {
    const isTouchDev = window.matchMedia("(pointer: coarse)").matches;
    if (isTouchDev) return;

    document.body.style.cursor = "none";

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const el = document.elementFromPoint(e.clientX, e.clientY);
      // Walk up to find cursor-label
      let cur = el;
      let found = "";
      while (cur && cur !== document.body) {
        if (cur.dataset?.cursorLabel) { found = cur.dataset.cursorLabel; break; }
        cur = cur.parentElement;
      }
      label.current = found;

      const isLink = el?.closest("a, button, [role=button]");
      const dot = dotRef.current;
      const ringEl = ringRef.current;
      if (dot && ringEl) {
        if (found) {
          dot.style.opacity = "0";
          ringEl.style.width = "80px";
          ringEl.style.height = "80px";
          ringEl.style.background = "rgba(233,185,91,0.9)";
          ringEl.style.mixBlendMode = "normal";
          ringEl.querySelector(".cursor-label").textContent = found.split(" ").slice(0,2).join(" ");
          ringEl.querySelector(".cursor-label").style.opacity = "1";
        } else if (isLink) {
          dot.style.opacity = "1";
          ringEl.style.width = "40px";
          ringEl.style.height = "40px";
          ringEl.style.background = "rgba(31,42,26,0.15)";
          ringEl.style.mixBlendMode = "multiply";
          ringEl.querySelector(".cursor-label").style.opacity = "0";
        } else {
          dot.style.opacity = "1";
          ringEl.style.width = "28px";
          ringEl.style.height = "28px";
          ringEl.style.background = "transparent";
          ringEl.style.mixBlendMode = "normal";
          ringEl.querySelector(".cursor-label").style.opacity = "0";
        }
      }
    };

    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.14;
      ring.current.y += (pos.current.y - ring.current.y) * 0.14;
      const dot = dotRef.current;
      const ringEl = ringRef.current;
      if (dot) {
        dot.style.transform = `translate(${pos.current.x - 3}px, ${pos.current.y - 3}px)`;
      }
      if (ringEl) {
        const w = parseFloat(ringEl.style.width) || 28;
        const h = parseFloat(ringEl.style.height) || 28;
        ringEl.style.transform = `translate(${ring.current.x - w / 2}px, ${ring.current.y - h / 2}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div ref={dotRef} style={{
        position: "fixed", top: 0, left: 0,
        width: 6, height: 6, borderRadius: "50%",
        background: "var(--olv-ink)",
        pointerEvents: "none", zIndex: 9999,
        transition: "opacity .15s",
      }} />
      {/* Ring */}
      <div ref={ringRef} style={{
        position: "fixed", top: 0, left: 0,
        width: 28, height: 28, borderRadius: "50%",
        border: "1.5px solid rgba(31,42,26,0.4)",
        pointerEvents: "none", zIndex: 9998,
        transition: "width .25s, height .25s, background .25s",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <span className="cursor-label" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--olv-ink)", opacity: 0, transition: "opacity .2s",
          textAlign: "center", lineHeight: 1.2, padding: "0 4px",
        }}></span>
      </div>
    </>
  );
}

/* ─── Pantry Builder ────────────────────────────────────────────── */
function PantryBuilder({ products, onAdd, onClose }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState({});

  const steps = [
    {
      q: "What's your kitchen mood?",
      sub: "Pick the flavors that call to you right now.",
      key: "mood",
      options: [
        { val: "bold",  label: "Bold & peppery",  icon: "◉", desc: "Assertive. Makes itself known.", tones: ["evoo", "infused"] },
        { val: "gentle", label: "Soft & buttery",  icon: "○", desc: "Calm. Lets everything else shine.", tones: ["evoo", "honey"] },
        { val: "bright", label: "Bright & acidic", icon: "◈", desc: "Awake. Cuts through richness.", tones: ["vinegar", "infused"] },
        { val: "sweet",  label: "Sweet & floral",  icon: "◎", desc: "Generous. Sunday morning energy.", tones: ["honey", "vinegar"] },
      ],
    },
    {
      q: "How do you mostly cook?",
      sub: "There are no wrong answers here.",
      key: "use",
      options: [
        { val: "finish",  label: "Finishing everything",   icon: "◐", desc: "Drizzle at the table. Obsessively." },
        { val: "cook",    label: "Daily cooking",          icon: "◑", desc: "High heat, roasting, sautéing." },
        { val: "gift",    label: "Gifting to someone good", icon: "◓", desc: "Someone who deserves the good bottle." },
        { val: "explore", label: "Exploring new flavors",  icon: "◒", desc: "I want to be surprised." },
      ],
    },
    {
      q: "How much do you spend on a good bottle of wine?",
      sub: "For calibration purposes only. No judgment.",
      key: "budget",
      options: [
        { val: "low",  label: "Under $20",    icon: "◌", desc: "Practical is perfect." },
        { val: "mid",  label: "$20 – $40",    icon: "◍", desc: "The sweet spot." },
        { val: "high", label: "$40 – $60",    icon: "●", desc: "Worth every cent." },
        { val: "open", label: "What it costs", icon: "◉", desc: "Don't even show me a price." },
      ],
    },
  ];

  const recommendations = useMemo(() => {
    const mood = picks.mood;
    const catMap = {
      bold: ["evoo", "infused"],
      gentle: ["evoo", "honey"],
      bright: ["vinegar", "infused"],
      sweet: ["honey", "vinegar"],
    };
    const cats = catMap[mood] || ["evoo"];
    return products
      .filter(p => cats.includes(p.cat))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  }, [picks, products]);

  const cur = steps[step];

  if (step >= steps.length) {
    return (
      <div style={{ padding: "60px 40px", maxWidth: 900, marginInline: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 14 }}>
            ✶ Your pantry, matched
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 4vw, 54px)", margin: "0 0 14px", fontWeight: 400, letterSpacing: "-0.01em" }}>
            We found your four.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "var(--olv-ink-soft)", maxWidth: 480, marginInline: "auto", lineHeight: 1.55 }}>
            Based on your answers — a {picks.mood} mood, {picks.use} style — here's where we'd start.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 40 }}>
          {recommendations.map(p => (
            <div key={p.id}>
              <div style={{ aspectRatio: "3/4", marginBottom: 12 }}>
                <Placeholder label={p.name} tone={p.tone} />
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>{p.name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 3, marginBottom: 12 }}>{p.note} · ${p.price}</div>
              <button onClick={() => onAdd(p)} style={{
                background: "var(--olv-ink)", color: "var(--olv-cream)",
                border: 0, padding: "10px 16px", borderRadius: 999, width: "100%",
                fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}><Icon.plus /> Add to bag</button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={() => { setStep(0); setPicks({}); }} style={{
            background: "transparent", color: "var(--olv-ink-soft)",
            border: "1px solid rgba(31,42,26,0.2)", padding: "11px 22px", borderRadius: 999,
            fontFamily: "'Inter', sans-serif", fontSize: 13, cursor: "pointer", marginRight: 10,
          }}>Start over</button>
          <button onClick={onClose} style={{
            background: "var(--olv-amber)", color: "var(--olv-ink)",
            border: 0, padding: "11px 22px", borderRadius: 999,
            fontFamily: "'Inter', sans-serif", fontSize: 13, cursor: "pointer",
          }}>Back to shop <Icon.arrow /></button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--olv-bg)", display: "flex", flexDirection: "column" }}>
      {/* Progress */}
      <div style={{ background: "var(--olv-cream)", padding: "20px 28px", borderBottom: "1px solid rgba(31,42,26,0.08)" }}>
        <div style={{ maxWidth: 900, marginInline: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          <button onClick={onClose} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink-soft)", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>← Back</button>
          <div style={{ flex: 1, height: 3, background: "rgba(31,42,26,0.1)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${((step) / steps.length) * 100}%`, height: "100%", background: "var(--olv-moss)", transition: "width .4s" }} />
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.16em", color: "var(--olv-ink-soft)" }}>
            {step + 1} / {steps.length}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 28px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 16 }}>
          Question {step + 1}
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 4vw, 52px)", margin: "0 0 10px", fontWeight: 400, letterSpacing: "-0.015em", textAlign: "center" }}>
          {cur.q}
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "var(--olv-ink-soft)", marginBottom: 44, textAlign: "center" }}>{cur.sub}</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: 14,
          maxWidth: 700, width: "100%",
        }}>
          {cur.options.map(opt => (
            <button
              key={opt.val}
              onClick={() => {
                setPicks(p => ({ ...p, [cur.key]: opt.val }));
                setTimeout(() => setStep(s => s + 1), 260);
              }}
              style={{
                background: picks[cur.key] === opt.val ? "var(--olv-ink)" : "var(--olv-cream)",
                color: picks[cur.key] === opt.val ? "var(--olv-cream)" : "var(--olv-ink)",
                border: "1.5px solid rgba(31,42,26,0.15)",
                padding: "22px 24px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all .18s",
              }}
            >
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, marginBottom: 6 }}>{opt.icon}</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, marginBottom: 6, letterSpacing: "-0.01em" }}>{opt.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, opacity: 0.7, lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile Nav ────────────────────────────────────────────────── */
function MobileNav({ open, onClose, setRoute, cartCount, onOpenCart }) {
  const links = [
    { id: "shop", label: "Shop" },
    { id: "gifts", label: "Gifts" },
    { id: "journal", label: "Journal" },
    { id: "builder", label: "Build My Pantry ✦" },
    { id: "story", label: "Our Story" },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(31,42,26,0.5)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity .3s", zIndex: 80,
      }} />
      <div style={{
        position: "fixed", top: 0, left: 0, height: "100%",
        width: 300, background: "var(--olv-bg)",
        transform: open ? "translateX(0)" : "translateX(-105%)",
        transition: "transform .35s cubic-bezier(.2,.8,.2,1)",
        zIndex: 90, display: "flex", flexDirection: "column",
        padding: "28px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <Logo size={18} />
          <button onClick={onClose} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink)" }}><Icon.close /></button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {links.map(l => (
            <a key={l.id} href="#" onClick={(e) => { e.preventDefault(); setRoute(l.id); onClose(); }} style={{
              fontFamily: "'DM Serif Display', serif", fontSize: 28,
              color: "var(--olv-ink)", textDecoration: "none",
              padding: "10px 0", borderBottom: "1px solid rgba(31,42,26,0.06)",
              letterSpacing: "-0.01em",
            }}>{l.label}</a>
          ))}
        </nav>
        <div style={{ marginTop: "auto" }}>
          <button onClick={() => { onOpenCart(); onClose(); }} style={{
            width: "100%", background: "var(--olv-ink)", color: "var(--olv-cream)",
            border: 0, padding: "14px 20px", borderRadius: 999,
            fontFamily: "'Inter', sans-serif", fontSize: 13.5, cursor: "pointer",
            display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
          }}>
            <Icon.bag /> Bag ({cartCount})
          </button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { CustomCursor, PantryBuilder, MobileNav });
