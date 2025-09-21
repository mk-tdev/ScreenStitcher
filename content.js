chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "ready" });
    return true;
  }
  if (request.action === "getPageDimensions") {
    const dimensions = {
      scrollHeight: Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      ),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      scrollWidth: Math.max(
        document.body.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
        document.documentElement.offsetWidth
      ),
      devicePixelRatio: window.devicePixelRatio || 1,
      currentScrollY: window.pageYOffset || document.documentElement.scrollTop,
      stickyElements: findStickyElements(),
    };
    sendResponse(dimensions);
    return true;
  }
  if (request.action === "scrollToTop") {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    sendResponse({ success: true, y: 0 });
    return true;
  }
  if (request.action === "scrollToPosition") {
    const targetY = Math.max(
      0,
      Math.min(
        request.y,
        document.documentElement.scrollHeight - window.innerHeight
      )
    );
    window.scrollTo({ top: targetY, left: 0, behavior: "instant" });
    document.documentElement.offsetHeight;
    sendResponse({
      success: true,
      requestedY: request.y,
      actualY: targetY,
      currentY: window.pageYOffset || document.documentElement.scrollTop,
    });
    return true;
  }
  if (request.action === "hideStickyElements") {
    const hiddenElements = hideStickyElements();
    sendResponse({ hiddenCount: hiddenElements.length });
    return true;
  }
  if (request.action === "showStickyElements") {
    showStickyElements();
    sendResponse({ success: true });
    return true;
  }
  if (request.action === "getScrollPosition") {
    sendResponse({
      y: window.pageYOffset || document.documentElement.scrollTop,
      x: window.pageXOffset || document.documentElement.scrollLeft,
    });
    return true;
  }
  if (request.action === "scrollTo") {
    window.scrollTo({ top: request.y, left: 0, behavior: "instant" });
    sendResponse({ success: true });
    return true;
  }
  return true;
});

let hiddenStickyElements = [];
function findStickyElements() {
  const stickyElements = [];
  const allElements = document.querySelectorAll("*");
  allElements.forEach((element) => {
    const style = window.getComputedStyle(element);
    const position = style.position;
    if (position === "fixed" || position === "sticky") {
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      ) {
        stickyElements.push({
          position: position,
          top: style.top,
          bottom: style.bottom,
          rect: rect,
          tagName: element.tagName,
          className: element.className,
          id: element.id,
        });
      }
    }
  });
  return stickyElements;
}
function hideStickyElements() {
  hiddenStickyElements = [];
  const allElements = document.querySelectorAll("*");
  allElements.forEach((element) => {
    const style = window.getComputedStyle(element);
    const position = style.position;
    if (position === "fixed" || position === "sticky") {
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      ) {
        hiddenStickyElements.push({
          element: element,
          originalDisplay: element.style.display,
          originalVisibility: element.style.visibility,
          originalOpacity: element.style.opacity,
          originalPosition: element.style.position,
        });
        element.style.display = "none";
      }
    }
  });
  return hiddenStickyElements;
}
function showStickyElements() {
  hiddenStickyElements.forEach((item) => {
    item.element.style.display = item.originalDisplay;
    item.element.style.visibility = item.originalVisibility;
    item.element.style.opacity = item.originalOpacity;
    item.element.style.position = item.originalPosition;
  });
  hiddenStickyElements = [];
}
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
