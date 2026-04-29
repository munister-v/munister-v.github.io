/* pages.jsx — Gifts, Journal, Story pages */
const { useState, useRef, useEffect } = React;

/* ─── Gifts Page ─────────────────────────────────────────────── */
function GiftsPage({ products, onAdd, setRoute }) {
  const [occasion, setOccasion] = useState("all");
  const occasions = [
    { id: "all",         label: "All gifts" },
    { id: "housewarming",label: "Housewarming" },
    { id: "foodie",      label: "For the foodie" },
    { id: "host",        label: "Host gift" },
    { id: "birthday",    label: "Birthday" },
  ];

  const bundles = [
    { id: "starter", name: "The Starter Pantry", desc: "Robusto EVOO + Acacia Honey + Cherry Vinegar — the three bottles that started everything.", price: 74, saving: 12, tone: "amber", occasions: ["housewarming","foodie","birthday"], items: ["Robusto Verde EVOO 350ml", "Acacia Wild Honey 300g", "Sour Cherry Vinegar 250ml"] },
    { id: "oil-trio", name: "The Oil Trio", desc: "Bold, gentle, and infused — one for every moment at the table.", price: 84, saving: 10, tone: "cream", occasions: ["host","housewarming","foodie"], items: ["Robusto Verde EVOO 350ml", "Delicato Solare EVOO 350ml", "Smoked Chili Oil 250ml"] },
    { id: "honey-set", name: "The Honey Edit", desc: "Three honeys, three different worlds. Acacia, chestnut, and meadow multifloral.", price: 58, saving: 8, tone: "sage", occasions: ["birthday","host","foodie"], items: ["Acacia Wild Honey 300g", "Chestnut Forest Honey 300g", "Spring Meadow Honey 300g"] },
    { id: "vinegar-set", name: "The Vinegar Collection", desc: "Fruit, flower, and oak — the most misunderstood shelf in the kitchen.", price: 64, saving: 12, tone: "plum", occasions: ["foodie","birthday"], items: ["Sour Cherry Vinegar 250ml", "Rose & White Wine Vinegar 250ml", "Honey-Aged Vinegar 250ml"] },
    { id: "host-gift", name: "The Host Gift", desc: "One olive oil. One honey. A linen cloth. The perfect thing to bring to dinner.", price: 48, saving: 6, tone: "bone", occasions: ["host","housewarming"], items: ["Delicato Solare EVOO 350ml", "Spring Meadow Honey 300g", "Olivara linen pouch"] },
    { id: "full-pantry", name: "The Full Pantry", desc: "All fourteen products. The complete Munister collection, boxed and lot-numbered.", price: 290, saving: 46, tone: "moss", occasions: ["birthday","housewarming","foodie"], items: ["All 11 products + 3 exclusives", "Numbered gift box", "Tasting notes booklet"] },
  ];

  const shown = occasion === "all" ? bundles : bundles.filter(b => b.occasions.includes(occasion));

  return (
    <div style={{ background: "var(--olv-bg)" }}>
      {/* Hero */}
      <div style={{ background: "var(--olv-ink)", color: "var(--olv-cream)", padding: "80px 28px 64px", textAlign: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 16 }}>
          ◎ Gift sets · Curated by occasion
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(44px, 5.5vw, 76px)", margin: "0 0 16px", fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1 }}>
          Give the good bottle.
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, opacity: 0.72, maxWidth: 520, marginInline: "auto", lineHeight: 1.6 }}>
          Every bundle is boxed by hand, lot-numbered, and accompanied by a tasting card. Free gift note on every order.
        </p>
      </div>

      {/* Occasion filter */}
      <div style={{ background: "var(--olv-cream)", padding: "22px 28px", borderBottom: "1px solid rgba(31,42,26,0.07)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1400, marginInline: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-ink-soft)", marginRight: 4 }}>Occasion:</span>
          {occasions.map(o => (
            <button key={o.id} onClick={() => setOccasion(o.id)} style={{
              background: occasion === o.id ? "var(--olv-ink)" : "transparent",
              color: occasion === o.id ? "var(--olv-cream)" : "var(--olv-ink)",
              border: "1px solid rgba(31,42,26,0.22)", padding: "8px 16px", borderRadius: 999,
              fontFamily: "'Inter', sans-serif", fontSize: 12.5, cursor: "pointer", transition: "all .15s",
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Bundles grid */}
      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "52px 28px 90px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
          {shown.map((b, i) => (
            <GiftCard key={b.id} b={b} i={i} onAdd={() => onAdd({ id: b.id, name: b.name, note: "gift set", size: "Bundle", price: b.price, tone: b.tone, qty: 1 })} />
          ))}
        </div>

        {/* Gift note CTA */}
        <div style={{
          marginTop: 64, background: "var(--olv-amber)", padding: "48px 52px",
          display: "grid", gridTemplateColumns: "1fr auto", gap: 28, alignItems: "center",
        }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, letterSpacing: "-0.01em", marginBottom: 8 }}>
              Free handwritten gift note with every order.
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--olv-ink)", opacity: 0.8, lineHeight: 1.55 }}>
              Tell us what you'd like it to say at checkout. We write it in actual ink.
            </div>
          </div>
          <button style={{
            background: "var(--olv-ink)", color: "var(--olv-cream)", border: 0,
            padding: "14px 24px", borderRadius: 999, fontFamily: "'Inter', sans-serif",
            fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>Shop all gifts <Icon.arrow /></button>
        </div>
      </div>
    </div>
  );
}

function GiftCard({ b, i, onAdd }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = 1; el.style.transform = "translateY(0)"; }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ opacity: 0, transform: "translateY(20px)", transition: `opacity .5s ease ${i*0.06}s, transform .5s ease ${i*0.06}s` }}>
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
        <Placeholder label={`${b.name} · gift box, ribbon, artisan`} tone={b.tone} />
        <div style={{
          position: "absolute", top: 14, right: 14,
          background: "var(--olv-amber)", color: "var(--olv-ink)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
          padding: "6px 10px",
        }}>Save ${b.saving}</div>
      </div>
      <div style={{ background: "var(--olv-cream)", padding: "24px 22px" }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, letterSpacing: "-0.01em", marginBottom: 8 }}>{b.name}</div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "var(--olv-ink-soft)", lineHeight: 1.55, marginBottom: 14 }}>{b.desc}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 5 }}>
          {b.items.map(item => (
            <li key={item} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--olv-ink-soft)", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--olv-moss)" }}>◆</span> {item}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28 }}>${b.price}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--olv-ink-soft)", textDecoration: "line-through" }}>${b.price + b.saving} if bought separately</div>
          </div>
          <button onClick={onAdd} style={{
            background: hover ? "var(--olv-ink)" : "var(--olv-amber)",
            color: hover ? "var(--olv-cream)" : "var(--olv-ink)",
            border: 0, padding: "12px 20px", borderRadius: 999,
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all .2s",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}><Icon.plus /> Add to bag</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Journal Page ───────────────────────────────────────────── */
function JournalPage({ setRoute }) {
  const [filter, setFilter] = useState("all");
  const cats = [
    { id: "all", label: "All" },
    { id: "recipes", label: "Recipes" },
    { id: "field", label: "Field notes" },
    { id: "howto", label: "How-to" },
    { id: "farm", label: "Farm stories" },
  ];

  const articles = [
    { id: 1, cat: "recipes", tag: "Recipes", readTime: "6 min", title: "Spring orzo with dill, shaved radish, and Robusto over everything", img: "salad · orzo, bright herbs, lemon", tone: "sage", featured: true },
    { id: 2, cat: "field", tag: "Field notes", readTime: "9 min", title: "On the road in the Iza valley with our pressers at 5am", img: "morning · growers, olive trees, first light", tone: "moss" },
    { id: 3, cat: "howto", tag: "How-to", readTime: "4 min", title: "Why a good vinegar should taste like fruit first, acid second", img: "vinegar · cherry pour, glass", tone: "plum" },
    { id: 4, cat: "farm", tag: "Farm story", readTime: "7 min", title: "The beekeeper who doesn't own a phone, but knows every hive by sound", img: "beekeeper · hives, meadow, golden hour", tone: "amber" },
    { id: 5, cat: "recipes", tag: "Recipes", readTime: "5 min", title: "Honey on everything: seven ways to use acacia honey beyond breakfast", img: "honey · board, cheese, fruit", tone: "cream" },
    { id: 6, cat: "howto", tag: "How-to", readTime: "3 min", title: "How to taste olive oil properly (and why your nose matters more than your tongue)", img: "tasting · spoon, glass, morning light", tone: "bone" },
  ];

  const shown = filter === "all" ? articles : articles.filter(a => a.cat === filter);
  const [featured, ...rest] = shown;

  return (
    <div style={{ background: "var(--olv-bg)" }}>
      {/* Header */}
      <div style={{ padding: "72px 28px 48px", background: "var(--olv-cream)", borderBottom: "1px solid rgba(31,42,26,0.07)" }}>
        <div style={{ maxWidth: 1400, marginInline: "auto" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 12 }}>◓ The journal</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(44px, 5vw, 72px)", margin: "0 0 24px", fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1 }}>
            Field notes & recipes.
          </h1>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {cats.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)} style={{
                background: filter === c.id ? "var(--olv-ink)" : "transparent",
                color: filter === c.id ? "var(--olv-cream)" : "var(--olv-ink)",
                border: "1px solid rgba(31,42,26,0.22)", padding: "9px 16px", borderRadius: 999,
                fontFamily: "'Inter', sans-serif", fontSize: 12.5, cursor: "pointer", transition: "all .15s",
              }}>{c.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, marginInline: "auto", padding: "52px 28px 90px" }}>
        {/* Featured */}
        {featured && (
          <a href="#" style={{ textDecoration: "none", color: "var(--olv-ink)", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0, marginBottom: 52, background: "var(--olv-cream)" }}>
            <div style={{ position: "relative", aspectRatio: "16/9" }}>
              <Placeholder label={featured.img} tone={featured.tone} />
              <span style={{ position: "absolute", top: 16, left: 16, background: "var(--olv-ink)", color: "var(--olv-cream)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 10px" }}>Featured</span>
            </div>
            <div style={{ padding: "44px 44px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-moss)" }}>{featured.tag} · {featured.readTime} read</div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(24px, 2.4vw, 34px)", margin: 0, fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.01em" }}>{featured.title}</h2>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--olv-moss)", display: "inline-flex", alignItems: "center", gap: 6 }}>Read article <Icon.arrow /></span>
            </div>
          </a>
        )}

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 22 }}>
          {rest.map((a, i) => (
            <a key={a.id} href="#" style={{ textDecoration: "none", color: "var(--olv-ink)", display: "block",
              opacity: 0, transform: "translateY(20px)",
              animation: `olv-fadein .5s ease ${i * 0.08}s forwards`,
            }}>
              <div style={{ position: "relative", aspectRatio: "5/4" }}>
                <Placeholder label={a.img} tone={a.tone} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 8 }}>{a.tag} · {a.readTime} read</div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: 0, fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.005em" }}>{a.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Story Page ─────────────────────────────────────────────── */
function StoryPage() {
  const milestones = [
    { year: "2019", event: "Founded in a converted barn near Iza with one cold press and a shared dream of an honest pantry." },
    { year: "2020", event: "First harvest. 400 litres of Robusto Verde pressed by hand. Sold every bottle in 11 days to friends and strangers." },
    { year: "2021", event: "Co-operative expands to 7 farms. First honey harvest from beech-forest hives. Cherry vinegar begins fermenting in the cellar." },
    { year: "2023", event: "Launched the returnable glass programme. 6,200 bottles returned in the first year. Carbon-neutral certification." },
    { year: "2024", event: "14 farms. 11 products. Shipped to 28 countries. The barn now has a tasting room." },
    { year: "2026", event: "Spring harvest opens. The best lot we've ever pressed, according to the fourteen people who pressed it." },
  ];
  const values = [
    { icon: "◉", title: "Full traceability", desc: "Every bottle has a lot number. Click it and you'll know the farm, the press date, and the grower's name." },
    { icon: "◈", title: "Returnable glass", desc: "We'll pick up your empties. They get washed, sterilized, and refilled. The planet can wait — we can't." },
    { icon: "◎", title: "Fair price to growers", desc: "We pay 40% above market rate. That's not altruism — it's what good oil actually costs to make." },
    { icon: "○", title: "Slow food, actually", desc: "No shortcuts. Our vinegar ferments for at least 9 months. Our honey never meets heat above 36°C." },
  ];
  return (
    <div style={{ background: "var(--olv-bg)" }}>
      {/* Hero manifesto */}
      <div style={{ background: "var(--olv-amber)", padding: "96px 28px", textAlign: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-ink)", opacity: 0.65, marginBottom: 18 }}>✶ Our story</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(40px, 5vw, 72px)", margin: "0 0 24px", fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.05, maxWidth: 900, marginInline: "auto" }}>
          We started Munister with one press, fourteen growers, and one rule.
        </h1>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(20px, 2.4vw, 28px)", color: "var(--olv-ink)", opacity: 0.8, maxWidth: 640, marginInline: "auto", fontStyle: "italic", lineHeight: 1.4 }}>
          Nothing leaves the cellar until we'd put it on our own table first.
        </p>
      </div>

      {/* Founder portrait */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--olv-cream)" }}>
        <div style={{ position: "relative", aspectRatio: "1/1" }}>
          <Placeholder label="Marta Solovei · founder · greenhouse, morning light" tone="sage" />
        </div>
        <div style={{ padding: "72px 60px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)" }}>Founder's note</div>
          <blockquote style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(24px, 2.8vw, 36px)", margin: "0 0 18px", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.01em", color: "var(--olv-ink)" }}>
            "I didn't set out to start a company. I set out to find an oil that actually tasted like the ones my grandmother brought from the market."
          </blockquote>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, lineHeight: 1.65, color: "var(--olv-ink-soft)", margin: 0 }}>
            I grew up in a kitchen where food was serious but never precious. My mother's kitchen smelled of olive oil even in winter. When I moved to Kyiv I spent five years buying bottles that said 'extra virgin' and tasting nothing. So I went looking. I found Iza. I found fourteen families who'd been pressing the same olive trees for three generations and had never once sold to a supermarket chain. We shook hands in September 2019. The first press was October 12.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
            <svg width="90" height="44" viewBox="0 0 90 44" fill="none">
              <path d="M5 35 Q18 10, 30 30 T55 24 Q68 18, 82 34" stroke="var(--olv-ink)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>Marta Solovei</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--olv-ink-soft)" }}>Founder & Head Presser · Munister Co-operative · Iza, 2019</div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "90px 28px", background: "var(--olv-bg)" }}>
        <div style={{ maxWidth: 860, marginInline: "auto" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--olv-moss)", marginBottom: 14 }}>◐ Timeline</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(34px, 3.6vw, 48px)", margin: "0 0 52px", fontWeight: 400, letterSpacing: "-0.01em" }}>Six years. Fourteen farms. One rule.</h2>
          {milestones.map((m, i) => (
            <div key={m.year} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 28, paddingBottom: 36, borderLeft: "1px solid rgba(31,42,26,0.12)", marginLeft: 50, position: "relative" }}>
              <div style={{ position: "absolute", left: -6.5, top: 6, width: 13, height: 13, borderRadius: "50%", background: i === milestones.length - 1 ? "var(--olv-amber)" : "var(--olv-ink)", border: "2px solid var(--olv-bg)" }} />
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "var(--olv-ink)", paddingLeft: 24 }}>{m.year}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, lineHeight: 1.65, color: "var(--olv-ink)", paddingTop: 4 }}>{m.event}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div style={{ background: "var(--olv-ink)", color: "var(--olv-cream)", padding: "80px 28px" }}>
        <div style={{ maxWidth: 1200, marginInline: "auto" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 14 }}>◑ How we operate</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 3.4vw, 46px)", margin: "0 0 48px", fontWeight: 400, letterSpacing: "-0.01em" }}>The things we won't compromise on.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 }}>
            {values.map(v => (
              <div key={v.title} style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 24 }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, marginBottom: 10, color: "var(--olv-amber)" }}>{v.icon}</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 12, letterSpacing: "-0.01em" }}>{v.title}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, lineHeight: 1.65, opacity: 0.75 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GiftsPage, JournalPage, StoryPage });
