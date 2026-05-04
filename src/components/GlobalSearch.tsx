"use client";

import { Search, Sparkles, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { getSearchGuidance, searchSiteContent } from "@/lib/search";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const results = useMemo(() => searchSiteContent(deferredQuery), [deferredQuery]);
  const guidance = useMemo(() => getSearchGuidance(deferredQuery), [deferredQuery]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (!isTypingTarget && event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleShortcut);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  function navigateTo(href: string) {
    window.location.assign(href);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (event.key === "Escape") {
        setOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      navigateTo(results[activeIndex]?.href ?? results[0].href);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="global-search" ref={wrapperRef} role="search">
      <label className="global-search-label" htmlFor="global-smart-search">
        Smart site search
      </label>
      <div className="global-search-input-wrap">
        <Search size={16} aria-hidden="true" className="global-search-icon" />
        <input
          id="global-smart-search"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="global-search-input"
          placeholder="Search this site for tools, guides, and emergency info"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="global-search-results"
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            className="global-search-clear"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear site search"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="global-search-panel">
          <p className="global-search-guidance">
            <Sparkles size={14} aria-hidden="true" />
            {guidance}
          </p>

          {deferredQuery.trim() ? (
            results.length > 0 ? (
              <ul id="global-search-results" className="global-search-results" role="listbox">
                {results.map((result, index) => (
                  <li key={result.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      className={index === activeIndex ? "global-search-result active" : "global-search-result"}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigateTo(result.href)}
                    >
                      <span className="global-search-result-topline">
                        <strong>{result.title}</strong>
                        <span>{result.section}</span>
                      </span>
                      <span className="global-search-result-body">{result.description}</span>
                      <span className="global-search-result-reason">{result.reason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tiny-note">No matches were found on this website for that search.</p>
            )
          ) : (
            <div className="global-search-suggestions">
              <span>Try: overdose help</span>
              <span>mix methadone and xanax</span>
              <span>barcode recalls</span>
              <span>naloxone near me</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}