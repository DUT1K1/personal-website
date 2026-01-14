document.addEventListener("DOMContentLoaded", () => {
  const navLinks = Array.from(
    document.querySelectorAll('.nav-link[href^="#"]')
  );
  const navSectionIds = new Set(
    navLinks.map((link) => link.getAttribute("href").slice(1))
  );
  const sections = Array.from(document.querySelectorAll("section[id]")).filter(
    (section) => navSectionIds.has(section.id)
  );
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  const header = document.querySelector("header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector("#primary-nav");
  const navToggleInput = document.querySelector("#nav-toggle");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const setHeaderOffset = () => {
    const height = header ? header.offsetHeight : 0;
    document.documentElement.style.setProperty("--header-offset", `${height}px`);
    return height;
  };

  let headerOffset = setHeaderOffset();

  const getHeaderOffset = () => {
    const value = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-offset"
      )
    );
    return Number.isFinite(value) ? value : headerOffset;
  };

  const setActiveLink = (activeId) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("active", isActive);
    });
  };

  const updateActiveNav = (scrollTop) => {
    if (!sections.length) {
      return;
    }

    const marker = scrollTop + getHeaderOffset() + 60;
    let activeId = sections[0].id;

    sections.forEach((section) => {
      if (section.offsetTop <= marker) {
        activeId = section.id;
      }
    });

    setActiveLink(activeId);
  };

  const updateReveal = (scrollTop) => {
    if (prefersReducedMotion) {
      return;
    }

    const trigger = scrollTop + window.innerHeight * 0.85;
    revealItems.forEach((item) => {
      if (!item.classList.contains("is-visible") && item.offsetTop < trigger) {
        item.classList.add("is-visible");
      }
    });
  };

  const updateAll = (scrollTop) => {
    updateActiveNav(scrollTop);
    updateReveal(scrollTop);
  };

  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const scrollContainer = document.querySelector("#scroll-container");
  let scrollbar = null;

  const initSmoothScrollbar = () => {
    if (!scrollContainer || !window.Scrollbar || prefersReducedMotion) {
      return false;
    }

    document.body.classList.add("smooth-scroll");
    try {
      scrollbar = window.Scrollbar.init(scrollContainer, {
        damping: 0.08,
        alwaysShowTracks: false,
      });
    } catch (error) {
      document.body.classList.remove("smooth-scroll");
      scrollbar = null;
      return false;
    }

    scrollbar.addListener(({ offset }) => {
      updateAll(offset.y);
    });

    updateAll(scrollbar.scrollTop);
    return true;
  };

  const initNativeScroll = () => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        updateAll(window.scrollY);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateAll(window.scrollY);
  };

  const smoothEnabled = initSmoothScrollbar();
  if (!smoothEnabled) {
    document.body.classList.remove("smooth-scroll");
    initNativeScroll();
  }

  const scrollToSection = (target) => {
    const offset = Math.max(0, target.offsetTop - getHeaderOffset() - 8);
    if (scrollbar) {
      scrollbar.scrollTo(0, offset, 700);
    } else {
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      const target = href ? document.querySelector(href) : null;
      if (!target) {
        return;
      }
      event.preventDefault();
      if (header) {
        header.classList.remove("nav-open");
      }
      if (navMenu) {
        navMenu.classList.remove("is-open");
      }
      if (navToggleInput) {
        navToggleInput.checked = false;
      }
      if (menuToggle) {
        menuToggle.setAttribute("aria-expanded", "false");
      }
      scrollToSection(target);
    });
  });

  const syncMenuState = () => {
    const isOpen = navToggleInput ? navToggleInput.checked : false;
    if (header) {
      header.classList.toggle("nav-open", isOpen);
    }
    if (navMenu) {
      navMenu.classList.toggle("is-open", isOpen);
    }
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  };

  if (navToggleInput) {
    navToggleInput.addEventListener("change", syncMenuState);
    syncMenuState();
  }

  document.addEventListener("click", (event) => {
    if (!navToggleInput || !navToggleInput.checked) {
      return;
    }
    if (header && header.contains(event.target)) {
      return;
    }
    navToggleInput.checked = false;
    syncMenuState();
  });

  window.addEventListener("resize", () => {
    headerOffset = setHeaderOffset();
    if (header) {
      header.classList.remove("nav-open");
    }
    if (navMenu) {
      navMenu.classList.remove("is-open");
    }
    if (navToggleInput) {
      navToggleInput.checked = false;
    }
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
    }
    if (scrollbar) {
      scrollbar.update();
      updateAll(scrollbar.scrollTop);
    } else {
      updateAll(window.scrollY);
    }
  });
});
