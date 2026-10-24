// Small helpers shared by the homepage widgets (command palette, skills
// explorer, contact). The homepage runs without the client router, so module
// scripts run exactly once per page load.

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isApplePlatform = () =>
  /mac|iphone|ipad|ipod/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? "");

let toastRegion;
let toastTimer;

export const showToast = (message, icon = "fa-check", duration = 2400) => {
  if (!toastRegion) {
    toastRegion = document.createElement("div");
    toastRegion.className = "toast-region";
    toastRegion.setAttribute("role", "status");
    toastRegion.setAttribute("aria-live", "polite");
    document.body.append(toastRegion);
  }

  window.clearTimeout(toastTimer);
  toastRegion.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "toast";
  const iconElement = document.createElement("i");
  iconElement.className = `fa-solid ${icon}`;
  iconElement.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(iconElement, text);
  toastRegion.append(toast);

  // Hold the toast while the tab is hidden, so it isn't gone before anyone sees it.
  const dismiss = () => {
    if (document.hidden) {
      toastTimer = window.setTimeout(dismiss, 1000);
      return;
    }
    toast.classList.add("is-leaving");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    window.setTimeout(() => toast.remove(), 400);
  };

  toastTimer = window.setTimeout(dismiss, duration);
};

export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

// Projects past the first four live inside a collapsed <details>; open it
// through its own summary so the disclosure keeps its animation and state.
const expandCollapsedParent = async (element) => {
  const details = element.closest(".projects-more");
  if (!details || details.classList.contains("is-expanded")) return;

  details.querySelector("summary")?.click();
  await wait(reducedMotion() ? 0 : 560);
};

export const revealTarget = async (target, { spotlight = true } = {}) => {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!element) return null;

  await expandCollapsedParent(element);
  element.scrollIntoView({
    behavior: reducedMotion() ? "auto" : "smooth",
    block: element.matches("section") ? "start" : "center",
  });

  if (spotlight) {
    element.classList.remove("is-spotlit");
    // Restart the highlight if the same target is picked twice in a row.
    void element.offsetWidth;
    element.classList.add("is-spotlit");
    element.addEventListener("animationend", () => element.classList.remove("is-spotlit"), {
      once: true,
    });
  }

  return element;
};

export const waitForScrollEnd = () =>
  new Promise((resolve) => {
    if (reducedMotion()) {
      resolve();
      return;
    }

    let timer = window.setTimeout(done, 900);
    let idle;
    function done() {
      window.clearTimeout(timer);
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      resolve();
    }
    function onScroll() {
      window.clearTimeout(idle);
      idle = window.setTimeout(done, 90);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    idle = window.setTimeout(done, 120);
  });
