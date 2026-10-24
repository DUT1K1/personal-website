import { useDeferredValue, useEffect, useState } from "react";
import { formatTag } from "../utils/tags.js";

// Dates render on the server and again in the browser, so they must come out
// identical in both. Browsers ship different Georgian locale data than Node,
// and the reader's time zone can shift the day, so format in UTC and spell
// the Georgian months out ourselves.
const GEORGIAN_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

function formatDate(dateString, locale) {
  const date = new Date(dateString);
  if (locale === "ka") {
    return `${date.getUTCDate()} ${GEORGIAN_MONTHS[date.getUTCMonth()]}. ${date.getUTCFullYear()}`;
  }
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function BlogFilters({ posts, baseUrl, locale = "en" }) {
  const isGeorgian = locale === "ka";
  const copy = isGeorgian
    ? {
        progress: "სტატიები მზადდება",
        coming: "ახალი სტატიები მალე გამოჩნდება.",
        comingText: "ვამზადებ სტატიებს ბექენდ ინჟინერიის, უსაფრთხოებისა და რეალური პროდუქტების შექმნისას მიღებული გამოცდილების შესახებ.",
        searchLabel: "სტატიების ძიება სათაურით, აღწერით ან ტეგით",
        search: "სტატიების ძიება",
        filter: "ტეგების მიხედვით გაფილტვრა",
        all: "ყველა",
        featured: "რჩეული",
        read: "სტატიის წაკითხვა",
        none: "არჩეულ პირობებს არცერთი სტატია არ შეესაბამება.",
        retry: "აირჩიეთ სხვა ტეგი ან წაშალეთ საძიებო ველში ჩაწერილი ტექსტი.",
        clear: "ფილტრების გასუფთავება",
      }
    : null;
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const deferredQuery = useDeferredValue(query);
  const normalizedBase = (baseUrl || "/").endsWith("/")
    ? baseUrl || "/"
    : `${baseUrl}/`;
  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort(
    (left, right) => left.localeCompare(right)
  );

  useEffect(() => {
    const availableTags = new Set(posts.flatMap((post) => post.tags));
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    const nextQuery = params.get("q");

    if (tag && availableTags.has(tag)) {
      setSelectedTag(tag);
    }

    if (nextQuery) {
      setQuery(nextQuery);
    }
  }, [posts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (selectedTag === "all") {
      params.delete("tag");
    } else {
      params.set("tag", selectedTag);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;

    window.history.replaceState({}, "", nextUrl);
  }, [query, selectedTag]);

  if (posts.length === 0) {
    return (
      <div className="blog-empty-state blog-empty-state-initial">
        <p className="blog-eyebrow">{copy?.progress ?? "In progress"}</p>
        <h2>{copy?.coming ?? "New writing is on the way."}</h2>
        <p>{copy?.comingText ?? "I’m working on articles about backend engineering, security, and the lessons that come from building real products."}</p>
      </div>
    );
  }

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPosts = posts.filter((post) => {
    const matchesTag =
      selectedTag === "all" || post.tags.includes(selectedTag);
    const searchableText = [
      post.title,
      post.description,
      ...post.tags,
      ...post.tags.map((tag) => formatTag(tag, locale)),
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      searchableText.includes(normalizedQuery);

    return matchesTag && matchesQuery;
  });

  return (
    <div className="blog-filter-shell">
      <div className="blog-toolbar">
        <label className="blog-search" htmlFor="blog-search">
          <span className="sr-only">
            {copy?.searchLabel ?? "Search articles by title, description, or tag"}
          </span>
          <div className="blog-search-input-wrap">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              id="blog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy?.search ?? "Search articles"}
              autoComplete="off"
            />
          </div>
        </label>

        <p className="blog-results-count" aria-live="polite">
          {isGeorgian ? `${filteredPosts.length} სტატია` : `${filteredPosts.length} post${filteredPosts.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="blog-tag-row" aria-label={copy?.filter ?? "Filter by tag"}>
        <button
          type="button"
          className={`blog-tag-filter ${
            selectedTag === "all" ? "is-active" : ""
          }`}
          onClick={() => setSelectedTag("all")}
          aria-pressed={selectedTag === "all"}
        >
          {copy?.all ?? "All"}
        </button>

        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`blog-tag-filter ${
              selectedTag === tag ? "is-active" : ""
            }`}
            onClick={() => setSelectedTag(tag)}
            aria-pressed={selectedTag === tag}
          >
            {formatTag(tag, locale)}
          </button>
        ))}
      </div>

      {filteredPosts.length > 0 ? (
        <div className="blog-grid">
          {filteredPosts.map((post) => (
            <a
              className="blog-card"
              href={`${normalizedBase}blog/${post.slug}/`}
              key={post.slug}
            >
              <div className="blog-card-meta">
                <span>
                  {formatDate(post.pubDate, locale)} · {isGeorgian ? `${post.readingTime} წთ` : `${post.readingTime} min read`}
                </span>
                {post.featured ? <span className="blog-featured">{copy?.featured ?? "Featured"}</span> : null}
              </div>

              <h2>{post.title}</h2>
              <p>{post.description}</p>

              <ul className="blog-card-tags">
                {post.tags.map((tag) => (
                  <li className="blog-card-tag" key={tag}>
                    {formatTag(tag, locale)}
                  </li>
                ))}
              </ul>

              <div className="blog-card-footer">
                <span className="blog-card-cta">
                  {copy?.read ?? "Read article"}
                  <i
                    className="fa-solid fa-arrow-right"
                    aria-hidden="true"
                  ></i>
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="blog-empty-state">
          <h2>{copy?.none ?? "No posts match this filter."}</h2>
          <p>{copy?.retry ?? "Try another tag or clear the search query."}</p>
          <button
            type="button"
            className="blog-clear-filters"
            onClick={() => {
              setQuery("");
              setSelectedTag("all");
            }}
          >
            {copy?.clear ?? "Clear filters"}
          </button>
        </div>
      )}
    </div>
  );
}
