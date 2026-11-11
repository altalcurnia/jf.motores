"use client";
import { useEffect } from "react";

/**
 * Efectos ligeros del sitio original sin GSAP:
 * - barra de navegación con fondo al hacer scroll
 * - aparición suave de elementos .reveal al entrar en pantalla
 *
 * Este componente vive en el layout y se monta una sola vez: las páginas que llegan después
 * (navegar al Inicio desde otra página, contenido que termina de cargar más tarde en el celular)
 * traen elementos .reveal nuevos. Se vigilan con un MutationObserver para que nunca queden ocultos.
 */
export function SiteEffects() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const show = (el: Element) => el.classList.add("is-in");
    // Sin IntersectionObserver (navegadores muy viejos): todo visible
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(show);
      return () => window.removeEventListener("scroll", onScroll);
    }

    const pending = new Set<Element>();
    const reveal = (el: Element) => {
      show(el);
      pending.delete(el);
      io.unobserve(el);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting || e.boundingClientRect.bottom < 0) reveal(e.target);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    const watch = (root: ParentNode) => {
      const add = (el: Element) => {
        if (pending.has(el)) return;
        pending.add(el);
        io.observe(el);
      };
      if (root instanceof Element && root.matches(".reveal:not(.is-in)")) add(root);
      root.querySelectorAll(".reveal:not(.is-in)").forEach(add);
    };
    watch(document);
    // Respaldo: con un salto de scroll (o un scroll muy rápido) un elemento puede pasar de abajo a
    // arriba de la pantalla sin «entrar» nunca; todo lo que ya está a la vista o más arriba se muestra
    let raf = 0;
    const sweep = () => {
      raf = 0;
      const lim = window.innerHeight * 0.9;
      pending.forEach((el) => {
        if (el.isConnected && el.getBoundingClientRect().top < lim) reveal(el);
        else if (!el.isConnected) pending.delete(el);
      });
    };
    const onSweep = () => {
      if (!raf && pending.size) raf = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onSweep, { passive: true });
    onSweep();

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) watch(n);
        });
      }
      onSweep();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onSweep);
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
