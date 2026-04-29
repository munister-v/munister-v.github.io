/* Munister — components */
const { useState, useEffect, useRef, useMemo } = React;

/* ── Placeholder ─────────────────────────────────────────────── */
function Placeholder({ label, tone = "dark", style }) {
  const t = {
    dark:      { bg:"#ddd3c1", fg:"#766a59", stripe:"rgba(118,106,89,0.16)" },
    gold:      { bg:"#ecd6bf", fg:"#95613d", stripe:"rgba(149,97,61,0.16)" },
    cream:     { bg:"#f2e7d8", fg:"#917961", stripe:"rgba(145,121,97,0.14)" },
    amber:     { bg:"#efcfb8", fg:"#a35b35", stripe:"rgba(163,91,53,0.14)" },
    moss:      { bg:"#dce2d2", fg:"#667255", stripe:"rgba(102,114,85,0.14)" },
    sage:      { bg:"#e4e7db", fg:"#6d745d", stripe:"rgba(109,116,93,0.14)" },
    terra:     { bg:"#ead1c4", fg:"#9a6953", stripe:"rgba(154,105,83,0.14)" },
    plum:      { bg:"#e5d8d5", fg:"#816661", stripe:"rgba(129,102,97,0.14)" },
    bone:      { bg:"#f5efe5", fg:"#887d6d", stripe:"rgba(136,125,109,0.12)" },
    light:     { bg:"#fcf7ef", fg:"#a6947c", stripe:"rgba(166,148,124,0.09)" },
  };
  const c = t[tone] || t.dark;
  return (
    <div style={{
      width:"100%", height:"100%",
      background:`repeating-linear-gradient(135deg,${c.bg} 0 14px,${c.stripe} 14px 15px)`,
      color: c.fg,
      display:"flex", alignItems:"flex-end", justifyContent:"flex-start",
      overflow:"hidden",
      ...style,
    }}>
      <span style={{ fontFamily:"var(--font-mono)", fontSize:9.5, letterSpacing:1, textTransform:"uppercase", padding:"8px 10px", opacity:0.7 }}>
        ▦ {label}
      </span>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────── */
const Icon = {
  search:(p)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>),
  user:  (p)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><circle cx="12" cy="8" r="3.8"/><path d="M5 20c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2"/></svg>),
  bag:   (p)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>),
  pin:   (p)=>(<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>),
  arrow: (p)=>(<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>),
  close: (p)=>(<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>),
  plus:  (p)=>(<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  minus: (p)=>(<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><path d="M5 12h14"/></svg>),
  leaf:  (p)=>(<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16Z"/><path d="M4 20 14 10"/></svg>),
  drop:  (p)=>(<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z"/></svg>),
  star:  (p)=>(<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" {...p}><path d="M12 2.5 14.6 9l6.9.5-5.3 4.5 1.7 6.7L12 17l-5.9 3.7 1.7-6.7L2.5 9.5 9.4 9z"/></svg>),
  check: (p)=>(<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="m5 12 5 5 9-11"/></svg>),
};

/* ── Logo ────────────────────────────────────────────────────── */
function Logo({ color, size = 22 }) {
  const c = color || "var(--olv-ink)";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:12, color:c }}>
      <svg width={size + 4} height={size} viewBox="0 0 34 26" fill="none">
        <path d="M2 23 L10 6 L17 17 L24 6 L32 23" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="2" y1="23" x2="32" y2="23" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="17" cy="3.5" r="2" fill={c}/>
      </svg>
      <span style={{ fontFamily:"var(--font-display)", fontSize:size, letterSpacing:"0.16em", fontWeight:600 }}>MUNISTER</span>
    </div>
  );
}

/* ── Announcement bar ────────────────────────────────────────── */
function AnnouncementBar() {
  return (
    <div style={{
      background:"#e8d7c1", color:"var(--olv-ink)",
      fontSize:11.5, padding:"10px 16px",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"var(--font-label)",
      letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700,
    }}>
      Small-batch pantry goods · Free shipping over $65
    </div>
  );
}

/* ── Marquee ─────────────────────────────────────────────────── */
function Marquee() {
  const items = ["★ 4.9 from 8,420 reviews","Carbon-neutral shipping","Returnable glass program","Fourteen family farms","Cold-pressed within 48hrs","No additives, ever"];
  return (
    <div style={{ background:"var(--olv-surface)", padding:"13px 0", overflow:"hidden", borderTop:"1px solid var(--olv-border)", borderBottom:"1px solid var(--olv-border)" }}>
      <div className="olv-marquee" style={{ display:"inline-flex", gap:56, whiteSpace:"nowrap", fontFamily:"'Barlow Condensed',var(--font-body)", fontSize:12, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--olv-ink-soft)" }}>
        {[...items,...items,...items].map((t,i)=>(<span key={i} style={{display:"inline-flex",alignItems:"center",gap:56}}>{t}<span style={{color:"var(--olv-amber)",opacity:0.7}}>◆</span></span>))}
      </div>
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────────── */
function Hero({ onShop }) {
  return (
    <section style={{ background:"linear-gradient(180deg, #fbf6ee 0%, #f3e7d8 100%)", minHeight:"88vh", display:"grid", gridTemplateColumns:"1.05fr 0.95fr", position:"relative", borderBottom:"1px solid var(--olv-border)" }} className="olv-hero-grid">
      <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", padding:"72px 60px 72px 52px", position:"relative" }} className="olv-hero-padding">
        <div style={{ position:"absolute", top:14, left:36, fontFamily:"var(--font-display)", fontSize:"22vw", color:"transparent", WebkitTextStroke:"1px rgba(35,49,38,0.05)", lineHeight:1, pointerEvents:"none", userSelect:"none", whiteSpace:"nowrap" }}>M</div>
        <div style={{ position:"relative", zIndex:2 }}>
          <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:24, display:"inline-flex", alignItems:"center", gap:12, fontWeight:700 }}>
            <span style={{ width:28, height:1, background:"currentColor", display:"inline-block" }}/>
            Editorial pantry goods · reworked for Munister
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(58px,6.8vw,102px)", lineHeight:0.92, letterSpacing:"-0.03em", color:"var(--olv-ink)", margin:"0 0 24px", fontWeight:600 }}>
            A brighter
            <br/>
            pantry,
            <br/>
            <em style={{fontStyle:"italic",color:"var(--olv-amber)", fontWeight:500}}>slowly made.</em>
          </h1>
          <p style={{ fontFamily:"var(--font-body)", fontSize:15.5, lineHeight:1.72, color:"var(--olv-ink-soft)", maxWidth:460, margin:"0 0 34px" }}>
            Cold-pressed oils, single-origin honey, and vinegars with a clearer, more giftable point of view. Small lots, warm neutrals, and shelf appeal that feels considered rather than loud.
          </p>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={onShop} style={btnPrimary}>Shop the pantry <Icon.arrow /></button>
            <button style={btnGold}>See gift sets</button>
          </div>
          <div style={{ marginTop:48, display:"flex", gap:36, paddingTop:28, borderTop:"1px solid var(--olv-border)" }}>
            {[["14","Partner farms"],["48 hrs","Press to bottle"],["Gift-ready","By design"]].map(([n,l])=>(
              <div key={l}>
                <div style={{fontFamily:"var(--font-display)",fontSize:36,color:"var(--olv-ink)",lineHeight:1}}>{n}</div>
                <div style={{fontFamily:"var(--font-label)",fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--olv-ink-soft)",marginTop:5,fontWeight:700}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position:"relative", overflow:"hidden", borderLeft:"1px solid var(--olv-border)" }}>
        <Placeholder label="hero · robusto EVOO pour · studio" tone="gold" style={{position:"absolute",inset:0}} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(247,241,230,0.34) 0%, transparent 28%)" }} />
        <div style={{ position:"absolute", bottom:34, left:28, background:"rgba(255,250,242,0.92)", border:"1px solid var(--olv-border)", padding:"18px 22px", maxWidth:280, boxShadow:"0 16px 40px rgba(106,84,59,0.08)" }}>
          <div style={{fontFamily:"var(--font-label)",fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--olv-amber)",marginBottom:6,fontWeight:700}}>Lot · 2026-04 · Robusto</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--olv-ink)",lineHeight:1.1}}>Peppery, grassy, and dinner-party ready.</div>
          <div style={{fontFamily:"var(--font-body)",fontSize:12,color:"var(--olv-ink-soft)",marginTop:8,lineHeight:1.6}}>Pressed Oct 12. 350ml returnable glass with a more refined shelf presence.</div>
          <div style={{width:"100%",height:1,background:"var(--olv-amber)",marginTop:14,opacity:0.4}}/>
        </div>
        <div style={{position:"absolute",top:28,right:28,background:"rgba(255,250,242,0.78)",border:"1px solid var(--olv-border)",padding:"10px 14px",backdropFilter:"blur(8px)"}}>
          <Logo size={13} />
        </div>
      </div>
    </section>
  );
}

const btnPrimary = { background:"var(--olv-ink)", color:"var(--olv-surface)", border:0, padding:"14px 24px", borderRadius:999, fontSize:12.5, fontFamily:"var(--font-label)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8, transition:"background .2s" };
const btnGold = { background:"transparent", color:"var(--olv-ink)", border:"1px solid var(--olv-border-gold)", padding:"14px 24px", borderRadius:999, fontSize:12.5, fontFamily:"var(--font-label)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" };
const btnGhost = { background:"transparent", color:"var(--olv-ink)", border:"1px solid var(--olv-border)", padding:"13px 22px", borderRadius:999, fontSize:12, fontFamily:"var(--font-label)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" };
const iconBtn = { background:"transparent", border:0, cursor:"pointer", color:"inherit", padding:6, display:"inline-flex", alignItems:"center" };

/* ── Pantry Grid ─────────────────────────────────────────────── */
function PantryGrid({ onCategory }) {
  const cats = [
    { id:"evoo",    label:"Olive Oils",   n:"01", tone:"gold",  img:"three bottles · citrus, studio" },
    { id:"honey",   label:"Wild Honey",   n:"02", tone:"amber", img:"honey jars · forest light" },
    { id:"vinegar", label:"Vinegars",     n:"03", tone:"plum",  img:"vinegar · cherry, rose" },
    { id:"infused", label:"Infused Oils", n:"04", tone:"moss",  img:"garlic & basil infused" },
    { id:"kitchen", label:"Kitchen",      n:"05", tone:"dark",  img:"ceramics, spoon, linen" },
  ];
  return (
    <section style={{ background:"var(--olv-surface)", padding:"90px 0 0" }}>
      <div style={{ maxWidth:1400, marginInline:"auto", padding:"0 48px 48px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48 }}>
          <div>
            <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:12, fontWeight:700 }}>◐ Shop by category</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(40px,4.5vw,60px)", margin:0, fontWeight:600, letterSpacing:"-0.02em", color:"var(--olv-ink)" }}>The Munister pantry.</h2>
          </div>
          <button onClick={()=>onCategory("all")} style={btnGold}>Shop all <Icon.arrow /></button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", height:480 }} className="olv-pantry-grid">
        {cats.map((c,i)=>(
          <a key={c.id} href="#" onClick={e=>{e.preventDefault();onCategory(c.id);}}
            style={{ textDecoration:"none", color:"var(--olv-ink)", position:"relative", overflow:"hidden", display:"block" }}
            className="mn-cat-card">
            <Placeholder label={c.img} tone={c.tone} style={{position:"absolute",inset:0}} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(35,49,38,0.48) 18%, transparent 72%)" }} />
            <div style={{ position:"absolute", top:-20, right:-10, fontFamily:"var(--font-display)", fontSize:160, color:"transparent", WebkitTextStroke:"1px rgba(255,255,255,0.24)", lineHeight:1, pointerEvents:"none" }}>{c.n}</div>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"24px 20px" }}>
              <div style={{ fontFamily:"var(--font-label)", fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:"#fff7eb", marginBottom:6, fontWeight:700 }}>{c.n}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:26, lineHeight:1.05, color:"#fffaf1" }}>{c.label}</div>
              <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:6, fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"#fff7eb", opacity:0, transition:"opacity .25s", fontWeight:700 }} className="mn-cat-arrow">Explore <Icon.arrow /></div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ── Product Card ────────────────────────────────────────────── */
function ProductCard({ p, idx, onAdd, onOpen, wishlist, toggleWish }) {
  const [hover, setHover] = useState(false);
  const num = String(idx + 1).padStart(2,"0");
  const wished = wishlist?.includes(p.id);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ color:"var(--olv-ink)", position:"relative" }}>
      <div onClick={()=>onOpen(p)} style={{ position:"relative", aspectRatio:"3/4", cursor:"pointer", overflow:"hidden", background:"var(--olv-surface)" }}
        data-cursor-label={p.name}>
        <Placeholder label={`${p.name} · ${p.note}`} tone={p.tone} style={{position:"absolute",inset:0}} />
        {/* Hover overlay strip */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height: hover ? "100%" : 0, background:"rgba(201,160,64,0.06)", transition:"height .35s cubic-bezier(.2,.8,.2,1)" }} />
        {/* Gold bottom rule on hover */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:"var(--olv-amber)", transform: hover ? "scaleX(1)" : "scaleX(0)", transition:"transform .3s ease", transformOrigin:"left" }} />
        {/* Number */}
        <div style={{ position:"absolute", top:12, left:14, fontFamily:"var(--font-display)", fontSize:13, color:"var(--olv-amber)", opacity:0.7, letterSpacing:"0.06em" }}>{num}</div>
        {/* Tag */}
        {p.tag && (<span style={{ position:"absolute", top:12, right:14, background:"var(--olv-surface)", color:"var(--olv-ink)", fontFamily:"var(--font-label)", fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:700, padding:"5px 9px", border:"1px solid var(--olv-border)" }}>{p.tag}</span>)}
        {/* Wishlist */}
        {toggleWish && (
          <button onClick={e=>{e.stopPropagation();toggleWish(p.id);}} style={{ position:"absolute", bottom:12, right:14, background:"transparent", border:0, cursor:"pointer", color: wished?"var(--olv-amber)":"rgba(237,228,206,0.4)", fontSize:18, lineHeight:1, padding:4 }}>
            {wished ? "♥" : "♡"}
          </button>
        )}
        {/* Add on hover */}
        <button onClick={e=>{e.stopPropagation();onAdd(p);}} style={{
          position:"absolute", bottom:12, left:12, right:44,
          background:"var(--olv-amber)", color:"var(--olv-bg)",
          border:0, padding:"10px 14px", fontFamily:"var(--font-label)",
          fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
          cursor:"pointer", transform: hover?"translateY(0)":"translateY(8px)",
          opacity: hover?1:0, transition:"all .25s",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        }}><Icon.plus /> Add · ${p.price}</button>
      </div>
      <div style={{ marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:21, lineHeight:1.05, letterSpacing:"-0.015em" }}>{p.name}</div>
          <div style={{ fontFamily:"var(--font-body)", fontSize:12.5, color:"var(--olv-ink-soft)", marginTop:5 }}>{p.note} · {p.size}</div>
        </div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:21, color:"var(--olv-ink)" }}>${p.price}</div>
      </div>
      <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:4, fontSize:11, color:"var(--olv-ink-soft)", fontFamily:"var(--font-body)" }}>
        <Icon.star style={{color:"var(--olv-amber)"}} /> {p.rating} <span style={{opacity:0.5}}>· {p.reviews} reviews</span>
      </div>
    </div>
  );
}

/* ── Best Sellers ────────────────────────────────────────────── */
function BestSellers({ products, onAdd, onOpen, wishlist, toggleWish }) {
  const [tab, setTab] = useState("all");
  const tabs = [{id:"all",label:"All"},{id:"evoo",label:"Olive oil"},{id:"honey",label:"Honey"},{id:"vinegar",label:"Vinegar"},{id:"infused",label:"Infused"}];
  const list = useMemo(()=>tab==="all"?products:products.filter(p=>p.cat===tab),[tab,products]);
  return (
    <section style={{ padding:"96px 48px", background:"var(--olv-bg)" }}>
      <div style={{ maxWidth:1400, marginInline:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:44, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:12, fontWeight:700 }}>◑ Best sellers</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(40px,4.5vw,58px)", margin:0, fontWeight:600, letterSpacing:"-0.02em", color:"var(--olv-ink)" }}>Pantry favorites.</h2>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                background: tab===t.id?"var(--olv-ink)":"transparent",
                color: tab===t.id?"var(--olv-surface)":"var(--olv-ink-soft)",
                border:"1px solid", borderColor: tab===t.id?"var(--olv-ink)":"var(--olv-border)",
                padding:"9px 16px", fontFamily:"var(--font-label)",
                fontSize:11.5, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
                cursor:"pointer", transition:"all .15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24 }} className="olv-products-grid">
          {list.slice(0,8).map((p,i)=>(<ProductCard key={p.id} p={p} idx={i} onAdd={onAdd} onOpen={onOpen} wishlist={wishlist} toggleWish={toggleWish} />))}
        </div>
      </div>
    </section>
  );
}

/* ── Featured Slab ───────────────────────────────────────────── */
function FeaturedSlab() {
  return (
    <section style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", minHeight:560, background:"var(--olv-light)", color:"var(--olv-bg)" }} className="olv-featured-slab">
      <div style={{ position:"relative", overflow:"hidden" }}>
        <Placeholder label="lifestyle · bread, table, decanter, evening light" tone="light" style={{position:"absolute",inset:0}} />
      </div>
      <div style={{ padding:"72px 60px", display:"flex", flexDirection:"column", justifyContent:"center", gap:20, background:"var(--olv-bg)" }}>
        <div style={{ fontFamily:"'Barlow Condensed',var(--font-body)", fontSize:11, letterSpacing:"0.26em", textTransform:"uppercase", color:"var(--olv-amber)" }}>Founder's pick · No. 04</div>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(28px,3vw,44px)", margin:0, fontWeight:400, lineHeight:1.1, letterSpacing:"-0.01em", color:"var(--olv-ink)" }}>
          "The bottle that taught me oil could taste like a place."
        </h2>
        <p style={{ fontFamily:"var(--font-body)", fontSize:14.5, lineHeight:1.65, color:"var(--olv-ink-soft)", margin:0, maxWidth:400 }}>
          Robusto Verde — Koroneiki olives picked the morning of October 12. Polyphenol-rich, peppery, and impossible to finish slowly.
        </p>
        <div style={{ display:"flex", gap:12, marginTop:8 }}>
          <button style={btnPrimary}>Shop Robusto Verde — $36 <Icon.arrow /></button>
        </div>
      </div>
    </section>
  );
}

/* ── Editorial ───────────────────────────────────────────────── */
function Editorial() {
  return (
    <section style={{ background:"var(--olv-surface)", padding:"100px 48px", position:"relative", overflow:"hidden" }}>
      {/* Large ghost text */}
      <div style={{ position:"absolute", bottom:-40, right:-20, fontFamily:"var(--font-display)", fontSize:"22vw", color:"transparent", WebkitTextStroke:"1px rgba(201,160,64,0.05)", lineHeight:1, pointerEvents:"none", userSelect:"none" }}>Slow</div>
      <div style={{ maxWidth:860, marginInline:"auto", textAlign:"center", position:"relative", zIndex:1 }}>
        <div style={{ fontFamily:"'Barlow Condensed',var(--font-body)", fontSize:11, letterSpacing:"0.26em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:20 }}>✶ A small manifesto</div>
        <div style={{ width:48, height:1, background:"var(--olv-amber)", opacity:0.5, marginInline:"auto", marginBottom:32 }} />
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(32px,4vw,54px)", margin:"0 0 32px", fontWeight:400, lineHeight:1.1, letterSpacing:"-0.01em", color:"var(--olv-ink)" }}>
          Living slowly looks like…
        </h2>
        <p style={{ fontFamily:"var(--font-body)", fontSize:17, lineHeight:1.75, color:"var(--olv-ink-soft)", margin:0 }}>
          Long lunches that bleed into afternoons. The hum of bees at six. Sourdough that takes three days. A spoon of honey before bed. Knowing the names of the fourteen people who pressed your oil. Dipping bread, twice. Eating with your hands. Saving the bottle. Refilling it. Calling your mother. Sitting outside even when it's cold. Letting the tomato actually ripen.
        </p>
      </div>
    </section>
  );
}

/* ── Founder's Note ──────────────────────────────────────────── */
function FoundersNote() {
  return (
    <section style={{ padding:"96px 48px", background:"var(--olv-surface)" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", maxWidth:1300, marginInline:"auto", gap:0, border:"1px solid var(--olv-border)", background:"var(--olv-light)" }} className="olv-founder-grid">
        <div style={{ position:"relative", aspectRatio:"1/1" }}>
          <Placeholder label="Marta Solovei · founder · greenhouse, window light" tone="sage" />
        </div>
        <div style={{ padding:"60px 52px", display:"flex", flexDirection:"column", justifyContent:"center", background:"var(--olv-light)" }}>
          <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:18, fontWeight:700 }}>From the founder</div>
          <blockquote style={{ fontFamily:"var(--font-display)", fontSize:"clamp(24px,2.8vw,38px)", lineHeight:1.15, margin:"0 0 22px", letterSpacing:"-0.02em", color:"var(--olv-ink)", fontWeight:600, fontStyle:"italic" }}>
            "Nothing leaves the cellar until we'd put it on our own table first."
          </blockquote>
          <p style={{ fontFamily:"var(--font-body)", fontSize:15, lineHeight:1.72, color:"var(--olv-ink-soft)", margin:0 }}>
            Munister began with a simple frustration: most premium pantry goods looked expensive but tasted anonymous. We wanted a collection that felt bright, giftable, and clearly traceable from shelf to farm.
          </p>
          <div style={{ marginTop:28, display:"flex", alignItems:"center", gap:14, paddingTop:24, borderTop:"1px solid var(--olv-border)" }}>
            <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
              <path d="M4 28 Q16 8,26 24 T50 18 Q62 14,74 26" stroke="var(--olv-amber)" fill="none" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--olv-ink)", fontWeight:600 }}>Marta Solovei</div>
              <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--olv-ink-soft)", marginTop:2, fontWeight:700 }}>Founder & Head Presser</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Journal ─────────────────────────────────────────────────── */
function Journal({ onMore }) {
  const stories = [
    { tag:"Recipes",    title:"Spring orzo with dill, lemon & shaved Robusto",  img:"salad · orzo, dill, marigold", tone:"sage" },
    { tag:"Field notes",title:"On the road in the Iza valley with our pressers", img:"olive grove · early light",    tone:"moss" },
    { tag:"How-to",     title:"Why a good vinegar should taste like fruit first", img:"vinegar pour over salad",       tone:"plum" },
  ];
  return (
    <section style={{ padding:"100px 48px", background:"var(--olv-surface)" }}>
      <div style={{ maxWidth:1400, marginInline:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48 }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',var(--font-body)", fontSize:11, letterSpacing:"0.26em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:12 }}>◓ The journal</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(36px,4.5vw,58px)", margin:0, fontWeight:400, letterSpacing:"-0.015em", color:"var(--olv-ink)" }}>Field notes & recipes.</h2>
          </div>
          <button onClick={onMore} style={btnGhost}>All stories <Icon.arrow /></button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }} className="olv-journal-grid">
          {stories.map((s,i)=>(
            <a href="#" key={i} style={{ textDecoration:"none", color:"var(--olv-ink)", display:"block", position:"relative", overflow:"hidden" }}>
              <div style={{ aspectRatio:"5/4", position:"relative" }}>
                <Placeholder label={s.img} tone={s.tone} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(8,12,6,0.8) 30%, transparent 65%)" }} />
                <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"20px 22px" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',var(--font-body)", fontSize:10.5, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:8 }}>{s.tag} <Icon.arrow style={{display:"inline",verticalAlign:"middle"}}/></div>
                  <h3 style={{ fontFamily:"var(--font-display)", fontSize:22, lineHeight:1.2, margin:0, fontWeight:400, letterSpacing:"-0.005em" }}>{s.title}</h3>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Newsletter ──────────────────────────────────────────────── */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section style={{ padding:"96px 48px", background:"var(--olv-bg)", borderTop:"1px solid var(--olv-border)" }}>
      <div style={{ maxWidth:620, marginInline:"auto", textAlign:"center" }}>
        <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:16, fontWeight:700 }}>The Saturday letter</div>
        <div style={{ width:40, height:1, background:"var(--olv-amber)", opacity:0.5, marginInline:"auto", marginBottom:24 }} />
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(34px,3.8vw,50px)", margin:"0 0 14px", fontWeight:600, lineHeight:1.1, letterSpacing:"-0.02em", color:"var(--olv-ink)" }}>
          One slow recipe. One field note.<br/><em>Every Saturday morning.</em>
        </h2>
        <p style={{ color:"var(--olv-ink-soft)", fontFamily:"var(--font-body)", fontSize:14.5, marginBottom:28, lineHeight:1.7 }}>
          New subscribers get 10% off their first order.
        </p>
        <form onSubmit={e=>{e.preventDefault();if(email.includes("@"))setDone(true);}}
          style={{ display:"flex", gap:0, border:"1px solid var(--olv-border-gold)", padding:4, maxWidth:480, marginInline:"auto", background:"var(--olv-surface)", borderRadius:999 }}>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="you@kitchen.com"
            style={{ flex:1, border:0, background:"transparent", padding:"12px 18px", fontFamily:"var(--font-body)", fontSize:14, color:"var(--olv-ink)", outline:"none" }} />
          <button type="submit" style={{ ...btnPrimary, borderRadius:999, padding:"12px 22px" }}>
            {done ? <><Icon.check /> Done</> : <>Subscribe <Icon.arrow /></>}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { h:"Shop",    items:["Olive Oils","Wild Honey","Vinegars","Infused Oils","Kitchen","Gift Sets"] },
    { h:"Explore", items:["Our Story","Field Journal","Recipes","Press","Trade & Wholesale"] },
    { h:"Help",    items:["Shipping","Returns & Refills","Contact","FAQ","Find a Stockist"] },
  ];
  return (
    <footer style={{ background:"#efe2d0", color:"var(--olv-ink)", padding:"80px 48px 32px", borderTop:"1px solid var(--olv-border)" }}>
      <div style={{ maxWidth:1400, marginInline:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr", gap:40, marginBottom:64 }} className="olv-footer-grid">
          <div>
            <Logo size={20} />
            <p style={{ fontFamily:"var(--font-body)", fontSize:13.5, lineHeight:1.72, color:"var(--olv-ink-soft)", marginTop:16, maxWidth:320 }}>
              Cold-pressed oils, single-origin honey, and vinegars from fourteen family farms in the Carpathian foothills. A calmer shelf, a brighter palette, and better ingredients.
            </p>
            <div style={{ display:"flex", gap:8, marginTop:20, flexWrap:"wrap" }}>
              {["B Corp","1% for soil","Returnable glass"].map(t=>(
                <span key={t} style={{ fontFamily:"var(--font-label)", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", border:"1px solid var(--olv-border-gold)", padding:"5px 10px", color:"var(--olv-amber)", fontWeight:700, borderRadius:999 }}>{t}</span>
              ))}
            </div>
          </div>
          {cols.map(c=>(
            <div key={c.h}>
              <div style={{ fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"var(--olv-amber)", marginBottom:16, fontWeight:700 }}>{c.h}</div>
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:10 }}>
                {c.items.map(item=>(<li key={item}><a href="#" style={{ fontFamily:"var(--font-body)", fontSize:13.5, color:"var(--olv-ink-soft)", textDecoration:"none" }}>{item}</a></li>))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid var(--olv-border)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--olv-ink-soft)", fontWeight:700 }}>
          <span>© 2026 Munister Co-operative · Iza, Carpathians</span>
          <span>Made slowly · Shipped lightly</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Cart Drawer ─────────────────────────────────────────────── */
function CartDrawer({ open, onClose, items, setItems }) {
  const subtotal = items.reduce((s,it)=>s+it.price*it.qty,0);
  const remaining = Math.max(0,65-subtotal);
  const pct = Math.min(100,(subtotal/65)*100);
  const change = (id,d) => setItems(items.map(it=>it.id===id?{...it,qty:Math.max(0,it.qty+d)}:it).filter(it=>it.qty>0));
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(8,12,6,0.7)",backdropFilter:"blur(4px)",opacity:open?1:0,pointerEvents:open?"auto":"none",transition:"opacity .3s",zIndex:80 }} />
      <aside style={{
        position:"fixed",top:0,right:0,height:"100%",width:420,maxWidth:"92vw",
        background:"var(--olv-surface)",border:"left",borderLeft:"1px solid var(--olv-border)",
        transform:open?"translateX(0)":"translateX(110%)",
        transition:"transform .35s cubic-bezier(.2,.8,.2,1)",zIndex:90,
        display:"flex",flexDirection:"column",
      }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 22px",borderBottom:"1px solid var(--olv-border)" }}>
          <div style={{ fontFamily:"var(--font-display)",fontSize:22,color:"var(--olv-ink)" }}>Your bag <span style={{color:"var(--olv-ink-soft)"}} >({items.reduce((s,it)=>s+it.qty,0)})</span></div>
          <button onClick={onClose} style={iconBtn}><Icon.close /></button>
        </div>
        <div style={{ padding:"14px 22px",borderBottom:"1px solid var(--olv-border)",background:"var(--olv-bg)" }}>
          {remaining===0?(
            <div style={{fontFamily:"'Barlow Condensed',var(--font-body)",fontSize:12,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--olv-amber)",display:"flex",alignItems:"center",gap:6}}><Icon.check /> Free shipping unlocked</div>
          ):(
            <div style={{fontFamily:"var(--font-body)",fontSize:13,color:"var(--olv-ink-soft)"}}><span style={{color:"var(--olv-amber)",fontWeight:500}}>${remaining.toFixed(2)}</span> away from free shipping</div>
          )}
          <div style={{height:2,background:"var(--olv-border)",marginTop:10,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:"var(--olv-amber)",transition:"width .3s"}}/>
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"8px 22px" }}>
          {items.length===0&&(
            <div style={{padding:"60px 0",textAlign:"center",color:"var(--olv-ink-soft)",fontFamily:"var(--font-body)"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--olv-ink)",marginBottom:6}}>Your bag is empty.</div>
              <div style={{fontSize:13.5}}>Try the spring harvest oils.</div>
            </div>
          )}
          {items.map(it=>(
            <div key={it.id+it.size} style={{display:"grid",gridTemplateColumns:"68px 1fr auto",gap:14,padding:"16px 0",borderBottom:"1px solid var(--olv-border)"}}>
              <div style={{background:"var(--olv-bg)",aspectRatio:"1/1",overflow:"hidden"}}>
                <Placeholder label={it.name} tone={it.tone||"dark"} />
              </div>
              <div>
                <div style={{fontFamily:"var(--font-display)",fontSize:17,lineHeight:1.15,color:"var(--olv-ink)"}}>{it.name}</div>
                <div style={{fontFamily:"var(--font-body)",fontSize:12,color:"var(--olv-ink-soft)",marginTop:3}}>{it.size}</div>
                <div style={{display:"inline-flex",marginTop:10,border:"1px solid var(--olv-border)",alignItems:"center"}}>
                  <button onClick={()=>change(it.id,-1)} style={{...iconBtn,padding:"6px 10px"}}><Icon.minus/></button>
                  <span style={{fontFamily:"var(--font-body)",fontSize:13,padding:"0 8px",minWidth:14,textAlign:"center",color:"var(--olv-ink)"}}>{it.qty}</span>
                  <button onClick={()=>change(it.id,1)} style={{...iconBtn,padding:"6px 10px"}}><Icon.plus/></button>
                </div>
              </div>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,color:"var(--olv-amber)"}}>${(it.price*it.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"20px 22px",borderTop:"1px solid var(--olv-border)",background:"var(--olv-bg)" }}>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--font-body)",fontSize:14,marginBottom:14,color:"var(--olv-ink)"}}>
            <span>Subtotal</span>
            <span style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--olv-amber)"}}>${subtotal.toFixed(2)}</span>
          </div>
          <button style={{...btnPrimary,width:"100%",justifyContent:"center",padding:"15px 22px"}} disabled={!items.length}>
            Checkout · ${subtotal.toFixed(2)} <Icon.arrow/>
          </button>
          <div style={{fontFamily:"'Barlow Condensed',var(--font-body)",fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--olv-ink-soft)",textAlign:"center",marginTop:12}}>Free returns · Returnable glass · Carbon-neutral</div>
        </div>
      </aside>
    </>
  );
}

/* ── Quick View (kept minimal now — PDP is the main flow) ────── */
function QuickView({ p, onClose, onAdd }) {
  if (!p) return null;
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(8,12,6,0.75)",backdropFilter:"blur(6px)",zIndex:100}}/>
      <div style={{position:"fixed",inset:0,zIndex:101,display:"grid",placeItems:"center",padding:24,pointerEvents:"none"}}>
        <div style={{background:"var(--olv-surface)",border:"1px solid var(--olv-border)",maxWidth:820,width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",pointerEvents:"auto",maxHeight:"88vh",overflow:"hidden"}}>
          <div style={{position:"relative",aspectRatio:"1/1.05"}}><Placeholder label={`${p.name} · ${p.note}`} tone={p.tone}/></div>
          <div style={{padding:"32px 36px",display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div style={{fontFamily:"'Barlow Condensed',var(--font-body)",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:"var(--olv-amber)"}}>Lot {p.lot}</div>
              <button onClick={onClose} style={iconBtn}><Icon.close/></button>
            </div>
            <h2 style={{fontFamily:"var(--font-display)",fontSize:32,margin:0,fontWeight:400,letterSpacing:"-0.01em",lineHeight:1.1,color:"var(--olv-ink)"}}>{p.name}</h2>
            <div style={{fontFamily:"var(--font-body)",fontSize:13,color:"var(--olv-ink-soft)"}}>{p.note} · {p.region}</div>
            <p style={{fontFamily:"var(--font-body)",fontSize:14.5,lineHeight:1.6,color:"var(--olv-ink)",margin:0}}>{p.desc}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {p.tasting.map(t=>(<div key={t} style={{border:"1px solid var(--olv-border)",padding:"9px 8px",textAlign:"center",fontFamily:"'Barlow Condensed',var(--font-body)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--olv-ink-soft)"}}>{t}</div>))}
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginTop:4}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:32,color:"var(--olv-amber)"}}>${p.price}</div>
              <button onClick={()=>{onAdd(p);onClose();}} style={{...btnPrimary,flex:1,justifyContent:"center"}}>Add to bag <Icon.arrow/></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Toast ───────────────────────────────────────────────────── */
function Toast({ msg }) {
  return (
    <div style={{
      position:"fixed",bottom:28,left:"50%",transform:`translateX(-50%) translateY(${msg?0:20}px)`,
      opacity:msg?1:0,transition:"all .3s",background:"var(--olv-surface)",
      border:"1px solid var(--olv-border-gold)",color:"var(--olv-ink)",
      padding:"12px 20px",fontFamily:"'Barlow Condensed',var(--font-body)",
      fontSize:12,letterSpacing:"0.14em",textTransform:"uppercase",
      display:"flex",alignItems:"center",gap:10,zIndex:70,
      boxShadow:"0 12px 40px rgba(0,0,0,0.4)",
    }}>
      <Icon.check style={{color:"var(--olv-amber)"}}/> {msg}
    </div>
  );
}

Object.assign(window, {
  Logo, Header: null, Hero, Marquee, PantryGrid, FeaturedSlab,
  ProductCard, BestSellers, Editorial, FoundersNote, Journal,
  Newsletter, Footer, CartDrawer, QuickView, Toast,
  Placeholder, Icon, btnPrimary, btnGold, btnGhost, iconBtn,
  AnnouncementBar,
});
