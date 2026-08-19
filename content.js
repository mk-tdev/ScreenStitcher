const MAX_VIEWPORT_READY_WAIT_MS = 350;
const CAPTURE_FAILSAFE_RESTORE_MS = 15000;

let detectedStickyElements = [];
let hiddenStickyElements = [];
let originalCaptureScrollY = null;
let captureRestoreTimer = null;

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "ready" });
    return false;
  }

  if (request.action === "getPageDimensions") {
    sendResponse(getPageState());
    return false;
  }

  if (request.action === "getPageState") {
    sendResponse(getPageState());
    return false;
  }

  if (request.action === "detectStickyElements") {
    sendResponse({ stickyElements: findStickyElements() });
    return false;
  }

  if (request.action === "beginCapture") {
    if (originalCaptureScrollY !== null) restoreCaptureState();
    originalCaptureScrollY = window.scrollY;
    scheduleCaptureFailsafe();
    sendResponse({ success: true, originalScrollY: originalCaptureScrollY });
    return false;
  }

  if (request.action === "endCapture") {
    restoreCaptureState();
    sendResponse({ success: true, y: window.scrollY });
    return false;
  }

  if (request.action === "scrollToPosition") {
    scrollToPositionAndWait(request.y)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "hideStickyElements") {
    sendResponse({ hiddenCount: hideStickyElements() });
    return false;
  }

  if (request.action === "showStickyElements") {
    showStickyElements();
    sendResponse({ success: true });
    return false;
  }

  if (request.action === "scrollTo") {
    scrollInstantly(request.y);
    sendResponse({ success: true, y: window.scrollY });
    return false;
  }

  return false;
});

function getDocumentHeight() {
  return Math.max(
    document.body?.scrollHeight || 0,
    document.body?.offsetHeight || 0,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  );
}

function getPageState() {
  const state = {
    scrollHeight: getDocumentHeight(),
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    scrollWidth: Math.max(
      document.body?.scrollWidth || 0,
      document.body?.offsetWidth || 0,
      document.documentElement.clientWidth,
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth
    ),
    devicePixelRatio: window.devicePixelRatio || 1,
    currentScrollY: window.scrollY,
  };
  return state;
}

function scrollInstantly(y) {
  const maxScrollY = Math.max(0, getDocumentHeight() - window.innerHeight);
  const targetY = Math.max(0, Math.min(Number(y) || 0, maxScrollY));
  window.scrollTo({ top: targetY, left: 0, behavior: "instant" });
  return targetY;
}

async function scrollToPositionAndWait(requestedY) {
  scheduleCaptureFailsafe();
  const startedAt = performance.now();
  const targetY = scrollInstantly(requestedY);
  await waitForStableLayout();
  await waitForVisibleImages();
  await waitForStableLayout();
  return {
    success: true,
    requestedY,
    targetY,
    actualY: window.scrollY,
    settleTimeMs: Math.round(performance.now() - startedAt),
    ...getPageState(),
  };
}

function scheduleCaptureFailsafe() {
  if (captureRestoreTimer) clearTimeout(captureRestoreTimer);
  captureRestoreTimer = setTimeout(
    restoreCaptureState,
    CAPTURE_FAILSAFE_RESTORE_MS
  );
}

function restoreCaptureState() {
  if (captureRestoreTimer) clearTimeout(captureRestoreTimer);
  captureRestoreTimer = null;
  showStickyElements();
  if (originalCaptureScrollY !== null) {
    scrollInstantly(originalCaptureScrollY);
    originalCaptureScrollY = null;
  }
}

function waitForAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForStableLayout() {
  let previousY = window.scrollY;
  let previousHeight = getDocumentHeight();
  let stableFrames = 0;
  for (let frame = 0; frame < 8 && stableFrames < 2; frame++) {
    await waitForAnimationFrame();
    const nextY = window.scrollY;
    const nextHeight = getDocumentHeight();
    if (nextY === previousY && nextHeight === previousHeight) {
      stableFrames++;
    } else {
      stableFrames = 0;
      previousY = nextY;
      previousHeight = nextHeight;
    }
  }
}

async function waitForVisibleImages() {
  const pendingImages = [...document.images].filter((image) => {
    if (image.complete) return false;
    const rect = image.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
  if (pendingImages.length === 0) return;

  const imageReady = Promise.allSettled(
    pendingImages.map(
      (image) =>
        new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })
    )
  );
  const timeout = new Promise((resolve) =>
    setTimeout(resolve, MAX_VIEWPORT_READY_WAIT_MS)
  );
  await Promise.race([imageReady, timeout]);
}

function findStickyElements() {
  detectedStickyElements = [];
  const metadata = [];
  document.querySelectorAll("*").forEach((element) => {
    const style = window.getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") return;
    const rect = element.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return;
    }
    detectedStickyElements.push(element);
    metadata.push({
      position: style.position,
      top: style.top,
      bottom: style.bottom,
      tagName: element.tagName,
      id: element.id,
    });
  });
  return metadata;
}

function hideStickyElements() {
  hiddenStickyElements = [];
  for (const element of detectedStickyElements) {
    if (!element.isConnected) continue;
    hiddenStickyElements.push({
      element,
      originalVisibility: element.style.visibility,
      originalPriority: element.style.getPropertyPriority("visibility"),
    });
    element.style.setProperty("visibility", "hidden", "important");
  }
  return hiddenStickyElements.length;
}

function showStickyElements() {
  for (const item of hiddenStickyElements) {
    if (item.element.isConnected) {
      item.element.style.setProperty(
        "visibility",
        item.originalVisibility,
        item.originalPriority
      );
    }
  }
  hiddenStickyElements = [];
}
