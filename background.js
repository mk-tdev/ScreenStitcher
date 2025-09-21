chrome.runtime.onInstalled.addListener(() => {
  console.log("ScreenStitcher extension installed");
});
chrome?.contextMenus?.create({
  id: "captureScreenshot",
  title: "Capture with ScreenStitcher",
  contexts: ["page"],
});
chrome?.contextMenus?.onClicked?.addListener((info, tab) => {
  if (info.menuItemId === "captureScreenshot") {
    chrome.action.openPopup();
  }
});
