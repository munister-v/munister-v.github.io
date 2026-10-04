import json, sys
STORE="https://apps.apple.com/us/app/architectura-italy-drawn/id6816227873"
APPLE='<svg class="apple" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5 1-1.4 1.4-2.8 1.4-2.8s-2.7-1-2.7-4.1ZM14 5.4c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z"/></svg>'
L=json.load(open(sys.argv[1]))
def ph(f,alt,cls="phone",lazy=True): return f'<img class="{cls}" src="/architectura/img/{f}.webp?v=2" alt="{alt}" width="780" height="1624"{" loading=\"lazy\"" if lazy else " fetchpriority=\"high\""} decoding="async">'
def feat(sec,i):
    pics=''.join(ph(f,sec['eyebrow'],"phone"+(" second" if k else "")) for k,f in enumerate(sec['pics']))
    cls="feature"+(" pair" if len(sec['pics'])>1 else (" flip" if i%2 else ""))
    dl=''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a,b in sec['dl'])
    return f'<section class="{cls}"><div class="pic">{pics}</div><div class="txt"><p class="eyebrow">{sec["eyebrow"]}</p><h2>{sec["h2"]}</h2><p class="intro">{sec["intro"]}</p><dl>{dl}</dl></div></section>'
pre=L['prefix']
html=f'''<!DOCTYPE html>
<html lang="{L['lang']}" class="irpin-night">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{L['title']}</title>
<meta name="description" content="{L['desc']}">
<link rel="canonical" href="https://munister.com.ua{pre}">
<link rel="alternate" hreflang="en" href="https://munister.com.ua/architectura/">
<link rel="alternate" hreflang="uk" href="https://munister.com.ua/architectura/uk/">
<link rel="alternate" hreflang="x-default" href="https://munister.com.ua/architectura/">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="icon" href="/architectura/img/icon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/architectura/img/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/architectura/img/icon-180.png" sizes="180x180">
<meta name="theme-color" content="#0f0d0b">
<meta name="color-scheme" content="dark">
<meta name="apple-itunes-app" content="app-id=6816227873">
<meta property="og:type" content="website">
<meta property="og:url" content="https://munister.com.ua{pre}">
<meta property="og:site_name" content="Viacheslav Munister">
<meta property="og:title" content="{L['title']}">
<meta property="og:description" content="{L['desc']}">
<meta property="og:image" content="https://munister.com.ua/architectura/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://munister.com.ua/architectura/img/og.jpg">
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"MobileApplication","name":"Architectura: Italy Drawn","operatingSystem":"iOS","applicationCategory":"EducationalApplication","url":"https://munister.com.ua"+pre,"downloadUrl":STORE,"installUrl":STORE,"image":"https://munister.com.ua/architectura/img/icon-512.png","screenshot":"https://munister.com.ua/architectura/img/og.jpg","description":L['desc'],"inLanguage":["en","ru","it"],"author":{"@type":"Person","name":"Viacheslav Munister","url":"https://munister.com.ua/"},"publisher":{"@type":"Organization","name":"EPRIS Journal","url":"https://eprisjournal.com/"}},ensure_ascii=False)}</script>
<link rel="stylesheet" href="/munister.css?v=52">
<link rel="stylesheet" href="/irpin/irpin.css?v=9">
<style>.irpin .phone{{aspect-ratio:780/1624;height:auto}}.irpin .hero .app-icon{{border-radius:20px}}</style>
</head>
<body>
<a class="skip" href="#main">{L['skip']}</a>
<header class="site-head">
  <a class="wordmark" href="{L['home']}">Munister</a>
  <nav aria-label="Main" id="siteNav">{L['nav']}</nav>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="siteNav" aria-label="Menu">
    <svg class="i-open" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    <svg class="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
  </button>
</header>
<main class="site-main" id="main">
<div class="shell irpin">
<nav class="subnav" aria-label="Architectura"><a class="app-name" href="{pre}"><img src="/architectura/img/icon-180.png" alt="" width="26" height="26">Architectura</a><div class="sublinks"><a class="home" href="{pre}" aria-current="page">{L['app']}</a><a href="https://museum.eprisjournal.com/architectura/privacy/"><span class="l">{L['privacy']}</span><span class="s">{L['privacy_s']}</span></a><a href="https://museum.eprisjournal.com/"><span class="l">{L['support']}</span><span class="s">{L['support']}</span></a></div><a class="lang" href="{L['other']}" hreflang="{L['other_lang']}" lang="{L['other_lang']}">{L['other_label']}</a></nav>
  <section class="hero">
    <div class="hero-txt">
      <img class="app-icon" src="/architectura/img/icon-512.png" alt="" width="84" height="84">
      <h1>Architectura: Italy Drawn</h1>
      <p class="slogan">{L['slogan']}</p>
      <p class="lead">{L['lead']}</p>
      <div class="cta"><a class="store" href="{STORE}" target="_blank" rel="noopener">{APPLE}<span><small>{L['dl']}</small>App Store</span></a><a class="more" href="https://museum.eprisjournal.com/" target="_blank" rel="noopener">{L['museum']} →</a></div>
      <p class="fine">{L['fine']}</p>
    </div>
    <div class="hero-pic">{ph('home','Architectura',"phone front",False)}{ph('pantheon-sun','Pantheon',"phone back",False)}</div>
  </section>
  <ul class="facts">{''.join(f'<li><b>{a}</b>{b}</li>' for a,b in L['facts'])}</ul>
  {''.join(feat(s,i) for i,s in enumerate(L['features']))}
  <section class="block tour-wrap"><h2>{L['tour_h']}</h2><p class="intro">{L['tour_i']}</p><div class="tour">{''.join(f'<article class="tour-card">{ph(f,h)}<div><h3>{h}</h3><p>{p}</p></div></article>' for f,h,p in L['tour'])}</div></section>
  <section class="band"><h2>{L['band_h']}</h2><div class="cols">{''.join(f'<div><h3>{a}</h3><p>{b}</p></div>' for a,b in L['band'])}</div></section>
  <section class="block gallery-wrap"><h2>{L['screens']}</h2><div class="gallery">{''.join(f'<figure>{ph(f,c)}<figcaption>{c}</figcaption></figure>' for f,c in L['gallery'])}</div></section>
  <section class="block"><h2>{L['priv_h']}</h2><div class="cols cols3">{''.join(f'<div><h3>{a}</h3><p>{b}</p></div>' for a,b in L['priv'])}</div></section>
  <section class="block"><h2>{L['links_h']}</h2><ul class="links"><li><a href="{STORE}" target="_blank" rel="noopener">App Store</a><span>{L['l1']}</span></li><li><a href="https://museum.eprisjournal.com/architectura/privacy/">{L['privacy']}</a><span>{L['l2']}</span></li><li><a href="https://museum.eprisjournal.com/">EPRIS Museum</a><span>{L['l3']}</span></li><li><a href="mailto:munister@outlook.com">munister@outlook.com</a><span>{L['l4']}</span></li></ul></section>
  <footer class="foot mono">
    <span>© <span id="y"></span> Viacheslav Munister</span>
    <span><a href="https://museum.eprisjournal.com/architectura/privacy/">{L['privacy']}</a> · <a href="mailto:munister@outlook.com">munister@outlook.com</a></span>
  </footer>
</div>
</main>
<script src="/munister.js?v=8" defer></script>
</body>
</html>
'''
open(sys.argv[2],'w').write(html); print('wrote',sys.argv[2],len(html))
