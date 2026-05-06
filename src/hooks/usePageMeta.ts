import { useEffect } from "react";

type PageMeta = {
  title: string;
  description?: string;
  canonical?: string;
};

const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setLink = (rel: string, href: string) => {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

/**
 * Lightweight per-page meta updater. Sets <title>, meta description,
 * canonical URL and Open Graph tags. Restores nothing on unmount —
 * the next page that mounts will overwrite.
 */
export function usePageMeta({ title, description, canonical }: PageMeta) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description);
    }
    if (title) {
      setMeta("og:title", title, "property");
      setMeta("twitter:title", title);
    }
    const url = canonical || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
    if (url) {
      setLink("canonical", url);
      setMeta("og:url", url, "property");
    }
  }, [title, description, canonical]);
}
