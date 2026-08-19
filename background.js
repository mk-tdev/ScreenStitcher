const CAPTURE_MENU_ID = "captureScreenshot";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create(
    {
      id: CAPTURE_MENU_ID,
      title: "Capture with ScreenStitcher",
      contexts: ["page"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Unable to create ScreenStitcher context menu:",
          chrome.runtime.lastError.message
        );
      }
    }
  );
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === CAPTURE_MENU_ID) {
    chrome.action.openPopup().catch((error) => {
      console.error("Unable to open ScreenStitcher popup:", error);
    });
  }
});
