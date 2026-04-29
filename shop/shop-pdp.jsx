const { useState, useEffect, useRef, useMemo } = React;

function ShopPage({ products, onAdd, setRoute, copy, money }) {
  const [activeFilters, setActiveFilters] = useState([]);
  const [sort, setSort] = useState("popular");
  const [view, setView] = useState("grid");

  const toggleFilter = (id) => setActiveFilters((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);

  const filtered = useMemo(() => {
    let list = activeFilters.length ? products.filter((p) => activeFilters.includes(p.cat)) : products;
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, activeFilters, sort]);

  return (
    <div style={{ background: "var(--olv-bg)", minHeight: "100vh" }}>
      <div style={{ background: "linear-gradient(180deg, rgba(236,223,205,0.84), rgba(248,241,230,0.72))", padding: "72px 28px 52px", borderBottom: "1px solid rgba(31,42,26,0.08)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 14% 28%, rgba(190,101,56,0.12), transparent 22%), radial-gradient(circle at 82% 24%, rgba(86,102,75,0.08), transparent 18%)" }} />
        <div style={{ maxWidth: 1400, marginInline: "auto" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 12, fontWeight: 800 }}>
            {copy.shop.eyebrow}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(44px,5vw,72px)", margin: 0, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {copy.shop.title}
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--olv-ink-soft)", marginTop: 14, maxWidth: 620, lineHeight: 1.65, fontWeight: 600 }}>
            {filtered.length} {copy.shop.body}
          </p>
        </div>
      </div>

      <div className="mn-soft-panel" style={{ position: "sticky", top: 0, zIndex: 30, margin: "16px 28px 0", padding: "14px 18px" }}>
        <div style={{ maxWidth: 1400, marginInline: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", flex: 1 }}>
            {copy.shop.filters.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleFilter(c.id)}
                style={{
                  background: activeFilters.includes(c.id) ? "var(--olv-ink)" : "transparent",
                  color: activeFilters.includes(c.id) ? "var(--olv-cream)" : "var(--olv-ink)",
                  border: "1px solid rgba(31,42,26,0.25)",
                  padding: "8px 15px",
                  borderRadius: 999,
                  fontFamily: "var(--font-label)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            ))}
            {activeFilters.length > 0 ? (
              <button onClick={() => setActiveFilters([])} style={{ background: "transparent", color: "var(--olv-ink-soft)", border: "none", fontFamily: "var(--font-body)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>
                {copy.shop.clear}
              </button>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontFamily: "var(--font-body)", fontSize: 12.5, background: "transparent", border: "1px solid rgba(31,42,26,0.2)", color: "var(--olv-ink)", padding: "8px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 700 }}>
              <option value="popular">{copy.shop.sorts.popular}</option>
              <option value="rating">{copy.shop.sorts.rating}</option>
              <option value="price-asc">{copy.shop.sorts["price-asc"]}</option>
              <option value="price-desc">{copy.shop.sorts["price-desc"]}</option>
            </select>
            <div style={{ display: "flex", border: "1px solid rgba(31,42,26,0.2)", borderRadius: 999, overflow: "hidden" }}>
              {["grid", "list"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  style={{
                    background: view === mode ? "var(--olv-ink)" : "transparent",
                    color: view === mode ? "var(--olv-cream)" : "var(--olv-ink)",
                    border: 0,
                    padding: "8px 14px",
                    fontSize: 11.5,
                    fontFamily: "var(--font-label)",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {mode === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "48px 28px 96px" }}>
        {view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 28 }}>
            {filtered.map((p, i) => (
              <ShopCard key={p.id} p={p} i={i} copy={copy} money={money} onAdd={onAdd} onClick={() => setRoute({ page: "pdp", product: p })} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filtered.map((p) => (
              <ShopListRow key={p.id} p={p} copy={copy} money={money} onAdd={onAdd} onClick={() => setRoute({ page: "pdp", product: p })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopCard({ p, i, onAdd, onClick, copy, money }) {
  const [hover, setHover] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.opacity = 1;
        el.style.transform = "translateY(0)";
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0, transform: "translateY(24px)", transition: `opacity .5s ease ${i * 0.04}s, transform .5s ease ${i * 0.04}s`, color: "var(--olv-ink)" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div onClick={onClick} style={{ position: "relative", aspectRatio: "4/5", cursor: "pointer", overflow: "hidden" }}>
        <Placeholder src={p.image} label={p.name} tone={p.tone} />
        <div style={{ position: "absolute", inset: 0, background: hover ? "linear-gradient(to top, rgba(20,27,21,0.42), rgba(31,42,26,0.04))" : "linear-gradient(to top, rgba(20,27,21,0.12), transparent 40%)", transition: "background .25s" }} />
        <div style={{ position: "absolute", inset: hover ? "14px" : "18px", border: "1px solid rgba(255,255,255,0.24)", transition: "inset .25s", pointerEvents: "none" }} />
        {p.tag ? <span className="mn-metal-label" style={{ position: "absolute", top: 12, left: 12, color: "var(--olv-ink)", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "5px 9px", fontWeight: 800 }}>{p.tag}</span> : null}
        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, display: "flex", gap: 5, flexWrap: "wrap", transform: hover ? "translateY(0)" : "translateY(10px)", opacity: hover ? 1 : 0, transition: "all .25s" }}>
          {p.tasting.map((t) => (
            <span key={t} style={{ background: "rgba(251,247,238,0.92)", fontFamily: "var(--font-label)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", padding: "5px 8px", color: "var(--olv-ink)", fontWeight: 800 }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="mn-soft-panel" style={{ marginTop: -24, marginInline: "10px", position: "relative", zIndex: 2, padding: "14px 14px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1.08, fontWeight: 700 }}>{p.name}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{money(p.price)}</div>
        </div>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-amber)", marginTop: 4, fontWeight: 800 }}>{p.region}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginTop: 5, fontWeight: 600 }}>{p.note} · {p.size}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--olv-ink-soft)", display: "flex", gap: 4, alignItems: "center", fontWeight: 700 }}>
            <Icon.star style={{ color: "var(--olv-amber)" }} /> {p.rating} <span style={{ opacity: 0.55 }}>({p.reviews})</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onAdd(p); }} style={{ background: hover ? "var(--olv-ink)" : "transparent", color: hover ? "var(--olv-cream)" : "var(--olv-ink)", border: "1px solid rgba(31,42,26,0.3)", padding: "8px 14px", borderRadius: 999, fontFamily: "var(--font-label)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all .2s", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon.plus /> {copy.shop.add}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShopListRow({ p, onAdd, onClick, copy, money }) {
  return (
    <div className="mn-soft-panel" style={{ display: "grid", gridTemplateColumns: "124px 1fr auto", gap: 22, padding: "18px", borderColor: "rgba(31,42,26,0.09)", alignItems: "center", cursor: "pointer" }} onClick={onClick}>
      <div style={{ aspectRatio: "1/1", overflow: "hidden", position: "relative" }}>
        <Placeholder src={p.image} label={p.name} tone={p.tone} />
        <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(255,255,255,0.22)", pointerEvents: "none" }} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: "-0.02em", fontWeight: 700 }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-amber)", marginTop: 4, fontWeight: 800 }}>{p.region}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--olv-ink-soft)", marginTop: 4, fontWeight: 600 }}>{p.note} · {p.size} · {p.lot}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {p.tasting.map((t) => (
            <span key={t} className="mn-metal-label" style={{ fontFamily: "var(--font-label)", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 8px", color: "var(--olv-ink)", fontWeight: 800 }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>{money(p.price)}</div>
        <button onClick={(e) => { e.stopPropagation(); onAdd(p); }} style={{ ...btnPrimary, padding: "10px 18px" }}><Icon.plus /> {copy.shop.addBag}</button>
      </div>
    </div>
  );
}

function ProductDetailPage({ p, onAdd, setRoute, allProducts, copy, money }) {
  const [size, setSize] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("story");
  const [addedPulse, setAddedPulse] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const panelRef = useRef(null);
  const sizes = p.sizes || [{ label: p.size, price: p.price }];
  const active = sizes[size];

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    if (panelRef.current) obs.observe(panelRef.current);
    return () => obs.disconnect();
  }, []);

  const handleAdd = () => {
    onAdd({ ...p, price: active.price, size: active.label }, qty);
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 700);
  };

  return (
    <div style={{ background: "var(--olv-bg)" }}>
      <div style={{ padding: "18px 28px", borderBottom: "1px solid rgba(31,42,26,0.07)", fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", fontWeight: 800 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setRoute("home"); }} style={{ color: "inherit", textDecoration: "none" }}>{copy.shop.backHome}</a>
        {" · "}
        <a href="#" onClick={(e) => { e.preventDefault(); setRoute("shop"); }} style={{ color: "inherit", textDecoration: "none" }}>{copy.shop.backShop}</a>
        {" · "}
        <span style={{ color: "var(--olv-ink)" }}>{p.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 680, margin: "22px 28px 0", boxShadow: "var(--olv-shadow-soft)" }} className="olv-pdp-hero">
        <div style={{ position: "relative" }}>
          <Placeholder src={p.image} label={p.name} tone={p.tone} style={{ position: "absolute", inset: 0 }} />
          <div style={{ position: "absolute", inset: 18, border: "1px solid rgba(255,255,255,0.24)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,23,18,0.32), transparent 40%)" }} />
          <div className="mn-metal-label" style={{ position: "absolute", top: 24, left: 24, padding: "10px 14px", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink)", fontWeight: 800 }}>
            {p.lot} · {p.harvest}
          </div>
        </div>

        <div ref={panelRef} style={{ padding: "60px 60px", display: "flex", flexDirection: "column", gap: 20, background: "linear-gradient(180deg, rgba(252,247,239,0.94), rgba(236,223,205,0.88))" }}>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", fontWeight: 800 }}>{p.region}</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,3.2vw,48px)", margin: "10px 0 0", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.04 }}>{p.name}</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700 }}>
            <div style={{ display: "flex", gap: 2, color: "var(--olv-amber)" }}>
              {Array(5).fill(0).map((_, i) => <Icon.star key={i} style={{ opacity: i < Math.round(p.rating) ? 1 : 0.25 }} />)}
            </div>
            <span>{p.rating}</span>
            <span style={{ color: "var(--olv-ink-soft)" }}>({p.reviews})</span>
          </div>

          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.7, color: "var(--olv-ink)", margin: 0, fontWeight: 600 }}>{p.desc}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {p.tasting.map((t) => (
              <div key={t} style={{ border: "1px solid rgba(31,42,26,0.14)", padding: "10px 8px", textAlign: "center", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--olv-ink)", fontWeight: 800 }}>
                {t}
              </div>
            ))}
          </div>

          {sizes.length > 1 ? (
            <div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 10, fontWeight: 800 }}>{copy.shop.size}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sizes.map((s, i) => (
                  <button key={s.label} onClick={() => setSize(i)} style={{ border: `1.5px solid ${size === i ? "var(--olv-ink)" : "rgba(31,42,26,0.2)"}`, background: size === i ? "var(--olv-ink)" : "transparent", color: size === i ? "var(--olv-cream)" : "var(--olv-ink)", padding: "10px 16px", borderRadius: 999, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {s.label} · {money(s.price)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700 }}>{money(active.price * qty)}</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "inline-flex", border: "1px solid rgba(31,42,26,0.2)", borderRadius: 999, alignItems: "center" }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink)", padding: "10px 14px", display: "inline-flex" }}><Icon.minus /></button>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 15, padding: "0 6px", minWidth: 20, textAlign: "center", fontWeight: 700 }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink)", padding: "10px 14px", display: "inline-flex" }}><Icon.plus /></button>
            </div>
          </div>
          <button onClick={handleAdd} style={{ background: addedPulse ? "var(--olv-moss)" : "var(--olv-ink)", color: "var(--olv-cream)", border: 0, padding: "16px 28px", borderRadius: 999, fontFamily: "var(--font-label)", fontSize: 12.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "background .25s" }}>
            {addedPulse ? <><Icon.check /> {copy.shop.added}</> : <>{copy.shop.addBag} · {money(active.price * qty)} <Icon.arrow /></>}
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4, fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--olv-ink-soft)", fontWeight: 800 }}>
            <div>{p.shelf}</div>
            <div>{p.harvest}</div>
          </div>
        </div>
      </div>

      <LotJourney copy={copy} />
      <StickyAddBar p={p} activePrice={active.price} onAdd={handleAdd} visible={stickyVisible} copy={copy} money={money} />

      <div style={{ background: "transparent", padding: "0 28px" }}>
        <div style={{ maxWidth: 1200, marginInline: "auto" }}>
          <div className="mn-soft-panel" style={{ display: "flex", gap: 0, flexWrap: "wrap", padding: "0 12px", marginTop: "26px" }}>
            {[
              { id: "story", label: copy.shop.story },
              { id: "pairings", label: copy.shop.pairings },
              { id: "reviews", label: copy.shop.reviews },
            ].map((entry) => (
              <button key={entry.id} onClick={() => setTab(entry.id)} style={{ background: "transparent", border: 0, borderBottom: tab === entry.id ? "2px solid var(--olv-ink)" : "2px solid transparent", padding: "18px 22px", fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: tab === entry.id ? "var(--olv-ink)" : "var(--olv-ink-soft)", cursor: "pointer", marginBottom: -1 }}>
                {entry.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "44px 0 80px" }}>
            {tab === "story" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 60, alignItems: "start" }} className="olv-founder-grid">
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 38, margin: "0 0 18px", fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.shop.storyHeading}</h3>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.72, color: "var(--olv-ink)", margin: 0, fontWeight: 600 }}>{p.story}</p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.72, color: "var(--olv-ink)", marginTop: 16, fontWeight: 600 }}>{copy.shop.storyBody}</p>
                </div>
                <div style={{ position: "relative", aspectRatio: "4/5" }}>
                  <Placeholder src={p.image} label={p.name} tone={p.tone} />
                </div>
              </div>
            ) : null}

            {tab === "pairings" ? (
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 38, margin: "0 0 10px", fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.shop.pairingsHeading}</h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--olv-ink-soft)", marginBottom: 32, marginTop: 8, fontWeight: 600 }}>{copy.shop.pairingsBody}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {p.pairings.map((pair) => (
                    <div key={pair} style={{ padding: "14px 20px", border: "1px solid rgba(31,42,26,0.12)", fontFamily: "var(--font-display)", fontSize: 22, color: "var(--olv-ink)", fontWeight: 700 }}>{pair}</div>
                  ))}
                </div>
                <div style={{ marginTop: 48 }}>
                  <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 16, fontWeight: 800 }}>{copy.shop.recipeIdea}</div>
                  <div className="mn-soft-panel olv-founder-grid" style={{ padding: "32px", display: "grid", gridTemplateColumns: "1fr 200px", gap: 32, alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "-0.02em", fontWeight: 700 }}>{p.recipe}</div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <Placeholder src={p.image} label={p.name} tone={p.tone} style={{ aspectRatio: "1/1" }} />
                      <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(255,255,255,0.22)", pointerEvents: "none" }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "reviews" ? <ReviewsSection p={p} copy={copy} /> : null}
          </div>
        </div>
      </div>
      {allProducts ? <RelatedProducts p={p} allProducts={allProducts} onAdd={onAdd} onOpen={(rp) => setRoute({ page: "pdp", product: rp })} copy={copy} money={money} /> : null}
    </div>
  );
}

function LotJourney({ copy }) {
  return (
    <div style={{ background: "linear-gradient(180deg, var(--olv-ink) 0%, #29362d 100%)", color: "var(--olv-cream)", padding: "78px 28px" }}>
      <div style={{ maxWidth: 1200, marginInline: "auto" }}>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 14, fontWeight: 800 }}>
          {copy.shop.lotTrace}
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px,3vw,42px)", fontWeight: 700, margin: "0 0 48px", letterSpacing: "-0.03em" }}>
          {copy.shop.journeyTitle}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, position: "relative" }} className="olv-journey">
          <div style={{ position: "absolute", top: 20, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.22), rgba(255,255,255,0.04))" }} />
          {copy.shop.journey.map((step, i) => (
            <div key={step.label} style={{ padding: "0 16px 0 0", position: "relative" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.4)", display: "grid", placeItems: "center", fontFamily: "var(--font-label)", fontSize: 13, fontWeight: 800, background: i === 0 ? "var(--olv-amber)" : "transparent", color: i === 0 ? "var(--olv-ink)" : "var(--olv-cream)", marginBottom: 18 }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 4, fontWeight: 700 }}>{step.label}</div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.6, marginBottom: 10, fontWeight: 800 }}>{step.date}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.65, opacity: 0.8, fontWeight: 600 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewsSection({ p, copy }) {
  const avg = p.rating;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 32, marginBottom: 40, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 72, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}>{avg}</div>
          <div style={{ display: "flex", gap: 3, marginTop: 8, color: "var(--olv-amber)" }}>
            {Array(5).fill(0).map((_, i) => <Icon.star key={i} style={{ width: 18, height: 18, opacity: i < Math.round(avg) ? 1 : 0.25 }} />)}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--olv-ink-soft)", marginTop: 6, fontWeight: 600 }}>{copy.shop.reviewsTitle}</div>
        </div>
        <div style={{ flex: 1, maxWidth: 340 }}>
          {[5, 4, 3, 2, 1].map((n) => {
            const pct = n === 5 ? 72 : n === 4 ? 20 : n === 3 ? 6 : 1;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, width: 8, fontWeight: 700 }}>{n}</span>
                <div style={{ flex: 1, height: 5, background: "rgba(31,42,26,0.1)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--olv-amber)" }} />
                </div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--olv-ink-soft)", width: 26, fontWeight: 700 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="olv-reviews-grid">
          {copy.reviews.map((review, i) => (
          <div key={i} className="mn-soft-panel" style={{ padding: "24px 26px" }}>
            <div style={{ display: "flex", gap: 3, color: "var(--olv-amber)", marginBottom: 12 }}>
              {Array(5).fill(0).map((_, j) => <Icon.star key={j} style={{ opacity: j < 5 ? 1 : 0.25 }} />)}
            </div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.32, margin: "0 0 14px", fontStyle: "italic", fontWeight: 700 }}>"{review.text}"</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-ink-soft)", fontWeight: 800, gap: 10 }}>
              <span>{review.name} · {review.loc}</span>
              <span>{review.ago}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyAddBar({ p, activePrice, onAdd, visible, copy, money }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: "var(--olv-cream)", borderTop: "1px solid rgba(31,42,26,0.1)", padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, transform: visible ? "translateY(0)" : "translateY(100%)", transition: "transform .3s cubic-bezier(.2,.8,.2,1)", boxShadow: "0 -12px 40px rgba(31,42,26,0.1)" }}>
      <div style={{ width: 48, height: 48, flexShrink: 0 }}>
        <Placeholder src={p.image} label={p.name} tone={p.tone} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.1, fontWeight: 700 }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 2, fontWeight: 600 }}>{p.note}</div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{money(activePrice)}</div>
      <button onClick={onAdd} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>{copy.shop.stickyAdd} <Icon.arrow /></button>
    </div>
  );
}

function RelatedProducts({ p, allProducts, onAdd, onOpen, copy, money }) {
  const related = allProducts.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 4);
  if (!related.length) return null;
  return (
    <section style={{ padding: "82px 28px 96px", background: "linear-gradient(180deg, rgba(236,223,205,0.72), rgba(244,236,223,0.92))" }}>
      <div style={{ maxWidth: 1200, marginInline: "auto" }}>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 10, fontWeight: 800 }}>{copy.shop.relatedEyebrow}</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,3vw,40px)", margin: "0 0 36px", fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.shop.relatedTitle}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }} className="olv-products-grid">
          {related.map((rp) => (
            <div key={rp.id} style={{ color: "var(--olv-ink)" }}>
              <div onClick={() => onOpen(rp)} style={{ aspectRatio: "3/4", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                <Placeholder src={rp.image} label={rp.name} tone={rp.tone} />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.08, fontWeight: 700 }}>{rp.name}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginTop: 3, fontWeight: 600 }}>{rp.note} · {money(rp.price)}</div>
                <button onClick={() => onAdd(rp)} style={{ marginTop: 10, background: "transparent", color: "var(--olv-ink)", border: "1px solid rgba(31,42,26,0.25)", padding: "8px 14px", borderRadius: 999, fontFamily: "var(--font-label)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon.plus /> {copy.shop.add}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ShopPage, ProductDetailPage, ShopCard, StickyAddBar, RelatedProducts });
