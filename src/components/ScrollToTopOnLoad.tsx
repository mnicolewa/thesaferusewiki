"use client";

import { useEffect } from "react";

export function ScrollToTopOnLoad() {
  useEffect(() => {
    if (window.location.hash === "#alerts") {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", cleanUrl);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return null;
}