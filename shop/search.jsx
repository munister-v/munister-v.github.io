const { useState, useEffect, useRef } = React;

function SearchOverlay({ products, open, onClose, onProduct, copy, money }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = q.length < 2 ? [] : products.filter((p) => [p.name, p.note, p.cat, ...p.tasting, p.region].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31,42,26,0.5)", backdropFilter: "blur(6px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "var(--olv-bg)", transform: open ? "translateY(0)" : "translateY(-105%)", transition: "transform .35s cubic-bezier(.2,.8,.2,1)", zIndex: 201, padding: "28px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 30px 80px rgba(31,42,26,0.2)" }}>
        <div style={{ maxWidth: 900, marginInline: "auto" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 28, borderBottom: "2px solid var(--olv-ink)", paddingBottom: 14 }}>
            <Icon.search style={{ color: "var(--olv-ink)", opacity: 0.5, width: 22, height: 22 }} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={copy.search.placeholder}
              style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontFamily: "var(--font-display)", fontSize: "clamp(22px,2.8vw,34px)", color: "var(--olv-ink)", letterSpacing: "-0.01em", fontWeight: 700 }}
            />
            <button onClick={onClose} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink-soft)", padding: 4 }}>
              <Icon.close />
            </button>
          </div>

          {q.length < 2 ? (
            <div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 14, fontWeight: 800 }}>
                {copy.search.try}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {copy.search.suggestions.map((s) => (
                  <button key={s} onClick={() => setQ(s)} style={{ background: "var(--olv-cream)", border: "1px solid rgba(31,42,26,0.15)", padding: "10px 16px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--olv-ink)", fontWeight: 700 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--olv-ink)", marginBottom: 8, fontWeight: 700 }}>{copy.search.empty}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--olv-ink-soft)", fontWeight: 600 }}>{copy.search.emptyBody}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 16, fontWeight: 800 }}>
                {results.length} {copy.search.results}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 18 }}>
                {results.map((p) => (
                  <button key={p.id} onClick={() => { onProduct(p); onClose(); }} style={{ background: "transparent", border: "1px solid rgba(31,42,26,0.1)", cursor: "pointer", textAlign: "left", padding: 0, color: "var(--olv-ink)" }}>
                    <div style={{ aspectRatio: "4/3" }}>
                      <Placeholder src={p.image} label={p.name} tone={p.tone} />
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.08, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--olv-ink-soft)", marginTop: 4, fontWeight: 600 }}>{p.note} · {money(p.price)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SearchOverlay });
