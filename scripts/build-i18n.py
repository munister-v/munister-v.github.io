#!/usr/bin/env python3
"""Builds the Italian, French and German pages (home, research, CV) from the
English sources, and keeps the language switcher and hreflang alternates in
sync on every language version. Run from the repo root:

    python3 scripts/build-i18n.py

English (/) and Ukrainian (/uk/) are hand-written; this script only patches
their switcher and alternates. Writing stays English-only and is linked from
every language. The sync-writing workflow re-runs this after it refreshes the
home page so the teaser in it/, fr/ and de/ never goes stale.
"""
import html
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from i18n_data import LANGS, MONTHS, T  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SITE = "https://munister.com.ua"

# page key -> (English source, path under a language folder, path inside the language folder)
PAGES = {
    "home": ("index.html", "", "index.html"),
    "research": ("research/index.html", "research/", "research/index.html"),
    "cv": ("cv.html", "cv.html", "cv.html"),
}
ORDER = ["en", "uk", "it", "fr", "de"]
SHORT = {"en": "EN", "uk": "UA", "it": "IT", "fr": "FR", "de": "DE"}
NAMES = {"en": "English", "uk": "Українська", "it": "Italiano", "fr": "Français", "de": "Deutsch"}
LANG_LABEL = {"en": "Language", "uk": "Мова", "it": "Lingua", "fr": "Langue", "de": "Sprache"}
KINDS = {  # "Essay · Painting" style kickers on the writing teaser
    "it": {"Essay": "Saggio", "Interview": "Intervista", "Review": "Recensione"},
    "fr": {"Essay": "Essai", "Interview": "Entretien", "Review": "Critique"},
    "de": {"Essay": "Essay", "Interview": "Interview", "Review": "Rezension"},
}
EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def url_for(lang, page):
    _, sub, _ = PAGES[page]
    if lang == "en":
        return "/" + sub
    return f"/{lang}/{sub}"


def alternates(page):
    out = []
    for lang in ORDER:
        out.append(f'<link rel="alternate" hreflang="{lang}" href="{SITE}{url_for(lang, page)}">')
    out.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}{url_for("en", page)}">')
    return "\n".join(out)


def switcher(cur, page):
    items = []
    for lang in ORDER:
        cur_attr = ' aria-current="true"' if lang == cur else ""
        items.append(f'<a href="{url_for(lang, page)}" hreflang="{lang}" lang="{lang}"{cur_attr}><b>{SHORT[lang]}</b> {NAMES[lang]}</a>')
    return (f'<details class="lang-switch"><summary aria-label="{LANG_LABEL[cur]}: {NAMES[cur]}">{SHORT[cur]}</summary>'
            f'<div class="lang-menu">' + "".join(items) + "</div></details>")


def chips(cur, page):
    return "".join(
        f'<a class="chip" href="{url_for(l, page)}" hreflang="{l}" lang="{l}">{NAMES[l]}</a>'
        for l in ORDER if l != cur
    )


def footer_links(cur, page):
    return " · ".join(
        f'<a href="{url_for(l, page)}" hreflang="{l}" lang="{l}">{NAMES[l]}</a>' for l in ORDER if l != cur
    )


def put(s, name, content, first_pattern):
    """Idempotent slot: <!--name-->...<!--/name--> (created from first_pattern on first run)."""
    slot = f"<!--{name}-->{content}<!--/{name}-->"
    if f"<!--{name}-->" in s:
        return re.sub(rf"<!--{name}-->.*?<!--/{name}-->", lambda m: slot, s, count=1, flags=re.S)
    return re.sub(first_pattern, lambda m: slot, s, count=1)


def swap_head(s, cur, page):
    """Alternates block + switcher, valid for any language version."""
    s = re.sub(r'(<link rel="alternate" hreflang="[^"]+" href="[^"]+">\s*)+', alternates(page) + "\n", s, count=1)
    s = put(s, "langsw", switcher(cur, page), r'<a class="lang-switch"[^>]*>[^<]*</a>')
    return s


def translate_text(text, lang):
    key = re.sub(r"\s+", " ", text).strip()
    if not key:
        return None
    i = LANGS[lang]["idx"]
    if key in T:
        return T[key][i]
    m = re.fullmatch(r"(%s) (\d{1,2}), (\d{4})" % "|".join(EN_MONTHS), key)
    if m:
        mon = MONTHS[lang][EN_MONTHS.index(m.group(1))]
        d, y = int(m.group(2)), m.group(3)
        return f"{d}. {mon} {y}" if lang == "de" else f"{d} {mon} {y}"
    m = re.fullmatch(r"(Essay|Interview|Review)( · .*)?", key)
    if m:
        return KINDS[lang][m.group(1)] + (m.group(2) or "")
    m = re.fullmatch(r"Essays, criticism and interviews in EPRIS Journal\. (\d+) pieces, newest first\.", key)
    if m:
        n = m.group(1)
        return {
            "it": f"Saggi, critica e interviste su EPRIS Journal. {n} contributi, i più recenti per primi.",
            "fr": f"Essais, critique et entretiens dans EPRIS Journal. {n} textes, les plus récents d’abord.",
            "de": f"Essays, Kritik und Interviews im EPRIS Journal. {n} Beiträge, die neuesten zuerst.",
        }[lang]
    m = re.fullmatch(r"All (\d+) pieces", key)
    if m:
        n = m.group(1)
        return {"it": f"Tutti i {n} contributi", "fr": f"Les {n} textes", "de": f"Alle {n} Beiträge"}[lang]
    return None


def build(page, lang):
    src, _, dest = PAGES[page]
    s = open(os.path.join(ROOT, src), encoding="utf-8").read()
    L = LANGS[lang]

    # internal links first, while the source is still English
    base = f"/{lang}/"
    s = s.replace('class="wordmark" href="/"', f'class="wordmark" href="{base}"')
    s = s.replace('href="/research/"', f'href="{base}research/"')
    s = s.replace('href="cv.html"', f'href="{base}cv.html"')
    s = s.replace('<a class="chip" href="/">', f'<a class="chip" href="{base}">')
    s = s.replace('<a href="/">Back', f'<a href="{base}">Back')
    s = s.replace('="images/', '="/images/').replace(', images/', ', /images/')
    if page == "cv":
        s = put(s, "chips", chips(lang, "cv"), r'<a class="chip" href="/uk/cv\.html"[^>]*>[^<]*</a>')
    if page == "home":
        s = put(s, "footlangs", footer_links(lang, "home"), r'<a href="/uk/" hreflang="uk" lang="uk">[^<]*</a>')

    # the auto-synced teaser strings sit between comment markers
    s = re.sub(
        r"(<!-- AUTO:HOME_WRITING_(?:NOTE|BUTTON):START -->)(.*?)(<!-- AUTO:HOME_WRITING_(?:NOTE|BUTTON):END -->)",
        lambda m: m.group(1) + (translate_text(m.group(2), lang) or m.group(2)) + m.group(3),
        s, flags=re.S)

    # text nodes (never inside script/style/comments)
    def node(m):
        if m.group(1) is None:
            return m.group(0)
        raw = m.group(1)
        tr = translate_text(raw, lang)
        if tr is None:
            return m.group(0)
        lead = raw[: len(raw) - len(raw.lstrip())]
        trail = raw[len(raw.rstrip()):]
        return ">" + lead + tr + trail + "<"

    s = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->|>([^<>]+)<", node, s, flags=re.S)

    # meta content attributes
    def meta(m):
        v = html.unescape(m.group(2))
        tr = translate_text(v, lang)
        return f'{m.group(1)}"{html.escape(tr, quote=True)}"' if tr else m.group(0)

    s = re.sub(r'(<meta (?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)" content=)"([^"]*)"', meta, s)

    # document language, canonical, og
    s = s.replace('<html lang="en">', f'<html lang="{lang}">')
    here = f"{SITE}{url_for(lang, page)}"
    s = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{here}">', s, count=1)
    s = re.sub(r'(<meta property="og:url" content=)"[^"]*"', rf'\1"{here}"', s)
    s = re.sub(r'(<meta property="og:locale" content=)"[^"]*"', rf'\1"{L["locale"]}"', s)
    s = s.replace('"inLanguage": "en"', f'"inLanguage": "{lang}"')
    s = swap_head(s, lang, page)

    out = os.path.join(ROOT, lang, dest)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(s)
    return out


def patch_existing():
    """Switcher, alternates and footer/chip links on the hand-written EN and UK pages."""
    files = {
        ("en", "home"): "index.html", ("uk", "home"): "uk/index.html",
        ("en", "research"): "research/index.html", ("uk", "research"): "uk/research/index.html",
        ("en", "cv"): "cv.html", ("uk", "cv"): "uk/cv.html",
    }
    for (lang, page), f in files.items():
        p = os.path.join(ROOT, f)
        s = open(p, encoding="utf-8").read()
        s = swap_head(s, lang, page)
        if page == "home":
            first = (r'<a href="/uk/" hreflang="uk" lang="uk">[^<]*</a>' if lang == "en"
                     else r'<a href="/" hreflang="en" lang="en">[^<]*</a>')
            s = put(s, "footlangs", footer_links(lang, "home"), first)
        if page == "cv":
            first = (r'<a class="chip" href="/uk/cv\.html" hreflang="uk" lang="uk">[^<]*</a>' if lang == "en"
                     else r'<a class="chip" href="/cv\.html" hreflang="en" lang="en">[^<]*</a>')
            s = put(s, "chips", chips(lang, "cv"), first)
        open(p, "w", encoding="utf-8").write(s)


def sitemap():
    p = os.path.join(ROOT, "sitemap.xml")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r"\s*<!-- i18n:start -->.*?<!-- i18n:end -->", "", s, flags=re.S)
    rows = []
    for lang in ("it", "fr", "de"):
        for page in PAGES:
            rows.append(f"  <url><loc>{SITE}{url_for(lang, page)}</loc></url>")
    block = "\n  <!-- i18n:start -->\n" + "\n".join(rows) + "\n  <!-- i18n:end -->"
    s = s.replace("</urlset>", block + "\n</urlset>")
    open(p, "w", encoding="utf-8").write(s)


if __name__ == "__main__":
    patch_existing()
    for lang in ("it", "fr", "de"):
        for page in PAGES:
            print("wrote", build(page, lang))
    sitemap()
