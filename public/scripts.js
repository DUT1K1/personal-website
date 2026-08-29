document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector("#primary-nav");
  const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const waitForPaint = () =>
    new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });

  const setHeaderOffset = () => {
    const height = header?.offsetHeight ?? 0;
    document.documentElement.style.setProperty("--header-offset", `${height}px`);
  };

  const setMenuOpen = (isOpen) => {
    if (!menuButton || !navMenu) return;

    header?.classList.toggle("nav-open", isOpen);
    navMenu.classList.toggle("is-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  };

  const closeMenu = () => setMenuOpen(false);

  menuButton?.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuButton?.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menuButton.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (header && !header.contains(event.target)) closeMenu();
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));

  const projectCards = Array.from(document.querySelectorAll("[data-project-card]"));
  const projectPerspective = "perspective(1800px)";
  const flipEasing = "cubic-bezier(0.65, 0, 0.35, 1)";

  const playProjectAnimation = async (element, keyframes, options) => {
    const animation = element.animate(keyframes, {
      fill: "both",
      ...options,
    });

    await new Promise((resolve) => {
      const fallback = window.setTimeout(resolve, Number(options.duration) + 48);
      animation.finished.then(
        () => {
          window.clearTimeout(fallback);
          resolve();
        },
        () => {
          window.clearTimeout(fallback);
          resolve();
        }
      );
    });

    if (animation.playState !== "finished" && animation.playState !== "idle") {
      animation.finish();
    }

    return animation;
  };

  const createProjectTransitionCard = (front, dialog, rect) => {
    const transitionCard = document.createElement("div");
    const frontFace = front.cloneNode(true);

    transitionCard.className = "project-transition-card";
    transitionCard.setAttribute("aria-hidden", "true");
    transitionCard.inert = true;
    transitionCard.style.left = `${rect.left}px`;
    transitionCard.style.top = `${rect.top}px`;
    transitionCard.style.width = `${rect.width}px`;
    transitionCard.style.height = `${rect.height}px`;

    frontFace.removeAttribute("data-project-front");
    frontFace.removeAttribute("aria-controls");
    frontFace.setAttribute("aria-hidden", "true");
    frontFace.setAttribute("tabindex", "-1");
    frontFace.classList.add("project-transition-face");

    transitionCard.append(frontFace);
    dialog.append(transitionCard);
    return transitionCard;
  };

  const getProjectMotion = (sourceRect, stageRect) => {
    const translateX =
      stageRect.left + stageRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const translateY =
      stageRect.top + stageRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
    const edgeProgress = window.innerWidth <= 680 ? 0.45 : 0.6;
    const edgeWidth =
      sourceRect.width + (stageRect.width - sourceRect.width) * edgeProgress;
    const edgeHeight = Math.min(
      stageRect.height,
      edgeWidth * (sourceRect.height / sourceRect.width)
    );
    const frontScale = edgeWidth / sourceRect.width;
    const stageScaleX = edgeWidth / stageRect.width;
    const stageScaleY = edgeHeight / stageRect.height;

    return {
      frontStart: `translate3d(0, 0, 0) ${projectPerspective} scale3d(1, 1, 1) rotateY(0deg)`,
      frontEdge: `translate3d(${translateX}px, ${translateY}px, 0) ${projectPerspective} scale3d(${frontScale}, ${frontScale}, ${frontScale}) rotateY(90deg)`,
      stageEdge: `${projectPerspective} scale3d(${stageScaleX}, ${stageScaleY}, ${stageScaleX}) rotateY(-90deg)`,
      stageOpen: `${projectPerspective} scale3d(1, 1, 1) rotateY(0deg)`,
    };
  };

  const openProjectDialog = async (card) => {
    const front = card.querySelector("[data-project-front]");
    const dialog = card.querySelector("[data-project-dialog]");
    const stage = card.querySelector("[data-project-stage]");
    const closeButton = card.querySelector("[data-project-close]");

    if (!front || !dialog || !stage || dialog.open) return;

    const sourceRect = front.getBoundingClientRect();
    dialog.showModal();
    dialog.dataset.state = "opening";
    document.body.classList.add("has-project-dialog");
    front.setAttribute("aria-expanded", "true");
    card.classList.add("is-dialog-open");

    // Let the transparent top-layer backdrop render before beginning its fade.
    await waitForPaint();
    dialog.classList.add("is-backdrop-visible");

    if (reducedMotion.matches) {
      dialog.classList.add("is-stage-visible");
      await playProjectAnimation(
        stage,
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 120, easing: "ease" }
      );
    } else {
      const transitionCard = createProjectTransitionCard(front, dialog, sourceRect);
      dialog.classList.add("is-stage-visible");
      const stageRect = stage.getBoundingClientRect();
      const motion = getProjectMotion(sourceRect, stageRect);
      const duration = 560;

      await Promise.all([
        playProjectAnimation(
          transitionCard,
          [
            { offset: 0, transform: motion.frontStart, opacity: 1 },
            { offset: 0.499, transform: motion.frontEdge, opacity: 1 },
            { offset: 0.501, transform: motion.frontEdge, opacity: 0 },
            { offset: 1, transform: motion.frontEdge, opacity: 0 },
          ],
          { duration, easing: flipEasing }
        ),
        playProjectAnimation(
          stage,
          [
            { offset: 0, transform: motion.stageEdge, opacity: 0 },
            { offset: 0.499, transform: motion.stageEdge, opacity: 0 },
            { offset: 0.501, transform: motion.stageEdge, opacity: 1 },
            { offset: 1, transform: motion.stageOpen, opacity: 1 },
          ],
          { duration, easing: flipEasing }
        ),
      ]);

      stage.getAnimations().forEach((animation) => animation.cancel());
      transitionCard.remove();
    }

    dialog.dataset.state = "open";

    if (dialog.dataset.closePending) {
      delete dialog.dataset.closePending;
      await closeProjectDialog(card);
      return;
    }

    closeButton?.focus({ preventScroll: true });
  };

  const closeProjectDialog = async (card) => {
    const front = card.querySelector("[data-project-front]");
    const dialog = card.querySelector("[data-project-dialog]");
    const stage = card.querySelector("[data-project-stage]");

    if (!front || !dialog || !stage || !dialog.open) {
      return;
    }

    if (dialog.dataset.state === "opening") {
      dialog.dataset.closePending = "true";
      return;
    }

    if (dialog.dataset.state === "closing") return;
    dialog.dataset.state = "closing";

    if (reducedMotion.matches) {
      dialog.classList.remove("is-backdrop-visible");
      await playProjectAnimation(
        stage,
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 120, easing: "ease" }
      );
      dialog.classList.remove("is-stage-visible");
    } else {
      const sourceRect = front.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const motion = getProjectMotion(sourceRect, stageRect);
      const transitionCard = createProjectTransitionCard(front, dialog, sourceRect);
      const duration = 480;

      dialog.classList.remove("is-backdrop-visible");
      await Promise.all([
        playProjectAnimation(
          stage,
          [
            { offset: 0, transform: motion.stageOpen, opacity: 1 },
            { offset: 0.499, transform: motion.stageEdge, opacity: 1 },
            { offset: 0.501, transform: motion.stageEdge, opacity: 0 },
            { offset: 1, transform: motion.stageEdge, opacity: 0 },
          ],
          { duration, easing: flipEasing }
        ),
        playProjectAnimation(
          transitionCard,
          [
            { offset: 0, transform: motion.frontEdge, opacity: 0 },
            { offset: 0.499, transform: motion.frontEdge, opacity: 0 },
            { offset: 0.501, transform: motion.frontEdge, opacity: 1 },
            { offset: 1, transform: motion.frontStart, opacity: 1 },
          ],
          { duration, easing: flipEasing }
        ),
      ]);

      transitionCard.remove();
      dialog.classList.remove("is-stage-visible");
    }

    stage.getAnimations().forEach((animation) => animation.cancel());
    dialog.close();
    delete dialog.dataset.state;
    front.setAttribute("aria-expanded", "false");
    card.classList.remove("is-dialog-open");
    document.body.classList.remove("has-project-dialog");
    front.focus({ preventScroll: true });
  };

  projectCards.forEach((card) => {
    const front = card.querySelector("[data-project-front]");
    const dialog = card.querySelector("[data-project-dialog]");
    const closeButton = card.querySelector("[data-project-close]");

    front?.addEventListener("click", () => void openProjectDialog(card));
    closeButton?.addEventListener("click", () => void closeProjectDialog(card));

    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) void closeProjectDialog(card);
    });

    dialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      void closeProjectDialog(card);
    });
  });

  document.querySelectorAll(".projects-more").forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector(".projects-more-content");
    const contentInner = details.querySelector(".projects-secondary");
    const labelTrack = details.querySelector(".projects-more-labels");
    const closedLabel = details.querySelector(".projects-more-label-closed");
    const openLabel = details.querySelector(".projects-more-label-open");
    const secondaryCards = Array.from(contentInner?.querySelectorAll(".project-card") ?? []);

    if (
      !summary ||
      !content ||
      !contentInner ||
      !labelTrack ||
      !closedLabel ||
      !openLabel ||
      !("animate" in content)
    ) {
      return;
    }

    let wantsOpen = details.open;
    let transitionId = 0;

    const setButtonState = (shouldOpen, animate = true) => {
      const currentButtonWidth = summary.getBoundingClientRect().width;
      const currentLabelWidth = labelTrack.getBoundingClientRect().width;
      const targetLabel = shouldOpen ? openLabel : closedLabel;
      const targetLabelWidth = targetLabel.getBoundingClientRect().width;
      const targetButtonWidth = currentButtonWidth - currentLabelWidth + targetLabelWidth;

      if (!animate) summary.classList.remove("is-motion-ready");

      summary.style.width = `${currentButtonWidth}px`;
      labelTrack.style.width = `${currentLabelWidth}px`;
      details.classList.toggle("is-expanded", shouldOpen);

      window.requestAnimationFrame(() => {
        summary.style.width = `${targetButtonWidth}px`;
        labelTrack.style.width = `${targetLabelWidth}px`;
        if (!animate) {
          window.requestAnimationFrame(() => summary.classList.add("is-motion-ready"));
        }
      });
    };

    const initializeButton = () => {
      const labelWidth = (details.open ? openLabel : closedLabel).getBoundingClientRect().width;
      labelTrack.style.width = `${labelWidth}px`;
      const buttonWidth = summary.getBoundingClientRect().width;
      summary.style.width = `${buttonWidth}px`;
      details.classList.toggle("is-expanded", details.open);
      window.requestAnimationFrame(() => summary.classList.add("is-motion-ready"));
    };

    initializeButton();
    document.fonts?.ready.then(() => setButtonState(wantsOpen, false));

    const animateDisclosure = (shouldOpen) => {
      const id = ++transitionId;
      const wasClosed = !details.open;
      const startHeight = wasClosed ? 0 : content.getBoundingClientRect().height;
      const startOpacity = wasClosed
        ? 0
        : Number.parseFloat(getComputedStyle(content).opacity);
      const startTransform = wasClosed
        ? "translateY(-8px)"
        : getComputedStyle(contentInner).transform;

      content.getAnimations().forEach((animation) => animation.cancel());
      contentInner.getAnimations().forEach((animation) => animation.cancel());
      secondaryCards.forEach((card) =>
        card.getAnimations().forEach((animation) => animation.cancel())
      );

      content.style.height = `${startHeight}px`;
      content.style.opacity = `${startOpacity}`;
      contentInner.style.transform = startTransform;

      if (shouldOpen && wasClosed) {
        details.open = true;
      }

      const endHeight = shouldOpen ? content.scrollHeight : 0;
      setButtonState(shouldOpen);

      const duration = shouldOpen ? 520 : 440;
      const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

      const contentAnimation = content.animate(
        [
          { height: `${startHeight}px`, opacity: startOpacity },
          {
            height: `${endHeight}px`,
            opacity: shouldOpen ? 1 : 0,
          },
        ],
        { duration, easing, fill: "both" }
      );

      contentInner.animate(
        [
          { transform: startTransform },
          {
            transform: shouldOpen
              ? "translate3d(0, 0, 0) scale(1)"
              : "translate3d(0, -12px, 0) scale(0.992)",
          },
        ],
        { duration, easing, fill: "both" }
      );

      secondaryCards.forEach((card, index) => {
        card.animate(
          shouldOpen
            ? [
                { opacity: 0, transform: "translate3d(0, 14px, 0) scale(0.988)" },
                { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
              ]
            : [
                { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
                { opacity: 0, transform: "translate3d(0, -8px, 0) scale(0.992)" },
              ],
          {
            duration: shouldOpen ? 390 : 240,
            delay: shouldOpen ? 70 + index * 45 : index * 20,
            easing,
            fill: "both",
          }
        );
      });

      contentAnimation.addEventListener("finish", () => {
        if (id !== transitionId) return;

        if (!shouldOpen) details.open = false;

        content.getAnimations().forEach((animation) => animation.cancel());
        contentInner.getAnimations().forEach((animation) => animation.cancel());
        secondaryCards.forEach((card) =>
          card.getAnimations().forEach((animation) => animation.cancel())
        );
        content.style.removeProperty("height");
        content.style.removeProperty("opacity");
        contentInner.style.removeProperty("transform");
      });
    };

    summary.addEventListener("click", (event) => {
      if (reducedMotion.matches) {
        event.preventDefault();
        wantsOpen = !wantsOpen;
        details.open = wantsOpen;
        setButtonState(wantsOpen, false);
        return;
      }

      event.preventDefault();
      wantsOpen = !wantsOpen;
      animateDisclosure(wantsOpen);
    });
  });

  const setActiveLink = (activeId) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  if (sections.length) {
    const activeSectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActiveLink(visible.target.id);
      },
      { rootMargin: "-20% 0px -60%", threshold: [0, 0.25, 0.5] }
    );

    sections.forEach((section) => activeSectionObserver.observe(section));
  }

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.08 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  setHeaderOffset();
  window.addEventListener("resize", () => {
    setHeaderOffset();
    if (window.innerWidth > 930) closeMenu();
  });
});
