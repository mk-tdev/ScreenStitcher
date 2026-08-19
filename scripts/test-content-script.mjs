import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

let messageListener;
const inlineStyle = {
  visibility: "",
  priority: "",
  getPropertyPriority() {
    return this.priority;
  },
  setProperty(_name, value, priority = "") {
    this.visibility = value;
    this.priority = priority;
  },
};
const stickyElement = {
  id: "sticky-header",
  isConnected: true,
  style: inlineStyle,
  tagName: "HEADER",
  getBoundingClientRect: () => ({
    top: 0,
    right: 1200,
    bottom: 80,
    left: 0,
    width: 1200,
    height: 80,
  }),
};
const windowMock = {
  devicePixelRatio: 2,
  innerHeight: 800,
  innerWidth: 1200,
  scrollY: 400,
  scrollTo({ top }) {
    this.scrollY = top;
  },
};
const dimensions = {
  clientHeight: 800,
  clientWidth: 1200,
  offsetHeight: 2400,
  offsetWidth: 1200,
  scrollHeight: 2400,
  scrollWidth: 1200,
};
const context = {
  chrome: {
    runtime: {
      onMessage: {
        addListener(listener) {
          messageListener = listener;
        },
      },
    },
  },
  clearTimeout,
  console,
  document: {
    body: dimensions,
    documentElement: dimensions,
    images: [],
    querySelectorAll: () => [stickyElement],
  },
  performance,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  setTimeout,
  window: windowMock,
};
context.window.getComputedStyle = () => ({
  bottom: "auto",
  display: "block",
  opacity: "1",
  position: "fixed",
  top: "0px",
  visibility: "visible",
});

vm.runInNewContext(readFileSync("content.js", "utf8"), context);
assert.equal(typeof messageListener, "function");

const sendMessage = (request) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Message timed out: ${request.action}`)),
      1000
    );
    messageListener(request, {}, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });

const dimensionsResponse = await sendMessage({ action: "getPageDimensions" });
assert.equal(dimensionsResponse.scrollHeight, 2400);
assert.equal(dimensionsResponse.currentScrollY, 400);

await sendMessage({ action: "beginCapture" });
const scrollResponse = await sendMessage({
  action: "scrollToPosition",
  y: 800,
});
assert.equal(scrollResponse.success, true);
assert.equal(scrollResponse.actualY, 800);

const stickyResponse = await sendMessage({ action: "detectStickyElements" });
assert.equal(stickyResponse.stickyElements.length, 1);
await sendMessage({ action: "hideStickyElements" });
assert.equal(inlineStyle.visibility, "hidden");

await sendMessage({ action: "endCapture" });
assert.equal(windowMock.scrollY, 400);
assert.equal(inlineStyle.visibility, "");

console.log("Content-script capture lifecycle tests passed.");
