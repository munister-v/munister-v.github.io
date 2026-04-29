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
      background: "#ead8c1",
      color: "var(--olv-ink)",
      fontSize: 11.5,
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-label)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      fontWeight: 800,
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
  fontWeight: 800,
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
  fontWeight: 800,
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
      background: "linear-gradient(180deg, #fbf6ee 0%, #f2e3d3 100%)",
      minHeight: "88vh",
      display: "grid",
      gridTemplateColumns: "1.02fr 0.98fr",
      position: "relative",
      borderBottom: "1px solid var(--olv-border)",
    }} className="olv-hero-grid">
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px 60px 72px 52px", position: "relative" }} className="olv-hero-padding">
        <div style={{ position: "absolute", top: 12, left: 36, fontFamily: "var(--font-display)", fontSize: "22vw", color: "transparent", WebkitTextStroke: "1px rgba(35,49,38,0.05)", lineHeight: 1, pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap" }}>M</div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 12, fontWeight: 800 }}>
            <span style={{ width: 28, height: 1, background: "currentColor", display: "inline-block" }} />
            {copy.hero.eyebrow}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(60px,7vw,104px)", lineHeight: 0.9, letterSpacing: "-0.035em", color: "var(--olv-ink)", margin: "0 0 24px", fontWeight: 700 }}>
            {copy.hero.titleA}
            <br />
            {copy.hero.titleB}
            <br />
            <em style={{ fontStyle: "italic", color: "var(--olv-amber)", fontWeight: 700 }}>{copy.hero.titleC}</em>
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.75, color: "var(--olv-ink-soft)", maxWidth: 500, margin: "0 0 34px", fontWeight: 600 }}>
            {copy.hero.body}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onShop} style={btnPrimary}>{copy.hero.primary} <Icon.arrow /></button>
            <button onClick={onGifts} style={btnGold}>{copy.hero.secondary}</button>
          </div>
          <div style={{ marginTop: 48, display: "flex", gap: 36, paddingTop: 28, borderTop: "1px solid var(--olv-border)", flexWrap: "wrap" }}>
            {copy.hero.stats.map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--olv-ink)", lineHeight: 1, fontWeight: 700 }}>{n}</div>
                <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginTop: 6, fontWeight: 800 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "relative", overflow: "hidden", borderLeft: "1px solid var(--olv-border)" }}>
        <Placeholder src={copy.hero.image} label="hero" tone="gold" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(247,241,230,0.24) 0%, rgba(34,27,20,0.06) 100%)" }} />
        <div style={{ position: "absolute", bottom: 34, left: 28, background: "rgba(255,250,242,0.94)", border: "1px solid var(--olv-border)", padding: "20px 22px", maxWidth: 320, boxShadow: "0 16px 40px rgba(106,84,59,0.08)" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 8, fontWeight: 800 }}>{copy.hero.cardEyebrow}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-ink)", lineHeight: 1.08, fontWeight: 700 }}>{copy.hero.cardTitle}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginTop: 10, lineHeight: 1.65, fontWeight: 600 }}>{copy.hero.cardBody}</div>
        </div>
        <div style={{ position: "absolute", top: 28, right: 28, background: "rgba(255,250,242,0.84)", border: "1px solid var(--olv-border)", padding: "10px 14px", backdropFilter: "blur(8px)" }}>
          <Logo size={13} />
        </div>
      </div>
    </section>
  );
}

function PantryGrid({ copy, cards, onCategory }) {
  return (
    <section style={{ background: "var(--olv-surface)", padding: "90px 0 0" }}>
      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "0 48px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 12, fontWeight: 800 }}>{copy.home.categoriesEyebrow}</div>
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
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff7eb", marginBottom: 8, fontWeight: 800 }}>{card.number}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.02, color: "#fffaf1", fontWeight: 700 }}>{card.label}</div>
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff7eb", opacity: 0, transition: "opacity .25s", fontWeight: 800 }} className="mn-cat-arrow">{copy.common.explore} <Icon.arrow /></div>
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
        {p.tag ? <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(255,250,242,0.94)", color: "var(--olv-ink)", fontFamily: "var(--font-label)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 800, padding: "6px 9px", border: "1px solid rgba(31,42,26,0.08)" }}>{p.tag}</span> : null}
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
            fontWeight: 800,
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
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginTop: 6, fontWeight: 600 }}>{p.note} · {p.size}</div>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--olv-ink)", fontWeight: 700 }}>{money(p.price)}</div>
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--olv-ink-soft)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
        <Icon.star style={{ color: "var(--olv-amber)" }} /> {p.rating} <span style={{ opacity: 0.55 }}>· {p.reviews}</span>
      </div>
    </div>
  );
}

function BestSellers({ products, copy, money, onAdd, onOpen, wishlist, toggleWish }) {
  const [tab, setTab] = useState("all");
  const tabs = [{ id: "all", label: copy.home.shopAll }, ...copy.shop.filters];
  const list = useMemo(() => tab === "all" ? products : products.filter((p) => p.cat === tab), [tab, products]);
  return (
    <section style={{ padding: "96px 48px", background: "var(--olv-bg)" }}>
      <div style={{ maxWidth: 1400, marginInline: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 12, fontWeight: 800 }}>{copy.home.bestEyebrow}</div>
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
                  fontWeight: 800,
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} className="olv-products-grid">
          {list.slice(0, 8).map((p, i) => (
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
    <section style={{ padding: "96px 48px", background: "var(--olv-surface)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 1300, marginInline: "auto", border: "1px solid var(--olv-border)", background: "var(--olv-light)" }} className="olv-founder-grid">
        <div style={{ position: "relative", aspectRatio: "1/1" }}>
          <Placeholder src={founderImage} label="founder note" tone="sage" />
        </div>
        <div style={{ padding: "60px 52px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--olv-light)" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 18, fontWeight: 800 }}>{copy.home.founderEyebrow}</div>
          <blockquote style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3vw,40px)", lineHeight: 1.12, margin: "0 0 22px", letterSpacing: "-0.025em", color: "var(--olv-ink)", fontWeight: 700, fontStyle: "italic" }}>
            "{copy.home.founderQuote}"
          </blockquote>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.75, color: "var(--olv-ink-soft)", margin: 0, fontWeight: 600 }}>
            {copy.home.founderBody}
          </p>
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14, paddingTop: 24, borderTop: "1px solid var(--olv-border)" }}>
            <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
              <path d="M4 28 Q16 8,26 24 T50 18 Q62 14,74 26" stroke="var(--olv-amber)" fill="none" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--olv-ink)", fontWeight: 700 }}>{copy.home.founderName}</div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginTop: 2, fontWeight: 800 }}>{copy.home.founderRole}</div>
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
    <section style={{ padding: "96px 48px", background: "var(--olv-bg)", borderTop: "1px solid var(--olv-border)" }}>
      <div style={{ maxWidth: 620, marginInline: "auto", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 16, fontWeight: 800 }}>{copy.home.newsletterEyebrow}</div>
        <div style={{ width: 40, height: 1, background: "var(--olv-amber)", opacity: 0.5, marginInline: "auto", marginBottom: 24 }} />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,4vw,52px)", margin: "0 0 14px", fontWeight: 700, lineHeight: 1.07, letterSpacing: "-0.03em", color: "var(--olv-ink)" }}>{copy.home.newsletterTitle}</h2>
        <p style={{ color: "var(--olv-ink-soft)", fontFamily: "var(--font-body)", fontSize: 15, marginBottom: 28, lineHeight: 1.7, fontWeight: 600 }}>{copy.home.newsletterBody}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setDone(true); }} style={{ display: "flex", gap: 0, border: "1px solid var(--olv-border-gold)", padding: 4, maxWidth: 500, marginInline: "auto", background: "var(--olv-surface)", borderRadius: 999 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.home.newsletterPlaceholder}
            style={{ flex: 1, border: 0, background: "transparent", padding: "12px 18px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--olv-ink)", outline: "none", fontWeight: 600 }}
          />
          <button type="submit" style={{ ...btnPrimary, borderRadius: 999, padding: "12px 22px" }}>
            {done ? <><Icon.check /> {copy.home.newsletterDone}</> : <>{copy.home.newsletterCta} <Icon.arrow /></>}
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer({ copy }) {
  return (
    <footer style={{ background: "#efe2d0", color: "var(--olv-ink)", padding: "80px 48px 32px", borderTop: "1px solid var(--olv-border)" }}>
      <div style={{ maxWidth: 1400, marginInline: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40, marginBottom: 64 }} className="olv-footer-grid">
          <div>
            <Logo size={20} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.75, color: "var(--olv-ink-soft)", marginTop: 16, maxWidth: 340, fontWeight: 600 }}>{copy.footer.body}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {copy.footer.badges.map((badge) => (
                <span key={badge} style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", border: "1px solid var(--olv-border-gold)", padding: "5px 10px", color: "var(--olv-amber)", fontWeight: 800, borderRadius: 999 }}>{badge}</span>
              ))}
            </div>
          </div>
          {copy.footer.cols.map((col) => (
            <div key={col.title}>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 16, fontWeight: 800 }}>{col.title}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {col.items.map((item) => (
                  <li key={item}><a href="#" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--olv-ink-soft)", textDecoration: "none", fontWeight: 600 }}>{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--olv-border)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--olv-ink-soft)", fontWeight: 800, gap: 12, flexWrap: "wrap" }}>
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
            <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-amber)", display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}><Icon.check /> {copy.cart.freeShipping}</div>
          ) : (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--olv-ink-soft)", fontWeight: 600 }}><span style={{ color: "var(--olv-amber)", fontWeight: 800 }}>{money(remaining)}</span> {copy.cart.away}</div>
          )}
          <div style={{ height: 2, background: "var(--olv-border)", marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--olv-amber)", transition: "width .3s" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 22px" }}>
          {items.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--olv-ink-soft)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
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
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 3, fontWeight: 600 }}>{it.size}</div>
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
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", textAlign: "center", marginTop: 12, fontWeight: 800 }}>{copy.cart.footer}</div>
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
      fontWeight: 800,
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
