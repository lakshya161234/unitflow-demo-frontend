"use client";

import { useState } from "react";

export function useAppliedSearch(initialValue = "") {
  const [searchInput, setSearchInput] = useState(initialValue);
  const [appliedSearch, setAppliedSearch] = useState(initialValue);

  function applySearch() {
    setAppliedSearch(String(searchInput || "").trim());
  }

  function clearSearch() {
    setSearchInput("");
    setAppliedSearch("");
  }

  function onSearchKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch();
    }
  }

  return {
    searchInput,
    setSearchInput,
    appliedSearch,
    setAppliedSearch,
    applySearch,
    clearSearch,
    onSearchKeyDown,
  };
}
