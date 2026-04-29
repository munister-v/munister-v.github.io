const { useState } = React;

function GiftsPage({ onAdd, copy, money }) {
  const [occasion, setOccasion] = useState("all");
  const shown = copy.giftBundles.filter((bundle) => bundle.occasions.includes(occasion));

  return (
    <div style={{ background: "var(--olv-bg)" }}>
      <div style={{ background: "linear-gradient(180deg, var(--olv-ink) 0%, #27342b 100%)", color: "var(--olv-cream)", padding: "92px 28px 70px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 24%, rgba(190,101,56,0.16), transparent 22%), radial-gradient(circle at 82% 26%, rgba(255,255,255,0.08), transparent 18%)" }} />
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 16, fontWeight: 800 }}>
          {copy.gifts.eyebrow}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(46px,5.6vw,78px)", margin: "0 0 16px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {copy.gifts.title}
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 16, opacity: 0.75, maxWidth: 620, marginInline: "auto", lineHeight: 1.7, fontWeight: 600 }}>
          {copy.gifts.body}
        </p>
      </div>

      <div style={{ background: "var(--olv-cream)", padding: "22px 28px", borderBottom: "1px solid rgba(31,42,26,0.07)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1400, marginInline: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginRight: 4, fontWeight: 800 }}>{copy.gifts.occasion}</span>
          {copy.gifts.occasions.map((option) => (
            <button
              key={option.id}
              onClick={() => setOccasion(option.id)}
              style={{
                background: occasion === option.id ? "var(--olv-ink)" : "transparent",
                color: occasion === option.id ? "var(--olv-cream)" : "var(--olv-ink)",
                border: "1px solid rgba(31,42,26,0.22)",
                padding: "8px 16px",
                borderRadius: 999,
                fontFamily: "var(--font-body)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "64px 28px 96px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {shown.map((bundle) => (
            <div key={bundle.id} className="mn-soft-panel mn-hover-sheen" style={{ overflow: "hidden" }}>
              <div style={{ position: "relative", aspectRatio: "4/3" }}>
                <Placeholder src={bundle.image} label={bundle.name} tone={bundle.tone} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,23,18,0.28), transparent 54%)" }} />
                <div style={{ position: "absolute", top: 14, right: 14, background: "var(--olv-amber)", color: "var(--olv-ink)", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 10px", fontWeight: 800 }}>
                  -{money(bundle.saving)}
                </div>
              </div>
              <div style={{ padding: "24px 22px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8, fontWeight: 700 }}>{bundle.name}</div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--olv-ink-soft)", lineHeight: 1.7, marginBottom: 14, fontWeight: 600 }}>{bundle.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {bundle.items.map((item) => (
                    <li key={item} style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--olv-ink-soft)", display: "flex", gap: 8, alignItems: "center", fontWeight: 800 }}>
                      <span style={{ color: "var(--olv-moss)" }}>◆</span> {item}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700 }}>{money(bundle.price)}</div>
                  <button
                    onClick={() => onAdd({ id: bundle.id, name: bundle.name, note: "gift set", size: "Bundle", price: bundle.price, tone: bundle.tone, image: bundle.image, qty: 1 })}
                    style={{ ...btnPrimary, padding: "12px 20px" }}
                  >
                    <Icon.plus /> {copy.gifts.add}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mn-soft-panel" style={{ marginTop: 72, padding: "48px 52px", display: "grid", gridTemplateColumns: "1fr auto", gap: 28, alignItems: "center", background: "linear-gradient(135deg, rgba(190,101,56,0.16), rgba(255,251,244,0.86))" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: "-0.02em", marginBottom: 8, fontWeight: 700 }}>
              {copy.gifts.noteTitle}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--olv-ink)", opacity: 0.8, lineHeight: 1.65, fontWeight: 600 }}>
              {copy.gifts.noteBody}
            </div>
          </div>
          <button style={{ ...btnPrimary, whiteSpace: "nowrap" }}>{copy.gifts.noteCta} <Icon.arrow /></button>
        </div>
      </div>
    </div>
  );
}

function JournalPage() { return null; }

function StoryPage({ copy }) {
  const heroImage = window.MUNISTER.assets.sunflower;
  const bodyImage = window.MUNISTER.assets.teaJar;

  return (
    <div style={{ background: "var(--olv-bg)" }}>
      <div style={{ background: "linear-gradient(180deg, #c87244 0%, #b9653c 100%)", padding: "104px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 16% 20%, rgba(255,255,255,0.16), transparent 20%), radial-gradient(circle at 84% 30%, rgba(31,43,34,0.12), transparent 18%)" }} />
        <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-ink)", opacity: 0.65, marginBottom: 18, fontWeight: 800 }}>{copy.storyPage.eyebrow}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,72px)", margin: "0 0 24px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.04, maxWidth: 980, marginInline: "auto" }}>
          {copy.storyPage.title}
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(18px,2.3vw,24px)", color: "var(--olv-ink)", opacity: 0.84, maxWidth: 760, marginInline: "auto", lineHeight: 1.55, fontWeight: 600 }}>
          {copy.storyPage.lead}
        </p>
      </div>

      <div className="mn-soft-panel olv-founder-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--olv-cream)", maxWidth: 1340, margin: "-54px auto 0", overflow: "hidden", position: "relative", zIndex: 2 }}>
        <div style={{ position: "relative", aspectRatio: "1/1" }}>
          <Placeholder src={heroImage} label="sunflower" tone="gold" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,23,18,0.24), transparent 52%)" }} />
          <div className="mn-metal-label" style={{ position: "absolute", left: 24, bottom: 24, padding: "10px 12px" }}>
            <div style={{ fontFamily: "var(--font-label)", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--olv-moss)", fontWeight: 800 }}>Rooted in Ukrainian harvests</div>
          </div>
        </div>
        <div style={{ padding: "72px 60px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", fontWeight: 800 }}>{copy.storyPage.founderEyebrow}</div>
          <blockquote style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,2.8vw,38px)", margin: "0 0 18px", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", color: "var(--olv-ink)" }}>
            "{copy.storyPage.founderQuote}"
          </blockquote>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.75, color: "var(--olv-ink-soft)", margin: 0, fontWeight: 600 }}>
            {copy.storyPage.founderBody}
          </p>
        </div>
      </div>

      <div style={{ padding: "98px 28px", background: "transparent" }}>
        <div style={{ maxWidth: 1040, marginInline: "auto" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 14, fontWeight: 800 }}>{copy.storyPage.timelineEyebrow}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,3.8vw,50px)", margin: "0 0 40px", fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.storyPage.timelineTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 36 }} className="olv-founder-grid">
            <div style={{ display: "grid", gap: 18 }}>
              {copy.storyPage.milestones.map((step) => (
                <div key={step.year} className="mn-soft-panel" style={{ padding: "22px 22px" }}>
                  <div style={{ fontFamily: "var(--font-label)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-amber)", marginBottom: 8, fontWeight: 800 }}>{step.year}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--olv-ink)", lineHeight: 1.7, fontWeight: 600 }}>{step.event}</div>
                </div>
              ))}
            </div>
            <div style={{ position: "relative", minHeight: 520 }}>
              <Placeholder src={bodyImage} label="tea jar" tone="moss" style={{ position: "absolute", inset: 0 }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "linear-gradient(180deg, var(--olv-ink) 0%, #28352b 100%)", color: "var(--olv-cream)", padding: "88px 28px" }}>
        <div style={{ maxWidth: 1200, marginInline: "auto" }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 14, fontWeight: 800 }}>{copy.storyPage.valuesEyebrow}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,3.4vw,46px)", margin: "0 0 48px", fontWeight: 700, letterSpacing: "-0.02em" }}>{copy.storyPage.valuesTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 }}>
            {copy.storyPage.values.map((value) => (
              <div key={value.title} style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 24 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 36, marginBottom: 10, color: "var(--olv-amber)", fontWeight: 700 }}>{value.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 12, letterSpacing: "-0.02em", fontWeight: 700 }}>{value.title}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.7, opacity: 0.78, fontWeight: 600 }}>{value.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GiftsPage, JournalPage, StoryPage });
