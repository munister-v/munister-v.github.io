function CustomCursor() { return null; }
function PantryBuilder() { return null; }

function MobileNav({ open, onClose, setRoute, cartCount, onOpenCart, copy, lang, setLang }) {
  const links = [
    { id: "shop", label: copy.nav.shop },
    { id: "gifts", label: copy.nav.gifts },
    { id: "story", label: copy.nav.story },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,12,6,0.55)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s", zIndex: 95 }} />
      <aside style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 320,
        maxWidth: "88vw",
        height: "100%",
        background: "var(--olv-surface)",
        transform: open ? "translateX(0)" : "translateX(-105%)",
        transition: "transform .3s cubic-bezier(.2,.8,.2,1)",
        zIndex: 96,
        padding: "24px 22px",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <Logo size={18} />
          <button onClick={onClose} style={iconBtn}><Icon.close /></button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => { setRoute(link.id); onClose(); }}
              style={{
                background: "transparent",
                border: "1px solid var(--olv-border)",
                textAlign: "left",
                padding: "14px 16px",
                cursor: "pointer",
                color: "var(--olv-ink)",
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginBottom: 10, fontWeight: 700 }}>Language</div>
          <div style={{ display: "flex", gap: 8 }}>
            {window.MUNISTER.languages.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setLang(entry.id)}
                style={{
                  background: lang === entry.id ? "var(--olv-ink)" : "transparent",
                  color: lang === entry.id ? "var(--olv-surface)" : "var(--olv-ink)",
                  border: "1px solid var(--olv-border)",
                  padding: "10px 12px",
                  borderRadius: 999,
                  fontFamily: "var(--font-label)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {entry.short}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--olv-border)" }}>
          <button
            onClick={() => { onOpenCart(); onClose(); }}
            style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}
          >
            {copy.nav.bag} ({cartCount}) <Icon.arrow />
          </button>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { CustomCursor, PantryBuilder, MobileNav });
