const { useState, useMemo } = React;

function Placeholder({ label, tone = "dark", style, src, alt }) {
  const t = {
    dark: { bg: "#ddd3c1", fg: "#766a59", stripe: "rgba(118,106,89,0.16)" },
    gold: { bg: "#ecd6bf", fg: "#95613d", stripe: "rgba(149,97,61,0.16)" },
    cream: { bg: "#f2e7d8", fg: "#917961", stripe: "rgba(145,121,97,0.14)" },
    amber: { bg: "#efcfb8", fg: "#a35b35", stripe: "rgba(163,91,53,0.14)" },
    moss: { bg: "#dce2d2", fg: "#667255", stripe: "rgba(102,114,85,0.14)" },
    sage: { bg: "#e4e7db", fg: "#6d745d", stripe: "rgba(109,116,93,0.14)" },
    terra: { bg: "#ead1c4", fg: "#9a6953", stripe: "rgba(154,105,83,0.14)" },
    plum: { bg: "#e5d8d5", fg: "#816661", stripe: "rgba(129,102,97,0.14)" },
    bone: { bg: "#f5efe5", fg: "#887d6d", stripe: "rgba(136,125,109,0.12)" },
    light: { bg: "#fcf7ef", fg: "#a6947c", stripe: "rgba(166,148,124,0.09)" },
  };
  const c = t[tone] || t.dark;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", ...style }}>
      {src ? (
        <img
          src={src}
          alt={alt || label}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%",
          height: "100%",
          background: `repeating-linear-gradient(135deg,${c.bg} 0 14px,${c.stripe} 14px 15px)`,
          color: c.fg,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", padding: "8px 10px", opacity: 0.7 }}>
            ▦ {label}
          </span>
        </div>
      )}
    </div>
  );
}

const Icon = {
  search: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>),
  bag: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>),
  arrow: (p) => (<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>),
  close: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  minus: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M5 12h14"/></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" {...p}><path d="M12 2.5 14.6 9l6.9.5-5.3 4.5 1.7 6.7L12 17l-5.9 3.7 1.7-6.7L2.5 9.5 9.4 9z"/></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="m5 12 5 5 9-11"/></svg>),
};

function Logo({ color, size = 22 }) {
  const c = color || "var(--olv-ink)";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, color: c }}>
      <svg width={size + 4} height={size} viewBox="0 0 34 26" fill="none">
        <path d="M2 23 L10 6 L17 17 L24 6 L32 23" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="2" y1="23" x2="32" y2="23" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="17" cy="3.5" r="2.1" fill={c}/>
      </svg>
      <span style={{ fontFamily: "var(--font-display)", fontSize: size, letterSpacing: "0.18em", fontWeight: 700 }}>MUNISTER</span>
    </div>
  );
}

function AnnouncementBar({ copy }) {
  return (
    <div style={{
      background: "var(--olv-night)",
      color: "rgba(255,247,235,0.92)",
      fontSize: 11.5,
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-label)",
      letterSpacing: "0.08em",
      fontWeight: 500,
      textAlign: "center",
    }}>
      {copy.announcement}
    </div>
  );
}

const btnPrimary = {
  background: "var(--olv-ink)",
  color: "var(--olv-surface)",
  border: 0,
  padding: "14px 24px",
  borderRadius: 999,
  fontSize: 12.5,
  fontFamily: "var(--font-label)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const btnGold = {
  background: "rgba(255,250,242,0.78)",
  color: "var(--olv-ink)",
  border: "1px solid var(--olv-border-gold)",
  padding: "14px 24px",
  borderRadius: 999,
  fontSize: 12.5,
  fontFamily: "var(--font-label)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const iconBtn = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "inherit",
  padding: 6,
  display: "inline-flex",
  alignItems: "center",
};

function Hero({ copy, onShop, onGifts }) {
  return (
    <section style={{
      background: "var(--olv-terra)",
      color: "var(--olv-light)",
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      position: "relative",
      overflow: "hidden",
      borderBottom: "1px solid rgba(0,0,0,0.18)",
    }} className="olv-hero-grid">
      {/* Decorative oversized M */}
      <div aria-hidden="true" style={{ position: "absolute", top: -40, left: -20, fontFamily: "var(--font-display)", fontSize: "26vw", color: "transparent", WebkitTextStroke: "1px rgba(255,247,235,0.13)", lineHeight: 0.9, pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap", fontWeight: 500, fontStyle: "italic" }}>Munister</div>

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "96px 60px 96px 56px", position: "relative", zIndex: 2 }} className="olv-hero-padding">
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,247,235,0.78)", marginBottom: 28, display: "inline-flex", alignItems: "center", gap: 12, fontWeight: 500 }}>
          <span style={{ width: 28, height: 1, background: "currentColor", display: "inline-block" }} />
          {copy.hero.eyebrow}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(56px,6.6vw,108px)", lineHeight: 0.96, letterSpacing: "-0.025em", color: "var(--olv-light)", margin: "0 0 28px", fontWeight: 500 }}>
          {copy.hero.titleA}
          <br />
          {copy.hero.titleB}{" "}
          <em style={{ fontStyle: "italic", color: "#f3d7a5", fontWeight: 500 }}>{copy.hero.titleC}</em>
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 16.5, lineHeight: 1.65, color: "rgba(255,247,235,0.86)", maxWidth: 480, margin: "0 0 36px", fontWeight: 400 }}>
          {copy.hero.body}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={onShop} style={{ ...btnPrimary, background: "var(--olv-light)", color: "var(--olv-ink)" }}>{copy.hero.primary} <Icon.arrow /></button>
          <button onClick={onGifts} style={{ ...btnGold, background: "transparent", color: "var(--olv-light)", borderColor: "rgba(255,247,235,0.4)" }}>{copy.hero.secondary}</button>
        </div>
        <div className="olv-hero-stats" style={{ marginTop: 56, display: "flex", gap: 44, paddingTop: 28, borderTop: "1px solid rgba(255,247,235,0.18)", flexWrap: "wrap" }}>
          {copy.hero.stats.map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 38, color: "var(--olv-light)", lineHeight: 1, fontWeight: 500 }}>{n}</div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,247,235,0.7)", marginTop: 8, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="olv-hero-img" style={{ position: "relative", overflow: "hidden", minHeight: 480 }}>
        <Placeholder src={copy.hero.image} label="hero" tone="gold" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(184,82,30,0.12) 0%, rgba(28,42,31,0.18) 100%)" }} />
        <div className="olv-hero-card" style={{ position: "absolute", bottom: 36, left: 36, right: 36, background: "var(--olv-light)", color: "var(--olv-ink)", padding: "26px 28px", maxWidth: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 10, fontWeight: 700 }}>{copy.hero.cardEyebrow}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-ink)", lineHeight: 1.18, fontWeight: 500, letterSpacing: "-0.01em" }}>{copy.hero.cardTitle}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--olv-ink-soft)", marginTop: 12, lineHeight: 1.65, fontWeight: 400 }}>{copy.hero.cardBody}</div>
        </div>
      </div>
    </section>
  );
}

function ColorStrip({ tone = "moss", eyebrow, title, body, cta, onClick, image }) {
  const palettes = {
    moss:  { bg: "var(--olv-moss-deep)", fg: "var(--olv-light)", accent: "#d8a06b" },
    plum:  { bg: "var(--olv-plum)", fg: "#f6e6d8", accent: "#e8b078" },
    cream: { bg: "var(--olv-cream)", fg: "var(--olv-ink)", accent: "var(--olv-amber)" },
    night: { bg: "var(--olv-night)", fg: "var(--olv-light)", accent: "#e0a36b" },
  };
  const p = palettes[tone] || palettes.moss;
  return (
    <section style={{ background: p.bg, color: p.fg, padding: "110px 56px", position: "relative", overflow: "hidden" }} className="olv-color-strip">
      <div style={{ maxWidth: 1280, marginInline: "auto", display: "grid", gridTemplateColumns: image ? "1.1fr 0.9fr" : "1fr", gap: 64, alignItems: "center" }} className="olv-founder-grid">
        <div>
          {eyebrow ? <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: p.accent, marginBottom: 20, fontWeight: 700 }}>{eyebrow}</div> : null}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,4.4vw,60px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 22px", fontWeight: 500, color: p.fg }}>{title}</h2>
          {body ? <p style={{ fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7, color: p.fg, opacity: 0.84, maxWidth: 560, margin: "0 0 28px", fontWeight: 400 }}>{body}</p> : null}
          {cta ? <button onClick={onClick} style={{ background: p.fg, color: p.bg, border: 0, padding: "14px 26px", borderRadius: 999, fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>{cta} <Icon.arrow /></button> : null}
        </div>
        {image ? <div style={{ aspectRatio: "4/5", position: "relative", overflow: "hidden", borderRadius: 4 }}><Placeholder src={image} tone={tone} label="" style={{ position: "absolute", inset: 0 }} /></div> : null}
      </div>
    </section>
  );
}

function PantryGrid({ copy, cards, onCategory }) {
  return (
    <section style={{ background: "var(--olv-surface)", padding: "110px 0 0" }} className="olv-section-pad">
      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "0 48px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 12, fontWeight: 700 }}>{copy.home.categoriesEyebrow}</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(42px,4.6vw,62px)", margin: 0, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--olv-ink)" }}>{copy.home.categoriesTitle}</h2>
          </div>
          <button onClick={() => onCategory("all")} style={btnGold}>{copy.home.shopAll} <Icon.arrow /></button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", height: 500 }} className="olv-pantry-grid">
        {cards.map((card) => (
          <a
            key={card.id}
            href="#"
            onClick={(e) => { e.preventDefault(); onCategory(card.id); }}
            style={{ textDecoration: "none", color: "var(--olv-ink)", position: "relative", overflow: "hidden", display: "block" }}
            className="mn-cat-card"
          >
            <Placeholder src={card.image} label={card.label} tone={card.tone} style={{ position: "absolute", inset: 0 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(35,49,38,0.58) 16%, rgba(35,49,38,0.1) 70%)" }} />
            <div style={{ position: "absolute", top: -20, right: -8, fontFamily: "var(--font-display)", fontSize: 156, color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.22)", lineHeight: 1, pointerEvents: "none", fontWeight: 700 }}>{card.number}</div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px" }}>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff7eb", marginBottom: 8, fontWeight: 700 }}>{card.number}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.02, color: "#fffaf1", fontWeight: 700 }}>{card.label}</div>
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff7eb", opacity: 0, transition: "opacity .25s", fontWeight: 700 }} className="mn-cat-arrow">{copy.common.explore} <Icon.arrow /></div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ p, idx, copy, money, onAdd, onOpen, wishlist, toggleWish }) {
  const [hover, setHover] = useState(false);
  const wished = wishlist?.includes(p.id);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ color: "var(--olv-ink)", position: "relative" }}>
      <div onClick={() => onOpen(p)} style={{ position: "relative", aspectRatio: "3/4", cursor: "pointer", overflow: "hidden", background: "var(--olv-surface)" }}>
        <Placeholder src={p.image} label={p.name} tone={p.tone} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: hover ? "linear-gradient(to top, rgba(35,49,38,0.34), rgba(35,49,38,0.03))" : "transparent", transition: "background .25s" }} />
        <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "var(--font-display)", fontSize: 14, color: "#fff9f1", letterSpacing: "0.06em", fontWeight: 700 }}>{String(idx + 1).padStart(2, "0")}</div>
        {p.tag ? <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(255,250,242,0.94)", color: "var(--olv-ink)", fontFamily: "var(--font-label)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, padding: "6px 9px", border: "1px solid rgba(31,42,26,0.08)" }}>{p.tag}</span> : null}
        {toggleWish ? (
          <button onClick={(e) => { e.stopPropagation(); toggleWish(p.id); }} style={{ position: "absolute", bottom: 12, right: 14, background: "transparent", border: 0, cursor: "pointer", color: wished ? "#fff7eb" : "rgba(255,247,235,0.6)", fontSize: 18, lineHeight: 1, padding: 4 }}>
            {wished ? "♥" : "♡"}
          </button>
        ) : null}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(p); }}
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 44,
            background: "var(--olv-ink)",
            color: "var(--olv-surface)",
            border: 0,
            padding: "10px 14px",
            fontFamily: "var(--font-label)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            transform: hover ? "translateY(0)" : "translateY(8px)",
            opacity: hover ? 1 : 0,
            transition: "all .25s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        ><Icon.plus /> {copy.shop.add} · {money(p.price)}</button>
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.04, letterSpacing: "-0.02em", fontWeight: 700 }}>{p.name}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginTop: 6, fontWeight: 500 }}>{p.note} · {p.size}</div>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-ink)", fontWeight: 700 }}>{money(p.price)}</div>
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--olv-ink-soft)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
        <Icon.star style={{ color: "var(--olv-amber)" }} /> {p.rating} <span style={{ opacity: 0.55 }}>· {p.reviews}</span>
      </div>
    </div>
  );
}

function SeasonalEdit({ products, copy, money, onAdd, onOpen, onShop }) {
  const seasonal = copy.home.seasonal;
  if (!seasonal?.items?.length) return null;
  const cards = seasonal.items
    .map((entry) => ({ entry, product: products.find((p) => p.id === entry.productId) }))
    .filter((item) => item.product);

  if (!cards.length) return null;

  return (
    <section style={{ background: "var(--olv-surface)", padding: "94px 48px 26px" }} className="olv-section-pad">
      <div style={{ maxWidth: 1400, marginInline: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 2.1fr", gap: 34, alignItems: "start" }} className="olv-founder-grid">
          <div style={{ position: "sticky", top: 118 }}>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 14, fontWeight: 700 }}>
              {seasonal.eyebrow}
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,4vw,54px)", margin: "0 0 16px", lineHeight: 1.06, letterSpacing: "-0.03em", color: "var(--olv-ink)", fontWeight: 700 }}>
              {seasonal.title}
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.72, color: "var(--olv-ink-soft)", margin: "0 0 24px", maxWidth: 360, fontWeight: 500 }}>
              {seasonal.body}
            </p>
            <button onClick={onShop} style={btnGold}>{seasonal.footer} <Icon.arrow /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="olv-seasonal-grid">
            {cards.map(({ entry, product }) => (
              <article key={product.id} style={{ background: "var(--olv-bg)", border: "1px solid var(--olv-border)", overflow: "hidden", color: "var(--olv-ink)" }}>
                <div onClick={() => onOpen(product)} style={{ position: "relative", aspectRatio: "4/5", cursor: "pointer", overflow: "hidden" }}>
                  <Placeholder src={product.image} label={product.name} tone={product.tone} style={{ position: "absolute", inset: 0 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(31,42,26,0.18), rgba(31,42,26,0.00) 54%)" }} />
                  <span style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,252,243,0.92)", color: "var(--olv-ink)", fontFamily: "var(--font-label)", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", padding: "6px 10px", fontWeight: 700 }}>
                    {entry.reason}
                  </span>
                </div>
                <div style={{ padding: "22px 20px 20px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: 8, fontWeight: 700 }}>
                    {product.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginBottom: 14, fontWeight: 600 }}>
                    {product.note} · {product.size}
                  </div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.7, color: "var(--olv-ink)", minHeight: 72, margin: "0 0 18px", fontWeight: 500 }}>
                    {entry.line}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>
                      {money(product.price)}
                    </div>
                    <button onClick={() => onAdd(product)} style={{ ...btnPrimary, padding: "11px 18px" }}>
                      <Icon.plus /> {entry.cta}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BestSellers({ products, copy, money, onAdd, onOpen, wishlist, toggleWish }) {
  const [tab, setTab] = useState("all");
  const tabs = [{ id: "all", label: copy.home.shopAll }, ...copy.shop.filters];
  const list = useMemo(() => tab === "all" ? products : products.filter((p) => p.cat === tab), [tab, products]);
  return (
    <section style={{ padding: "110px 48px", background: "var(--olv-bg)" }} className="olv-section-pad">
      <div style={{ maxWidth: 1400, marginInline: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 12, fontWeight: 700 }}>{copy.home.bestEyebrow}</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,4.5vw,58px)", margin: 0, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--olv-ink)" }}>{copy.home.bestTitle}</h2>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? "var(--olv-ink)" : "transparent",
                  color: tab === t.id ? "var(--olv-surface)" : "var(--olv-ink-soft)",
                  border: "1px solid",
                  borderColor: tab === t.id ? "var(--olv-ink)" : "var(--olv-border)",
                  padding: "9px 16px",
                  fontFamily: "var(--font-label)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 28 }} className="olv-products-grid">
          {list.slice(0, 12).map((p, i) => (
            <ProductCard key={p.id} p={p} idx={i} copy={copy} money={money} onAdd={onAdd} onOpen={onOpen} wishlist={wishlist} toggleWish={toggleWish} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FoundersNote({ copy }) {
  const founderImage = window.MUNISTER.assets.teaJar;
  return (
    <section style={{ background: "var(--olv-moss-deep)", color: "var(--olv-light)", padding: "0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 1400, marginInline: "auto" }} className="olv-founder-grid">
        <div style={{ position: "relative", minHeight: 480, aspectRatio: "1/1" }}>
          <Placeholder src={founderImage} label="founder note" tone="moss" style={{ position: "absolute", inset: 0 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(37,53,31,0.18), rgba(0,0,0,0.32))" }} />
        </div>
        <div style={{ padding: "84px 64px", display: "flex", flexDirection: "column", justifyContent: "center" }} className="olv-section-pad">
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#d8a06b", marginBottom: 22, fontWeight: 700 }}>{copy.home.founderEyebrow}</div>
          <blockquote style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.1vw,42px)", lineHeight: 1.18, margin: "0 0 26px", letterSpacing: "-0.015em", color: "var(--olv-light)", fontWeight: 500, fontStyle: "italic" }}>
            "{copy.home.founderQuote}"
          </blockquote>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.75, color: "rgba(255,247,235,0.78)", margin: 0, fontWeight: 400 }}>
            {copy.home.founderBody}
          </p>
          <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 14, paddingTop: 26, borderTop: "1px solid rgba(255,247,235,0.16)" }}>
            <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
              <path d="M4 28 Q16 8,26 24 T50 18 Q62 14,74 26" stroke="#d8a06b" fill="none" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--olv-light)", fontWeight: 500 }}>{copy.home.founderName}</div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,247,235,0.6)", marginTop: 4, fontWeight: 500 }}>{copy.home.founderRole}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Newsletter({ copy }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section style={{ padding: "110px 48px", background: "var(--olv-night)", color: "var(--olv-light)", borderTop: "1px solid rgba(0,0,0,0.4)" }} className="olv-color-strip">
      <div style={{ maxWidth: 640, marginInline: "auto", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#e0a36b", marginBottom: 18, fontWeight: 700 }}>{copy.home.newsletterEyebrow}</div>
        <div style={{ width: 40, height: 1, background: "#e0a36b", opacity: 0.6, marginInline: "auto", marginBottom: 26 }} />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,4.2vw,54px)", margin: "0 0 18px", fontWeight: 500, lineHeight: 1.12, letterSpacing: "-0.015em", color: "var(--olv-light)" }}>{copy.home.newsletterTitle}</h2>
        <p style={{ color: "rgba(255,247,235,0.72)", fontFamily: "var(--font-body)", fontSize: 15.5, marginBottom: 32, lineHeight: 1.7, fontWeight: 400 }}>{copy.home.newsletterBody}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setDone(true); }} style={{ display: "flex", gap: 0, border: "1px solid rgba(224,163,107,0.4)", padding: 4, maxWidth: 500, marginInline: "auto", background: "rgba(255,247,235,0.06)", borderRadius: 999 }} className="olv-mobile-stack">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.home.newsletterPlaceholder}
            style={{ flex: 1, border: 0, background: "transparent", padding: "13px 20px", fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--olv-light)", outline: "none", fontWeight: 400 }}
          />
          <button type="submit" style={{ ...btnPrimary, background: "var(--olv-light)", color: "var(--olv-night)", borderRadius: 999, padding: "12px 24px" }}>
            {done ? <><Icon.check /> {copy.home.newsletterDone}</> : <>{copy.home.newsletterCta} <Icon.arrow /></>}
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer({ copy }) {
  return (
    <footer style={{ background: "var(--olv-night)", color: "var(--olv-light)", padding: "96px 48px 36px" }} className="olv-section-pad">
      <div style={{ maxWidth: 1400, marginInline: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 48, marginBottom: 72 }} className="olv-footer-grid">
          <div>
            <div style={{ color: "var(--olv-light)" }}><Logo size={22} color="var(--olv-light)" /></div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.75, color: "rgba(255,247,235,0.68)", marginTop: 20, maxWidth: 340, fontWeight: 400 }}>{copy.footer.body}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
              {copy.footer.badges.map((badge) => (
                <span key={badge} style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", border: "1px solid rgba(224,163,107,0.3)", padding: "6px 12px", color: "#e0a36b", fontWeight: 600, borderRadius: 999 }}>{badge}</span>
              ))}
            </div>
          </div>
          {copy.footer.cols.map((col) => (
            <div key={col.title}>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#e0a36b", marginBottom: 18, fontWeight: 700 }}>{col.title}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {col.items.map((item) => (
                  <li key={item}><a href="#" style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(255,247,235,0.72)", textDecoration: "none", fontWeight: 400 }}>{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,247,235,0.12)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,247,235,0.5)", fontWeight: 500, gap: 12, flexWrap: "wrap" }}>
          <span>{copy.footer.left}</span>
          <span>{copy.footer.right}</span>
        </div>
      </div>
    </footer>
  );
}

function CartDrawer({ open, onClose, items, setItems, copy, money }) {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const remaining = Math.max(0, 1800 - subtotal);
  const pct = Math.min(100, (subtotal / 1800) * 100);
  const change = (id, delta) => setItems(items.map((it) => it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it).filter((it) => it.qty > 0));
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,12,6,0.7)", backdropFilter: "blur(4px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s", zIndex: 80 }} />
      <aside style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100%",
        width: 420,
        maxWidth: "92vw",
        background: "var(--olv-surface)",
        borderLeft: "1px solid var(--olv-border)",
        transform: open ? "translateX(0)" : "translateX(110%)",
        transition: "transform .35s cubic-bezier(.2,.8,.2,1)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 22px", borderBottom: "1px solid var(--olv-border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-ink)", fontWeight: 700 }}>{copy.cart.title} <span style={{ color: "var(--olv-ink-soft)" }}>({items.reduce((s, it) => s + it.qty, 0)})</span></div>
          <button onClick={onClose} style={iconBtn}><Icon.close /></button>
        </div>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--olv-border)", background: "var(--olv-bg)" }}>
          {remaining === 0 ? (
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-amber)", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}><Icon.check /> {copy.cart.freeShipping}</div>
          ) : (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--olv-ink-soft)", fontWeight: 500 }}><span style={{ color: "var(--olv-amber)", fontWeight: 700 }}>{money(remaining)}</span> {copy.cart.away}</div>
          )}
          <div style={{ height: 2, background: "var(--olv-border)", marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--olv-amber)", transition: "width .3s" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 22px" }}>
          {items.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--olv-ink-soft)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-ink)", marginBottom: 6, fontWeight: 700 }}>{copy.cart.emptyTitle}</div>
              <div style={{ fontSize: 13.5 }}>{copy.cart.emptyBody}</div>
            </div>
          ) : null}
          {items.map((it) => (
            <div key={it.id + it.size} style={{ display: "grid", gridTemplateColumns: "68px 1fr auto", gap: 14, padding: "16px 0", borderBottom: "1px solid var(--olv-border)" }}>
              <div style={{ background: "var(--olv-bg)", aspectRatio: "1/1", overflow: "hidden" }}>
                <Placeholder src={it.image} label={it.name} tone={it.tone || "dark"} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.15, color: "var(--olv-ink)", fontWeight: 700 }}>{it.name}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 3, fontWeight: 500 }}>{it.size}</div>
                <div style={{ display: "inline-flex", marginTop: 10, border: "1px solid var(--olv-border)", alignItems: "center" }}>
                  <button onClick={() => change(it.id, -1)} style={{ ...iconBtn, padding: "6px 10px" }}><Icon.minus /></button>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, padding: "0 8px", minWidth: 14, textAlign: "center", color: "var(--olv-ink)", fontWeight: 700 }}>{it.qty}</span>
                  <button onClick={() => change(it.id, 1)} style={{ ...iconBtn, padding: "6px 10px" }}><Icon.plus /></button>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--olv-amber)", fontWeight: 700 }}>{money(it.price * it.qty)}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 22px", borderTop: "1px solid var(--olv-border)", background: "var(--olv-bg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: 14, marginBottom: 14, color: "var(--olv-ink)", fontWeight: 700 }}>
            <span>{copy.cart.subtotal}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-amber)", fontWeight: 700 }}>{money(subtotal)}</span>
          </div>
          <button style={{ ...btnPrimary, width: "100%", justifyContent: "center", padding: "15px 22px" }} disabled={!items.length}>
            {copy.cart.checkout} · {money(subtotal)} <Icon.arrow />
          </button>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", textAlign: "center", marginTop: 12, fontWeight: 700 }}>{copy.cart.footer}</div>
        </div>
      </aside>
    </>
  );
}

function Toast({ msg }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      left: "50%",
      transform: `translateX(-50%) translateY(${msg ? 0 : 20}px)`,
      opacity: msg ? 1 : 0,
      transition: "all .3s",
      background: "var(--olv-surface)",
      border: "1px solid var(--olv-border-gold)",
      color: "var(--olv-ink)",
      padding: "12px 20px",
      fontFamily: "var(--font-label)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      gap: 10,
      zIndex: 70,
      boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    }}>
      <Icon.check style={{ color: "var(--olv-amber)" }} /> {msg}
    </div>
  );
}

function FeaturedSlab() { return null; }
function Editorial() { return null; }
function Journal() { return null; }
function Marquee() { return null; }
function QuickView() { return null; }

Object.assign(window, {
  Logo,
  Hero,
  PantryGrid,
  SeasonalEdit,
  ProductCard,
  BestSellers,
  FoundersNote,
  Newsletter,
  Footer,
  CartDrawer,
  QuickView,
  Toast,
  Placeholder,
  Icon,
  btnPrimary,
  btnGold,
  iconBtn,
  AnnouncementBar,
  FeaturedSlab,
  Editorial,
  Journal,
  Marquee,
});
