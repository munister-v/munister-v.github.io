/* shop-pdp.jsx — Shop collection page + Product Detail Page */
const { useState, useEffect, useRef, useMemo } = React;

/* ─── Shop Page ─────────────────────────────────────────────────── */
function ShopPage({ products, onAdd, setRoute }) {
  const [activeFilters, setActiveFilters] = useState([]);
  const [sort, setSort] = useState("popular");
  const [view, setView] = useState("grid"); // grid | list
  const [hovered, setHovered] = useState(null);

  const categories = [
    { id: "evoo",    label: "Olive Oil" },
    { id: "honey",   label: "Honey" },
    { id: "vinegar", label: "Vinegar" },
    { id: "infused", label: "Infused" },
  ];

  const toggleFilter = (id) =>
    setActiveFilters(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const filtered = useMemo(() => {
    let list = activeFilters.length
      ? products.filter(p => activeFilters.includes(p.cat))
      : products;
    if (sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating")     list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, activeFilters, sort]);

  return (
    <div style={{ background: "var(--olv-bg)", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{
        background: "var(--olv-cream)",
        padding: "64px 28px 44px",
        borderBottom: "1px solid rgba(31,42,26,0.08)",
      }}>
        <div style={{ maxWidth: 1400, marginInline: "auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 12 }}>
            ◐ The full pantry
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(44px, 5vw, 72px)", margin: 0, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1 }}>
            Shop the collection.
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--olv-ink-soft)", marginTop: 14, maxWidth: 540, lineHeight: 1.55 }}>
            {filtered.length} products — pressed, fermented, and jarred by hand across fourteen farms in the Carpathian foothills.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "var(--olv-bg)",
        borderBottom: "1px solid rgba(31,42,26,0.08)",
        padding: "14px 28px",
      }}>
        <div style={{ maxWidth: 1400, marginInline: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Filter chips */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", flex: 1 }}>
            {categories.map(c => (
              <button key={c.id} onClick={() => toggleFilter(c.id)} style={{
                background: activeFilters.includes(c.id) ? "var(--olv-ink)" : "transparent",
                color: activeFilters.includes(c.id) ? "var(--olv-cream)" : "var(--olv-ink)",
                border: "1px solid rgba(31,42,26,0.25)",
                padding: "8px 15px", borderRadius: 999,
                fontFamily: "var(--font-body)", fontSize: 12.5,
                cursor: "pointer", transition: "all .18s",
              }}>{c.label}</button>
            ))}
            {activeFilters.length > 0 && (
              <button onClick={() => setActiveFilters([])} style={{
                background: "transparent", color: "var(--olv-ink-soft)",
                border: "none", fontFamily: "var(--font-body)", fontSize: 12.5,
                cursor: "pointer", textDecoration: "underline",
              }}>Clear all</button>
            )}
          </div>
          {/* Sort + view */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              fontFamily: "var(--font-body)", fontSize: 12.5,
              background: "transparent", border: "1px solid rgba(31,42,26,0.2)",
              color: "var(--olv-ink)", padding: "8px 12px", borderRadius: 999, cursor: "pointer",
            }}>
              <option value="popular">Most popular</option>
              <option value="rating">Top rated</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
            </select>
            <div style={{ display: "flex", border: "1px solid rgba(31,42,26,0.2)", borderRadius: 999, overflow: "hidden" }}>
              {["grid","list"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? "var(--olv-ink)" : "transparent",
                  color: view === v ? "var(--olv-cream)" : "var(--olv-ink)",
                  border: 0, padding: "8px 14px", fontSize: 11.5,
                  fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
                  textTransform: "uppercase", cursor: "pointer",
                }}>{v === "grid" ? "⊞" : "☰"}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "40px 28px 90px" }}>
        {view === "grid" ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 28,
          }}>
            {filtered.map((p, i) => (
              <ShopCard
                key={p.id} p={p} i={i}
                onAdd={onAdd}
                onClick={() => setRoute({ page: "pdp", product: p })}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filtered.map((p, i) => (
              <ShopListRow
                key={p.id} p={p}
                onAdd={onAdd}
                onClick={() => setRoute({ page: "pdp", product: p })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shop Card (grid) ──────────────────────────────────────────── */
function ShopCard({ p, i, onAdd, onClick }) {
  const [hover, setHover] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = 1;
        el.style.transform = "translateY(0)";
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-cursor-label={p.name}
      style={{
        opacity: 0,
        transform: "translateY(24px)",
        transition: `opacity .5s ease ${i * 0.04}s, transform .5s ease ${i * 0.04}s`,
        color: "var(--olv-ink)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        onClick={onClick}
        style={{ position: "relative", aspectRatio: "4/5", cursor: "pointer", overflow: "hidden" }}
      >
        <Placeholder label={`${p.name} · ${p.note}`} tone={p.tone} />
        {/* Hover overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(31,42,26,0.06)",
          opacity: hover ? 1 : 0,
          transition: "opacity .25s",
        }} />
        {/* Tag */}
        {p.tag && (
          <span style={{
            position: "absolute", top: 12, left: 12,
            background: "var(--olv-ink)", color: "var(--olv-cream)",
            fontFamily: "var(--font-mono)",
            fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
            padding: "5px 9px",
          }}>{p.tag}</span>
        )}
        {/* Tasting notes float up on hover */}
        <div style={{
          position: "absolute", bottom: 12, left: 12, right: 12,
          display: "flex", gap: 5, flexWrap: "wrap",
          transform: hover ? "translateY(0)" : "translateY(10px)",
          opacity: hover ? 1 : 0,
          transition: "all .25s",
        }}>
          {p.tasting.map(t => (
            <span key={t} style={{
              background: "rgba(251,247,238,0.9)",
              fontFamily: "var(--font-mono)",
              fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
              padding: "5px 8px", color: "var(--olv-ink)",
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{p.name}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>${p.price}</div>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 4 }}>{p.note} · {p.size}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--olv-ink-soft)", display: "flex", gap: 4, alignItems: "center" }}>
            <Icon.star /> {p.rating} <span style={{ opacity: 0.5 }}>({p.reviews})</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(p); }}
            style={{
              background: hover ? "var(--olv-ink)" : "transparent",
              color: hover ? "var(--olv-cream)" : "var(--olv-ink)",
              border: "1px solid rgba(31,42,26,0.3)",
              padding: "8px 14px", borderRadius: 999,
              fontFamily: "var(--font-body)", fontSize: 12,
              cursor: "pointer", transition: "all .2s",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            <Icon.plus /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── List Row ──────────────────────────────────────────────────── */
function ShopListRow({ p, onAdd, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "100px 1fr auto",
        gap: 22, padding: "20px 0",
        borderBottom: "1px solid rgba(31,42,26,0.07)",
        alignItems: "center",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <div style={{ aspectRatio: "1/1", overflow: "hidden" }}>
        <Placeholder label={p.name} tone={p.tone} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.01em" }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--olv-ink-soft)", marginTop: 4 }}>{p.note} · {p.size} · Lot {p.lot}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {p.tasting.map(t => (
            <span key={t} style={{
              fontFamily: "var(--font-mono)", fontSize: 9.5,
              letterSpacing: "0.14em", textTransform: "uppercase",
              border: "1px solid rgba(31,42,26,0.15)", padding: "4px 8px",
              color: "var(--olv-ink)",
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>${p.price}</div>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(p); }}
          style={{
            background: "var(--olv-ink)", color: "var(--olv-cream)",
            border: 0, padding: "10px 18px", borderRadius: 999,
            fontFamily: "var(--font-body)", fontSize: 12.5, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        ><Icon.plus /> Add to bag</button>
      </div>
    </div>
  );
}

/* ─── PDP ───────────────────────────────────────────────────────── */
function ProductDetailPage({ p, onAdd, setRoute, allProducts }) {
  const [size, setSize] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("story");
  const [addedPulse, setAddedPulse] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting), { threshold: 0 });
    if (panelRef.current) obs.observe(panelRef.current);
    return () => obs.disconnect();
  }, []);
  const sizes = p.sizes || [{ label: p.size, price: p.price }];
  const active = sizes[size];

  const handleAdd = () => {
    onAdd({ ...p, price: active.price, size: active.label }, qty);
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 700);
  };

  const pairings = {
    evoo:    ["Crusty bread", "Ripe tomatoes", "Grilled fish", "Burrata", "Pasta"],
    honey:   ["Aged cheese", "Morning porridge", "Yoghurt", "Walnuts", "Sourdough"],
    vinegar: ["Salad greens", "Beets", "Grilled chicken", "Lentils", "Sparkling water"],
    infused: ["Eggs", "Roasted veg", "Pizza", "Dipping bread", "Grains"],
  };
  const pairs = pairings[p.cat] || [];

  return (
    <div style={{ background: "var(--olv-bg)" }}>
      {/* Breadcrumb */}
      <div style={{ padding: "18px 28px", borderBottom: "1px solid rgba(31,42,26,0.07)", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)" }}>
        <a href="#" onClick={e => { e.preventDefault(); setRoute("home"); }} style={{ color: "inherit", textDecoration: "none" }}>Home</a>
        {" · "}
        <a href="#" onClick={e => { e.preventDefault(); setRoute("shop"); }} style={{ color: "inherit", textDecoration: "none" }}>Shop</a>
        {" · "}
        <span style={{ color: "var(--olv-ink)" }}>{p.name}</span>
      </div>

      {/* Hero: 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 600 }}>
        {/* Left: large image */}
        <div style={{ position: "relative" }}>
          <Placeholder label={`${p.name} · studio shot · ${p.note}`} tone={p.tone} style={{ position: "absolute", inset: 0 }} />
          {/* Lot badge */}
          <div style={{
            position: "absolute", top: 24, left: 24,
            background: "var(--olv-cream)", padding: "10px 14px",
            fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--olv-ink)",
          }}>
            Lot {p.lot} · {p.harvest}
          </div>
        </div>

        {/* Right: purchase panel */}
        <div ref={panelRef} style={{ padding: "56px 60px", display: "flex", flexDirection: "column", gap: 20, background: "var(--olv-cream)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)" }}>
              {p.region}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 3.2vw, 46px)", margin: "10px 0 0", fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.05 }}>
              {p.name}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-body)", fontSize: 13 }}>
            <div style={{ display: "flex", gap: 2, color: "var(--olv-amber)" }}>
              {Array(5).fill(0).map((_, i) => <Icon.star key={i} style={{ opacity: i < Math.round(p.rating) ? 1 : 0.25 }} />)}
            </div>
            <span>{p.rating}</span>
            <span style={{ color: "var(--olv-ink-soft)" }}>({p.reviews} reviews)</span>
          </div>

          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65, color: "var(--olv-ink)", margin: 0 }}>
            {p.desc}
          </p>

          {/* Tasting */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {p.tasting.map(t => (
              <div key={t} style={{
                border: "1px solid rgba(31,42,26,0.14)",
                padding: "10px 8px", textAlign: "center",
                fontFamily: "var(--font-mono)", fontSize: 10,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "var(--olv-ink)",
              }}>{t}</div>
            ))}
          </div>

          {/* Size picker */}
          {sizes.length > 1 && (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 10 }}>Size</div>
              <div style={{ display: "flex", gap: 8 }}>
                {sizes.map((s, i) => (
                  <button key={s.label} onClick={() => setSize(i)} style={{
                    border: `1.5px solid ${size === i ? "var(--olv-ink)" : "rgba(31,42,26,0.2)"}`,
                    background: size === i ? "var(--olv-ink)" : "transparent",
                    color: size === i ? "var(--olv-cream)" : "var(--olv-ink)",
                    padding: "10px 16px", borderRadius: 999,
                    fontFamily: "var(--font-body)", fontSize: 13,
                    cursor: "pointer", transition: "all .15s",
                  }}>{s.label} · ${s.price}</button>
                ))}
              </div>
            </div>
          )}

          {/* Price + qty + add */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32 }}>${(active.price * qty).toFixed(2)}</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "inline-flex", border: "1px solid rgba(31,42,26,0.2)", borderRadius: 999, alignItems: "center" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink)", padding: "10px 14px", display: "inline-flex" }}><Icon.minus /></button>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 15, padding: "0 6px", minWidth: 20, textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink)", padding: "10px 14px", display: "inline-flex" }}><Icon.plus /></button>
            </div>
          </div>
          <button
            onClick={handleAdd}
            style={{
              background: addedPulse ? "var(--olv-moss)" : "var(--olv-ink)",
              color: "var(--olv-cream)",
              border: 0, padding: "16px 28px", borderRadius: 999,
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
              cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              transition: "background .25s",
            }}
          >
            {addedPulse ? <><Icon.check /> Added!</> : <>Add to bag · ${(active.price * qty).toFixed(2)} <Icon.arrow /></>}
          </button>

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--olv-ink-soft)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon.leaf /> {p.shelf}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon.drop /> {p.harvest}</div>
          </div>
        </div>
      </div>

      {/* Lot Journey timeline */}
      <LotJourney p={p} />
      <StickyAddBar p={p} activePrice={active.price} onAdd={handleAdd} visible={stickyVisible} />

      {/* Tabs: Story / Pairings / Reviews */}
      <div style={{ background: "var(--olv-bg)", padding: "0 28px" }}>
        <div style={{ maxWidth: 1200, marginInline: "auto" }}>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(31,42,26,0.1)" }}>
            {["story", "pairings", "reviews"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "transparent", border: 0,
                borderBottom: tab === t ? "2px solid var(--olv-ink)" : "2px solid transparent",
                padding: "18px 22px",
                fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: tab === t ? 500 : 400,
                color: tab === t ? "var(--olv-ink)" : "var(--olv-ink-soft)",
                cursor: "pointer", textTransform: "capitalize", letterSpacing: 0.2,
                marginBottom: -1,
              }}>{t}</button>
            ))}
          </div>

          <div style={{ padding: "44px 0 80px" }}>
            {tab === "story" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 60, alignItems: "start" }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 36, margin: "0 0 18px", fontWeight: 400, letterSpacing: "-0.01em" }}>The farm story.</h3>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.7, color: "var(--olv-ink)", margin: 0 }}>
                    This lot was pressed at the co-operative press in {p.region} on the morning the olives reached exactly the right phenolic peak — which our growers test by hand, not machine. The oil spent thirty-six hours settling in stainless before bottling, with no filtering, no additives, and no intervention beyond gravity.
                  </p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.7, color: "var(--olv-ink)", marginTop: 16 }}>
                    Every bottle is dated to the day it was pressed. If you hold this one to the light, you can still see the natural green haze of fresh chlorophyll — a sign it came from us, not a warehouse.
                  </p>
                </div>
                <div style={{ position: "relative", aspectRatio: "4/5" }}>
                  <Placeholder label="farm · co-op press, growers at work, morning" tone="sage" />
                </div>
              </div>
            )}

            {tab === "pairings" && (
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 36, margin: "0 0 10px", fontWeight: 400, letterSpacing: "-0.01em" }}>Goes beautifully with.</h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--olv-ink-soft)", marginBottom: 32, marginTop: 8 }}>
                  Suggestions from our in-house cook and test kitchen.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {pairs.map(pair => (
                    <div key={pair} style={{
                      padding: "14px 20px",
                      border: "1px solid rgba(31,42,26,0.12)",
                      fontFamily: "var(--font-display)", fontSize: 20,
                      color: "var(--olv-ink)",
                    }}>{pair}</div>
                  ))}
                </div>
                <div style={{ marginTop: 48 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 16 }}>Recipe idea</div>
                  <div style={{ background: "var(--olv-cream)", padding: "32px", display: "grid", gridTemplateColumns: "1fr 200px", gap: 32, alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-0.01em" }}>Finish a {pairs[0]?.toLowerCase()} with {p.name} and flaked salt.</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--olv-ink-soft)", marginTop: 10, lineHeight: 1.55 }}>
                        That's it. That's the recipe. The oil does the work — you just make sure it's at room temperature first.
                      </div>
                    </div>
                    <Placeholder label="recipe photo" tone={p.tone} style={{ aspectRatio: "1/1" }} />
                  </div>
                </div>
              </div>
            )}

            {tab === "reviews" && <ReviewsSection p={p} />}
          </div>
        </div>
      </div>
      {allProducts && <RelatedProducts p={p} allProducts={allProducts} onAdd={onAdd} onOpen={rp => setRoute({ page:"pdp", product: rp })} />}
    </div>
  );
}

/* ─── Lot Journey ───────────────────────────────────────────────── */
function LotJourney({ p }) {
  const steps = [
    { icon: "◉", label: "Harvest", date: p.harvest, desc: "Hand-picked at peak phenolic content. Each grower picks their own grove — no bulk mixing." },
    { icon: "◈", label: "Press",   date: "Within 4 hrs", desc: "Cold-pressed at ≤27°C in our co-op press. The oil never touches heat." },
    { icon: "◎", label: "Settle",  date: "36 hrs",       desc: "Natural gravity settling in stainless tanks. No centrifuge. No filtration." },
    { icon: "○", label: "Bottle",  date: "Day 3",        desc: "Hand-filled into dark glass. Lot-numbered, dated, and sealed." },
    { icon: "◐", label: "Ship",    date: "Within 1 week", desc: "Packed with recycled paper. Glass is returnable — we'll pick it up." },
  ];
  return (
    <div style={{ background: "var(--olv-ink)", color: "var(--olv-cream)", padding: "72px 28px" }}>
      <div style={{ maxWidth: 1200, marginInline: "auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 14 }}>
          Lot {p.lot} · Traceability
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 3vw, 42px)", fontWeight: 400, margin: "0 0 48px", letterSpacing: "-0.01em" }}>
          From grove to your kitchen door.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, position: "relative" }}>
          {/* connector line */}
          <div style={{ position: "absolute", top: 20, left: "10%", right: "10%", height: 1, background: "rgba(255,255,255,0.15)" }} />
          {steps.map((s, i) => (
            <div key={i} style={{ padding: "0 16px 0 0", position: "relative" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.4)",
                display: "grid", placeItems: "center",
                fontFamily: "var(--font-mono)", fontSize: 16,
                background: i === 0 ? "var(--olv-amber)" : "transparent",
                color: i === 0 ? "var(--olv-ink)" : "var(--olv-cream)",
                marginBottom: 18,
              }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.6, marginBottom: 10 }}>{s.date}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.6, opacity: 0.75 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Reviews ───────────────────────────────────────────────────── */
function ReviewsSection({ p }) {
  const reviews = [
    { name: "Sofía G.", loc: "Kyiv", rating: 5, ago: "2 weeks ago", text: "Finally an oil that actually tastes like something. The pepper on the back of the throat is incredible. On everything now." },
    { name: "Tom H.", loc: "Berlin", rating: 5, ago: "1 month ago", text: "Ordered this on a recommendation. It ruined every other olive oil for me. Worth it." },
    { name: "Lena K.", loc: "Lviv", rating: 4, ago: "3 months ago", text: "My grandmother tasted this and said it tasted like Zakarpattia. I don't have higher praise than that." },
    { name: "Marta B.", loc: "Warsaw", rating: 5, ago: "1 month ago", text: "The whole pantry is exceptional but this one is special. Reordered twice." },
  ];
  const avg = p.rating;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 32, marginBottom: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 72, lineHeight: 1, letterSpacing: "-0.02em" }}>{avg}</div>
          <div style={{ display: "flex", gap: 3, marginTop: 8, color: "var(--olv-amber)" }}>
            {Array(5).fill(0).map((_, i) => <Icon.star key={i} style={{ width: 18, height: 18, opacity: i < Math.round(avg) ? 1 : 0.25 }} />)}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--olv-ink-soft)", marginTop: 6 }}>{p.reviews} verified harvests</div>
        </div>
        <div style={{ flex: 1, maxWidth: 320 }}>
          {[5,4,3,2,1].map(n => {
            const pct = n === 5 ? 72 : n === 4 ? 20 : n === 3 ? 6 : n === 2 ? 1 : 1;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, width: 8 }}>{n}</span>
                <div style={{ flex: 1, height: 5, background: "rgba(31,42,26,0.1)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--olv-amber)" }} />
                </div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--olv-ink-soft)", width: 26 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ background: "var(--olv-cream)", padding: "24px 26px" }}>
            <div style={{ display: "flex", gap: 3, color: "var(--olv-amber)", marginBottom: 12 }}>
              {Array(5).fill(0).map((_, j) => <Icon.star key={j} style={{ opacity: j < r.rating ? 1 : 0.25 }} />)}
            </div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.3, margin: "0 0 14px", fontStyle: "italic" }}>"{r.text}"</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-ink-soft)" }}>
              <span>{r.name} · {r.loc}</span>
              <span>{r.ago}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Sticky Add Bar (appears when purchase panel scrolls out) ── */
function StickyAddBar({ p, activePrice, onAdd, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60,
      background: "var(--olv-cream)",
      borderTop: "1px solid rgba(31,42,26,0.1)",
      padding: "14px 28px",
      display: "flex", alignItems: "center", gap: 16,
      transform: visible ? "translateY(0)" : "translateY(100%)",
      transition: "transform .3s cubic-bezier(.2,.8,.2,1)",
      boxShadow: "0 -12px 40px rgba(31,42,26,0.1)",
    }}>
      <div style={{ width: 48, height: 48, flexShrink: 0 }}>
        <Placeholder label={p.name} tone={p.tone} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.1 }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 2 }}>{p.note}</div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>${activePrice}</div>
      <button onClick={onAdd} style={{
        background: "var(--olv-ink)", color: "var(--olv-cream)", border: 0,
        padding: "13px 22px", borderRadius: 999,
        fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
        whiteSpace: "nowrap",
      }}>Add to bag <Icon.arrow /></button>
    </div>
  );
}

/* ─── Related products ──────────────────────────────────────── */
function RelatedProducts({ p, allProducts, onAdd, onOpen }) {
  const related = allProducts
    .filter(x => x.id !== p.id && (x.cat === p.cat || x.tone === p.tone))
    .slice(0, 4);
  if (!related.length) return null;
  return (
    <section style={{ padding: "72px 28px 90px", background: "var(--olv-cream)" }}>
      <div style={{ maxWidth: 1200, marginInline: "auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 10 }}>◒ You might also like</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3vw, 40px)", margin: "0 0 36px", fontWeight: 400, letterSpacing: "-0.01em" }}>From the same pantry.</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
          {related.map(rp => (
            <div key={rp.id} style={{ color: "var(--olv-ink)" }}>
              <div onClick={() => onOpen(rp)} style={{ aspectRatio: "3/4", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                <Placeholder label={`${rp.name} · ${rp.note}`} tone={rp.tone} />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.1 }}>{rp.name}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 3 }}>{rp.note} · ${rp.price}</div>
                <button onClick={() => onAdd(rp)} style={{
                  marginTop: 10, background: "transparent", color: "var(--olv-ink)",
                  border: "1px solid rgba(31,42,26,0.25)", padding: "8px 14px", borderRadius: 999,
                  fontFamily: "var(--font-body)", fontSize: 12, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}><Icon.plus /> Add</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ShopPage, ProductDetailPage, ShopCard, StickyAddBar, RelatedProducts });
