"use strict";

const header = document.getElementById("header");
const mobileMenu = document.querySelector(".mem-mobile-menu");

if (header) {
  const updateHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

if (mobileMenu) {
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mobileMenu.removeAttribute("open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      mobileMenu.removeAttribute("open");
      mobileMenu.querySelector("summary")?.focus();
    }
  });
}

document.querySelectorAll("[data-compare]").forEach((compare) => {
  const range = compare.querySelector('input[type="range"]');

  if (!range) return;

  const updateCompare = () => {
    compare.style.setProperty("--compare-position", `${range.value}%`);
  };

  updateCompare();
  range.addEventListener("input", updateCompare);
});
