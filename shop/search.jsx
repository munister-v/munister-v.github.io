/* search.jsx — Full-screen search overlay with live filtering */
const { useState, useEffect, useRef } = React;

function SearchOverlay({ products, open, onClose, onProduct }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(""); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = q.length < 2 ? [] : products.filter(p =>
    [p.name, p.note, p.cat, ...p.tasting, p.region].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  const suggestions = ["olive oil", "honey", "vinegar", "gift", "smoked", "floral", "bold"];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(31,42,26,0.5)",
        backdropFilter: "blur(6px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity .25s",
        zIndex: 200,
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        background: "var(--olv-bg)",
        transform: open ? "translateY(0)" : "translateY(-105%)",
        transition: "transform .35s cubic-bezier(.2,.8,.2,1)",
        zIndex: 201,
        padding: "28px",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 30px 80px rgba(31,42,26,0.2)",
      }}>
        <div style={{ maxWidth: 860, marginInline: "auto" }}>
          {/* Input row */}
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 28, borderBottom: "2px solid var(--olv-ink)", paddingBottom: 14 }}>
            <Icon.search style={{ color: "var(--olv-ink)", opacity: 0.5, width: 22, height: 22 }} />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search oils, honey, vinegars, recipes…"
              style={{
                flex: 1, border: 0, background: "transparent", outline: "none",
                fontFamily: "var(--font-display)", fontSize: "clamp(22px, 2.8vw, 34px)",
                color: "var(--olv-ink)", letterSpacing: "-0.01em",
              }}
            />
            <button onClick={onClose} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--olv-ink-soft)", padding: 4 }}>
              <Icon.close />
            </button>
          </div>

          {/* Suggestions / results */}
          {q.length < 2 ? (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 14 }}>
                Try searching for
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => setQ(s)} style={{
                    background: "var(--olv-cream)", border: "1px solid rgba(31,42,26,0.15)",
                    padding: "10px 16px", borderRadius: 999, cursor: "pointer",
                    fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--olv-ink)",
                    transition: "background .15s",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--olv-ink)", marginBottom: 8 }}>No results for "{q}"</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--olv-ink-soft)" }}>Try "olive oil", "honey", or "vinegar".</div>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 16 }}>
                {results.length} result{results.length !== 1 ? "s" : ""} for "{q}"
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 18 }}>
                {results.map(p => (
                  <button key={p.id} onClick={() => { onProduct(p); onClose(); }}
                    style={{ background: "transparent", border: "1px solid rgba(31,42,26,0.1)", cursor: "pointer", textAlign: "left", padding: 0, color: "var(--olv-ink)" }}>
                    <div style={{ aspectRatio: "4/3" }}>
                      <Placeholder label={p.name} tone={p.tone} />
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.1 }}>{p.name}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--olv-ink-soft)", marginTop: 4 }}>{p.note} · ${p.price}</div>
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
