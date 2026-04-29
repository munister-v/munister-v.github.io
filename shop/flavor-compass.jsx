/* flavor-compass.jsx — Interactive 2D taste map */
const { useState, useRef, useEffect, useMemo } = React;

/*
  Axes:
    X: Delicate (left, -1) ↔ Bold (right, +1)
    Y: Sweet (bottom, -1) ↔ Savory / Umami (top, +1)

  Each product gets a fixed coordinate.
*/
const POSITIONS = {
  "evoo-robusto":  { x:  0.78, y:  0.68 },
  "evoo-delicato": { x: -0.42, y:  0.32 },
  "evoo-citrus":   { x:  0.28, y: -0.18 },
  "honey-acacia":  { x: -0.72, y: -0.80 },
  "honey-chestnut":{ x:  0.38, y: -0.70 },
  "honey-meadow":  { x: -0.80, y: -0.62 },
  "vin-cherry":    { x:  0.52, y: -0.24 },
  "vin-rose":      { x: -0.30, y: -0.34 },
  "vin-honey":     { x:  0.10, y: -0.52 },
  "inf-garlic":    { x:  0.68, y:  0.78 },
  "inf-basil":     { x:  0.20, y:  0.48 },
  "inf-chili":     { x:  0.90, y:  0.88 },
};

const CAT_COLORS = {
  evoo:    "#C9A040",
  honey:   "#D4772A",
  vinegar: "#7A3D5C",
  infused: "#3E5A35",
};
const CAT_LABELS = { evoo:"Olive Oil", honey:"Honey", vinegar:"Vinegar", infused:"Infused Oil" };

function FlavorCompass({ products, onOpen }) {
  const [hovered, setHovered] = useState(null);
  const [active, setActive]   = useState(null); // filter by cat
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, side: "right" });
  const svgRef = useRef(null);

  const W = 760, H = 520, PAD = 64;
  const cx = W / 2, cy = H / 2;
  const rx = (W - PAD * 2) / 2;
  const ry = (H - PAD * 2) / 2;

  const toSvg = (nx, ny) => ({
    x: cx + nx * rx,
    y: cy - ny * ry, // SVG y flipped
  });

  const visible = useMemo(() =>
    products.filter(p => POSITIONS[p.id] && (!active || p.cat === active)),
    [products, active]
  );

  const hoveredProduct = hovered ? products.find(p => p.id === hovered) : null;

  const handleDotEnter = (e, p) => {
    setHovered(p.id);
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pos = toSvg(POSITIONS[p.id].x, POSITIONS[p.id].y);
    const svgScale = rect.width / W;
    const screenX = rect.left + pos.x * svgScale;
    const screenY = rect.top  + pos.y * svgScale;
    setTooltipPos({
      x: screenX,
      y: screenY,
      side: POSITIONS[p.id].x > 0.4 ? "left" : "right",
    });
  };

  return (
    <section style={{ background: "var(--olv-ink)", color: "var(--olv-cream)", padding: "90px 28px" }}>
      <div style={{ maxWidth: 1100, marginInline: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 18 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.55, marginBottom: 12 }}>
              ◈ Flavor compass
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 3.8vw, 52px)", margin: 0, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.05 }}>
              Find your flavor.
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, opacity: 0.65, marginTop: 10, maxWidth: 440, lineHeight: 1.55 }}>
              Every product plotted on two axes. Hover to preview. Click to explore.
            </p>
          </div>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button onClick={() => setActive(null)} style={{
              background: !active ? "var(--olv-amber)" : "rgba(255,255,255,0.08)",
              color: !active ? "var(--olv-ink)" : "var(--olv-cream)",
              border: 0, padding: "8px 14px", borderRadius: 999,
              fontFamily: "'Inter', sans-serif", fontSize: 12.5, cursor: "pointer", transition: "all .15s",
            }}>All</button>
            {Object.entries(CAT_LABELS).map(([id, label]) => (
              <button key={id} onClick={() => setActive(active === id ? null : id)} style={{
                background: active === id ? CAT_COLORS[id] : "rgba(255,255,255,0.08)",
                color: "var(--olv-cream)",
                border: 0, padding: "8px 14px", borderRadius: 999,
                fontFamily: "'Inter', sans-serif", fontSize: 12.5, cursor: "pointer", transition: "all .15s",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* SVG Map */}
        <div style={{ position: "relative", userSelect: "none" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", display: "block" }}
          >
            {/* Grid */}
            {[-0.5, 0, 0.5].map(v => {
              const { x: gx, y: gy } = toSvg(v, 0);
              const { x: gx2, y: gy2 } = toSvg(0, v);
              return (
                <g key={v}>
                  <line x1={gx} y1={PAD} x2={gx} y2={H - PAD}
                    stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray={v === 0 ? "0" : "4 6"} />
                  <line x1={PAD} y1={gy2} x2={W - PAD} y2={gy2}
                    stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray={v === 0 ? "0" : "4 6"} />
                </g>
              );
            })}
            {/* Main axes */}
            <line x1={PAD} y1={cy} x2={W - PAD} y2={cy} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <line x1={cx} y1={PAD} x2={cx} y2={H - PAD} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />

            {/* Axis labels */}
            <text x={PAD + 8} y={cy - 10} fill="rgba(255,255,255,0.4)" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.16em" textAnchor="start">DELICATE</text>
            <text x={W - PAD - 8} y={cy - 10} fill="rgba(255,255,255,0.4)" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.16em" textAnchor="end">BOLD</text>
            <text x={cx} y={PAD + 18} fill="rgba(255,255,255,0.4)" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.16em" textAnchor="middle">SAVORY</text>
            <text x={cx} y={H - PAD - 10} fill="rgba(255,255,255,0.4)" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.16em" textAnchor="middle">SWEET</text>

            {/* Quadrant labels (corner) */}
            {[
              { nx:-0.85, ny: 0.78, label:"Gentle\nfinishing" },
              { nx: 0.85, ny: 0.78, label:"Assertive\npeppery" },
              { nx:-0.85, ny:-0.78, label:"Floral\nhoney" },
              { nx: 0.85, ny:-0.78, label:"Rich\nfruity" },
            ].map(({ nx, ny, label }) => {
              const { x: qx, y: qy } = toSvg(nx, ny);
              return label.split("\n").map((line, i) => (
                <text key={`${nx}${ny}${i}`} x={qx} y={qy + i * 16}
                  fill="rgba(255,255,255,0.2)" fontFamily="'DM Serif Display', serif" fontSize="13"
                  fontStyle="italic" textAnchor="middle">{line}</text>
              ));
            })}

            {/* Products (non-hovered, non-active dimmed) */}
            {products.filter(p => POSITIONS[p.id]).map(p => {
              const pos = POSITIONS[p.id];
              const { x: px, y: py } = toSvg(pos.x, pos.y);
              const isHov = hovered === p.id;
              const dimmed = (active && p.cat !== active) || (hovered && !isHov && !active);
              const r = isHov ? 12 : 8;
              const col = CAT_COLORS[p.cat] || "#999";
              return (
                <g key={p.id}
                  onMouseEnter={e => handleDotEnter(e, p)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onOpen(p)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Pulse ring on hover */}
                  {isHov && (
                    <circle cx={px} cy={py} r={22} fill="none" stroke={col} strokeWidth="1.5" opacity="0.4">
                      <animate attributeName="r" from="14" to="28" dur=".8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur=".8s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={px} cy={py} r={r}
                    fill={col}
                    opacity={dimmed ? 0.18 : 1}
                    style={{ transition: "r .2s, opacity .25s" }}
                  />
                  {/* Label on hover */}
                  {isHov && (
                    <text x={px} y={py - 18}
                      fill="white" fontFamily="'DM Serif Display', serif" fontSize="14"
                      textAnchor="middle" style={{ pointerEvents: "none" }}>
                      {p.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating product card (portal-style, fixed) */}
          {hoveredProduct && (
            <div style={{
              position: "fixed",
              left: tooltipPos.side === "right" ? tooltipPos.x + 18 : tooltipPos.x - 240,
              top: tooltipPos.y - 60,
              width: 220,
              background: "var(--olv-cream)", color: "var(--olv-ink)",
              padding: "16px",
              pointerEvents: "none",
              zIndex: 300,
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}>
              <div style={{ aspectRatio: "3/2", marginBottom: 10 }}>
                <Placeholder label={hoveredProduct.name} tone={hoveredProduct.tone} />
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, lineHeight: 1.1, marginBottom: 4 }}>{hoveredProduct.name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--olv-ink-soft)", marginBottom: 8 }}>{hoveredProduct.note}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {hoveredProduct.tasting.map(t => (
                  <span key={t} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", border: "1px solid rgba(31,42,26,0.2)", padding: "3px 7px" }}>{t}</span>
                ))}
              </div>
              <div style={{ marginTop: 10, fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>${hoveredProduct.price}</div>
              <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--olv-moss)", opacity: 0.9 }}>Click to explore →</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 22, marginTop: 28, flexWrap: "wrap" }}>
          {Object.entries(CAT_COLORS).map(([cat, col]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: col, display: "inline-block" }} />
              {CAT_LABELS[cat]}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FlavorCompass });
