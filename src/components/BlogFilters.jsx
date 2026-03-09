import { useDeferredValue, useEffect, useState } from "react";

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export default function BlogFilters({ posts, baseUrl }) {
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

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPosts = posts.filter((post) => {
    const matchesTag =
      selectedTag === "all" || post.tags.includes(selectedTag);
    const matchesQuery =
      normalizedQuery.length === 0 ||
      post.title.toLowerCase().includes(normalizedQuery);

    return matchesTag && matchesQuery;
  });

  return (
    <div className="blog-filter-shell">
      <div className="blog-toolbar">
        <label className="blog-search" htmlFor="blog-search">
          <div className="blog-search-input-wrap">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              id="blog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search posts..."
            />
          </div>
        </label>

        <p className="blog-results-count">
          {filteredPosts.length} post{filteredPosts.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="blog-tag-row" aria-label="Filter by tag">
        <button
          type="button"
          className={`blog-tag-filter ${
            selectedTag === "all" ? "is-active" : ""
          }`}
          onClick={() => setSelectedTag("all")}
          aria-pressed={selectedTag === "all"}
        >
          All
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
            {tag}
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
                  {formatDate(post.pubDate)} · {post.readingTime} min read
                </span>
                {post.featured ? <span className="blog-featured">Featured</span> : null}
              </div>

              <h2>{post.title}</h2>
              <p>{post.description}</p>

              <div className="blog-card-footer">
                <div className="blog-card-tags">
                  {post.tags.map((tag) => (
                    <span className="blog-card-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <span className="blog-card-cta">
                  Read article
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
          <h2>No posts match this filter.</h2>
          <p>Try another tag or clear the search query.</p>
        </div>
      )}
    </div>
  );
}
