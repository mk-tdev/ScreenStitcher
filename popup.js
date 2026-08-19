const STORAGE_KEYS = [
  "screenshots",
  "accumulateMode",
  "fullPageMode",
  "showInputFields",
  "showUploadSection",
  "screenshotCounter",
  "currentPageNumber",
];
const CAPTURE_MIN_INTERVAL_MS = 525;
const CAPTURE_JPEG_QUALITY = 94;
const FULL_PAGE_OVERLAP_RATIO = 0.04;
const MAX_FULL_PAGE_SECTIONS = 100;

class ScreenStitcher {
  constructor() {
    this.screenshots = [];
    this.accumulateMode = false;
    this.fullPageMode = false;
    this.showInputFields = false;
    this.showUploadSection = false;
    this.screenshotCounter = 0;
    this.currentPageNumber = 1;
    this.isBusy = false;
    this.lastCaptureStartedAt = 0;
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.updateUI();
  }

  async loadData() {
    const data = await chrome.storage.local.get(STORAGE_KEYS);
    const storedScreenshots = Array.isArray(data.screenshots)
      ? data.screenshots
      : [];
    let migrated = false;
    this.screenshots = storedScreenshots.map((storedScreenshot) => {
      let screenshot = storedScreenshot;
      if ("originalDataUrl" in screenshot) {
        const { originalDataUrl: _originalDataUrl, ...smallerScreenshot } =
          screenshot;
        screenshot = smallerScreenshot;
        migrated = true;
      }
      if (!screenshot.isFullPage && screenshot.pageTitle?.includes("(Full Page)")) {
        screenshot = { ...screenshot, isFullPage: true };
        migrated = true;
      }
      return screenshot;
    });
    this.accumulateMode = data.accumulateMode || false;
    this.fullPageMode = data.fullPageMode || false;
    this.showInputFields = data.showInputFields || false;
    this.showUploadSection = data.showUploadSection || false;
    this.screenshotCounter = data.screenshotCounter || 0;
    this.currentPageNumber = data.currentPageNumber || 1;
    document.getElementById("accumulateMode").checked = this.accumulateMode;
    document.getElementById("fullPageMode").checked = this.fullPageMode;
    document.getElementById("showInputFields").checked = this.showInputFields;
    document.getElementById("showUploadSection").checked =
      this.showUploadSection;
    document.getElementById("pageNumber").value = this.currentPageNumber;
    // Show/hide input and upload sections
    const inputSection = document.getElementById("inputSection");
    const pageNumberSection = document.getElementById("pageNumberSection");
    const uploadSection = document.getElementById("uploadSection");
    if (this.showInputFields) {
      inputSection.style.display = "block";
      pageNumberSection.style.display = "block";
    } else {
      inputSection.style.display = "none";
      pageNumberSection.style.display = "none";
    }
    if (this.showUploadSection && this.accumulateMode) {
      uploadSection.style.display = "block";
    } else {
      uploadSection.style.display = "none";
    }
    if (migrated) await this.saveData();
  }

  async saveData() {
    await chrome.storage.local.set({
      screenshots: this.screenshots,
      accumulateMode: this.accumulateMode,
      fullPageMode: this.fullPageMode,
      showInputFields: this.showInputFields,
      showUploadSection: this.showUploadSection,
      screenshotCounter: this.screenshotCounter,
      currentPageNumber: this.currentPageNumber,
    });
  }

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id || tab.windowId === undefined) {
      throw new Error("No active browser tab is available");
    }
    return tab;
  }

  setBusy(isBusy) {
    this.isBusy = isBusy;
    this.updateUI();
  }

  bindEvents() {
    document
      .getElementById("captureBtn")
      .addEventListener("click", () => this.captureScreenshot());
    document
      .getElementById("downloadSingleBtn")
      .addEventListener("click", () => this.downloadSingle());
    document
      .getElementById("downloadAllBtn")
      .addEventListener("click", () => this.downloadAll());
    document
      .getElementById("clearBtn")
      .addEventListener("click", () => this.clearAll());
    document
      .getElementById("accumulateMode")
      .addEventListener("change", (e) =>
        this.toggleAccumulateMode(e.target.checked)
      );
    document
      .getElementById("fullPageMode")
      .addEventListener("change", (e) =>
        this.toggleFullPageMode(e.target.checked)
      );
    document
      .getElementById("showInputFields")
      .addEventListener("change", (e) =>
        this.toggleInputFields(e.target.checked)
      );
    document
      .getElementById("showUploadSection")
      .addEventListener("change", (e) =>
        this.toggleUploadSection(e.target.checked)
      );
    document
      .getElementById("fileInput")
      .addEventListener("change", (e) => this.handleFileUpload(e));
    document
      .getElementById("pageNumber")
      .addEventListener("change", (e) => this.updatePageNumber(e.target.value));
    const uploadArea = document.getElementById("uploadArea");
    uploadArea.addEventListener("click", () => this.triggerFileUpload());
    uploadArea.addEventListener("dragover", (e) => this.handleDragOver(e));
    uploadArea.addEventListener("dragleave", (e) => this.handleDragLeave(e));
    uploadArea.addEventListener("drop", (e) => this.handleDrop(e));
    document
      .getElementById("modalClose")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("modalClose2")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("modalDelete")
      .addEventListener("click", () => this.deleteFromModal());
    document.getElementById("previewModal").addEventListener("click", (e) => {
      if (e.target.id === "previewModal") this.closeModal();
    });
  }

  updatePageNumber(value) {
    this.currentPageNumber = parseInt(value) || 1;
    this.saveData();
  }

  toggleAccumulateMode(enabled) {
    this.accumulateMode = enabled;
    const uploadSection = document.getElementById("uploadSection");
    if (enabled && this.showUploadSection) {
      uploadSection.style.display = "block";
    } else {
      uploadSection.style.display = "none";
    }
    this.saveData();
    this.updateUI();
  }

  toggleFullPageMode(enabled) {
    this.fullPageMode = enabled;
    this.saveData();
    this.updateUI();
  }

  toggleInputFields(enabled) {
    this.showInputFields = enabled;
    const inputSection = document.getElementById("inputSection");
    const pageNumberSection = document.getElementById("pageNumberSection");
    if (enabled) {
      inputSection.style.display = "block";
      pageNumberSection.style.display = "block";
      inputSection.classList.add("show");
    } else {
      inputSection.style.display = "none";
      pageNumberSection.style.display = "none";
      inputSection.classList.remove("show");
      document.getElementById("screenshotTitle").value = "";
      document.getElementById("screenshotDescription").value = "";
    }
    this.saveData();
  }

  toggleUploadSection(enabled) {
    this.showUploadSection = enabled;
    const uploadSection = document.getElementById("uploadSection");
    if (enabled && this.accumulateMode) {
      uploadSection.style.display = "block";
      uploadSection.classList.add("show");
    } else {
      uploadSection.style.display = "none";
      uploadSection.classList.remove("show");
    }
    this.saveData();
  }

  generateScreenshotMetadata(tab) {
    const titleInput = document.getElementById("screenshotTitle").value.trim();
    const descriptionInput = document
      .getElementById("screenshotDescription")
      .value.trim();
    const pageNum = this.currentPageNumber;
    this.currentPageNumber++;
    document.getElementById("pageNumber").value = this.currentPageNumber;
    const title = titleInput || `Page ${pageNum}`;
    const currentTime = new Date().toLocaleString();
    const pageUrl = (tab.url || "Unknown page").slice(0, 500);
    const baseDescription = `${currentTime}\n${pageUrl}`;
    const description = descriptionInput
      ? `${baseDescription}\n${descriptionInput}`
      : baseDescription;
    return { title, description, pageNumber: pageNum };
  }

  generateUploadMetadata(file, tab) {
    const titleInput = document.getElementById("screenshotTitle").value.trim();
    const descriptionInput = document
      .getElementById("screenshotDescription")
      .value.trim();
    const pageNum = this.currentPageNumber;
    this.currentPageNumber++;
    document.getElementById("pageNumber").value = this.currentPageNumber;
    const title = titleInput || `Page ${pageNum} (Uploaded)`;
    const currentTime = new Date().toLocaleString();
    const fileInfo = `${file.name} (${this.formatFileSize(file.size)})`;
    const baseDescription = `${currentTime}\nUploaded: ${fileInfo}`;
    const description = descriptionInput
      ? `${baseDescription}\n${descriptionInput}`
      : baseDescription;
    return { title, description, pageNumber: pageNum };
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async captureScreenshot() {
    if (this.isBusy) return;
    this.setBusy(true);
    try {
      const tab = await this.getActiveTab();
      if (this.fullPageMode) {
        await this.captureFullPage(tab);
      } else {
        await this.captureVisibleArea(tab);
      }
      if (this.showInputFields) {
        document.getElementById("screenshotTitle").value = "";
        document.getElementById("screenshotDescription").value = "";
      }
      this.updateUI();
    } catch (error) {
      console.error("Capture failed:", error);
      this.showStatus(`Capture failed: ${error.message}`, "error");
    } finally {
      this.setBusy(false);
    }
  }

  async captureVisibleArea(tab) {
    this.showStatus("Capturing screenshot...", "success");
    const dataUrl = await this.captureCurrentViewport(tab);
    const metadata = this.generateScreenshotMetadata(tab);
    const screenshotWithTitle = await this.decorateScreenshot(dataUrl, metadata);
    const screenshot = {
      dataUrl: screenshotWithTitle,
      timestamp: Date.now(),
      url: tab.url,
      title: metadata.title,
      description: metadata.description,
      pageTitle: tab.title,
    };
    if (this.accumulateMode) {
      this.screenshots.push(screenshot);
      await this.saveData();
      this.showStatus(`Screenshot "${metadata.title}" captured!`, "success");
    } else {
      await this.downloadPDF([screenshot], "screenshot");
      await this.saveData();
      this.showStatus("Screenshot downloaded!", "success");
    }
  }

  async captureCurrentViewport(tab) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      const elapsed = performance.now() - this.lastCaptureStartedAt;
      if (
        this.lastCaptureStartedAt > 0 &&
        elapsed < CAPTURE_MIN_INTERVAL_MS
      ) {
        await this.sleep(CAPTURE_MIN_INTERVAL_MS - elapsed);
      }
      this.lastCaptureStartedAt = performance.now();
      try {
        return await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: "jpeg",
          quality: CAPTURE_JPEG_QUALITY,
        });
      } catch (error) {
        lastError = error;
        if (attempt < 2) await this.sleep(250 * (attempt + 1));
      }
    }
    throw new Error(`Unable to capture the viewport: ${lastError.message}`);
  }

  async captureFullPage(tab) {
    const startedAt = performance.now();
    this.showStatus("Preparing full page capture...", "success");
    await this.ensureContentScriptInjected(tab.id);
    const pageInfo = await this.getPageDimensionsWithRetry(tab.id);
    if (!pageInfo) throw new Error("Unable to measure this page");

    const captureResult = await this.captureWithSelectiveSticky(tab, pageInfo);
    const { screenshots: sections, pageInfo: capturedPageInfo } = captureResult;
    if (sections.length === 0) {
      throw new Error("No page sections could be captured");
    }

    const dataUrl = await this.createSeamlessImage(sections, capturedPageInfo);
    const metadata = this.generateScreenshotMetadata(tab);
    const screenshotWithTitle = await this.decorateScreenshot(dataUrl, metadata);
    const fullPageScreenshot = {
      dataUrl: screenshotWithTitle,
      timestamp: Date.now(),
      url: tab.url,
      title: metadata.title,
      description: metadata.description,
      pageTitle: `${tab.title} (Full Page)`,
      isFullPage: true,
    };
    if (this.accumulateMode) {
      this.screenshots.push(fullPageScreenshot);
      await this.saveData();
      const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      this.showStatus(
        `Full page screenshot "${metadata.title}" captured in ${elapsedSeconds}s!`,
        "success"
      );
    } else {
      await this.downloadPDF([fullPageScreenshot], "fullpage-screenshot");
      await this.saveData();
      const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      this.showStatus(
        `Full page screenshot downloaded in ${elapsedSeconds}s!`,
        "success"
      );
    }
  }

  async decorateScreenshot(dataUrl, metadata) {
    if (!this.showInputFields) return dataUrl;
    return this.addTitleToScreenshot(
      dataUrl,
      metadata.title,
      metadata.description
    );
  }

  async addTitleToScreenshot(dataUrl, title, description) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const padding = 15;
        const maxCanvasDimension = 31000;
        let imageScale = Math.min(
          1,
          maxCanvasDimension / img.width,
          31000 / img.height
        );
        let renderedWidth = Math.max(1, Math.round(img.width * imageScale));
        let renderedHeight = Math.max(1, Math.round(img.height * imageScale));
        canvas.width = Math.max(320, renderedWidth);
        const ctx = canvas.getContext("2d");
        const maxWidth = canvas.width - padding * 2;

        ctx.font = "bold 16px Arial, sans-serif";
        const titleLines = this.wrapText(ctx, title, maxWidth);
        ctx.font = "12px Arial, sans-serif";
        const descriptionLines = description
          .split("\n")
          .flatMap((line) => this.wrapText(ctx, line, maxWidth));
        const titleLineHeight = 20;
        const descriptionLineHeight = 16;
        const headerHeight =
          padding +
          titleLines.length * titleLineHeight +
          5 +
          descriptionLines.length * descriptionLineHeight +
          padding;

        if (renderedHeight + headerHeight > maxCanvasDimension) {
          imageScale = (maxCanvasDimension - headerHeight) / img.height;
          renderedWidth = Math.max(1, Math.round(img.width * imageScale));
          renderedHeight = Math.max(1, Math.round(img.height * imageScale));
        }
        canvas.height = renderedHeight + headerHeight;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, headerHeight);
        ctx.lineTo(canvas.width, headerHeight);
        ctx.stroke();
        ctx.fillStyle = "#333333";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = "bold 16px Arial, sans-serif";
        let y = padding;
        titleLines.forEach((line) => {
          ctx.fillText(line, padding, y);
          y += titleLineHeight;
        });
        ctx.font = "12px Arial, sans-serif";
        ctx.fillStyle = "#666666";
        y += 5;
        descriptionLines.forEach((line) => {
          ctx.fillText(line, padding, y);
          y += descriptionLineHeight;
        });
        ctx.drawImage(
          img,
          (canvas.width - renderedWidth) / 2,
          headerHeight,
          renderedWidth,
          renderedHeight
        );
        resolve(canvas.toDataURL("image/jpeg", 0.94));
      };
      img.onerror = () => reject(new Error("Unable to decode captured image"));
      img.src = dataUrl;
    });
  }

  wrapText(ctx, text, maxWidth) {
    if (!text) return [""];
    const lines = [];
    let currentLine = "";
    for (const word of text.split(/\s+/)) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
        continue;
      }
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      while (ctx.measureText(currentLine).width > maxWidth) {
        let splitAt = currentLine.length - 1;
        while (
          splitAt > 1 &&
          ctx.measureText(currentLine.slice(0, splitAt)).width > maxWidth
        ) {
          splitAt--;
        }
        lines.push(currentLine.slice(0, splitAt));
        currentLine = currentLine.slice(splitAt);
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
  }

  async ensureContentScriptInjected(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "ping" });
    } catch (error) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });
      await this.sendMessageWithRetry(tabId, { action: "ping" });
    }
  }

  async getPageDimensionsWithRetry(tabId, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          action: "getPageDimensions",
        });
        if (response) return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(150);
      }
    }
    return null;
  }

  async sendMessageWithRetry(tabId, message, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(150);
      }
    }
  }

  async captureWithSelectiveSticky(tab, pageInfo) {
    const screenshots = [];
    const viewportHeight = pageInfo.viewportHeight;
    let stickyElements = [];
    const overlapPixels = Math.max(
      24,
      Math.floor(viewportHeight * FULL_PAGE_OVERLAP_RATIO)
    );
    const effectiveStepSize = viewportHeight - overlapPixels;
    const estimatedSections = Math.max(
      1,
      Math.ceil((pageInfo.scrollHeight - viewportHeight) / effectiveStepSize) + 1
    );
    let targetY = 0;
    let latestPageInfo = pageInfo;

    try {
      await this.sendMessageWithRetry(tab.id, { action: "beginCapture" });
      for (let i = 0; i < MAX_FULL_PAGE_SECTIONS; i++) {
        if (i === 1 && stickyElements.length > 0) {
          await this.sendMessageWithRetry(tab.id, {
            action: "hideStickyElements",
          });
        }
        const settledState = await this.sendMessageWithRetry(tab.id, {
          action: "scrollToPosition",
          y: targetY,
        });
        if (!settledState?.success) {
          throw new Error(
            settledState?.error || "The page did not finish scrolling"
          );
        }
        const dataUrl = await this.captureCurrentViewport(tab);
        const currentState = await this.sendMessageWithRetry(tab.id, {
          action: "getPageState",
        });
        const state = {
          ...settledState,
          ...currentState,
          actualY: currentState.currentScrollY,
        };
        const isLast =
          state.actualY + state.viewportHeight >= state.scrollHeight - 2;
        screenshots.push({
          dataUrl,
          plannedScrollY: targetY,
          actualScrollY: state.actualY,
          viewportHeight: state.viewportHeight,
          step: i,
          isFirst: i === 0,
          isLast,
          devicePixelRatio: state.devicePixelRatio || 1,
          stickyHidden: i > 0,
        });
        latestPageInfo = {
          ...latestPageInfo,
          ...state,
          scrollHeight: Math.max(
            latestPageInfo.scrollHeight,
            state.scrollHeight,
            state.actualY + state.viewportHeight
          ),
        };
        this.showStatus(
          `Captured section ${i + 1}/~${estimatedSections}...`,
          "success"
        );
        if (isLast) break;
        if (i === 0) {
          const stickyState = await this.sendMessageWithRetry(tab.id, {
            action: "detectStickyElements",
          });
          stickyElements = stickyState?.stickyElements || [];
        }

        const nextY = Math.min(
          state.scrollHeight - state.viewportHeight,
          state.actualY + effectiveStepSize
        );
        if (nextY <= state.actualY + 1) {
          screenshots[screenshots.length - 1].isLast = true;
          break;
        }
        targetY = nextY;

        if (i === MAX_FULL_PAGE_SECTIONS - 1) {
          throw new Error(
            "This page kept growing during capture; stopped after 100 sections"
          );
        }
      }
    } finally {
      await this.sendMessageWithRetry(tab.id, { action: "endCapture" }).catch(
        () => {}
      );
    }
    return { screenshots, pageInfo: latestPageInfo };
  }

  async createSeamlessImage(screenshots, pageInfo) {
    if (screenshots.length === 0) {
      throw new Error("No screenshots to stitch");
    }
    const firstImage = await this.loadImage(screenshots[0].dataUrl);
    const rawCanvasHeight = Math.round(
      (pageInfo.scrollHeight / pageInfo.viewportHeight) * firstImage.height
    );
    const maxCanvasDimension = 31000;
    const outputScale = Math.min(
      1,
      maxCanvasDimension / firstImage.width,
      maxCanvasDimension / rawCanvasHeight
    );
    const canvasWidth = Math.max(
      1,
      Math.round(firstImage.width * outputScale)
    );
    const canvasHeight = Math.max(
      1,
      Math.round(rawCanvasHeight * outputScale)
    );
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let index = 0; index < screenshots.length; index++) {
      const image =
        index === 0
          ? firstImage
          : await this.loadImage(screenshots[index].dataUrl);
      this.drawScreenshotSection(
        ctx,
        image,
        screenshots[index],
        pageInfo,
        canvasWidth,
        canvasHeight,
        firstImage.width
      );
    }

    const stitchedImage = canvas.toDataURL("image/jpeg", 0.92);
    if (!stitchedImage.startsWith("data:image/jpeg")) {
      throw new Error("The browser could not encode the full-page image");
    }
    return stitchedImage;
  }

  drawScreenshotSection(
    ctx,
    image,
    screenshot,
    pageInfo,
    canvasWidth,
    canvasHeight,
    sourceWidth
  ) {
    const scaleFactor = canvasWidth / pageInfo.viewportWidth;
    const imageScaleFactor = canvasWidth / sourceWidth;
    const drawWidth = image.width * imageScaleFactor;
    const drawHeight = image.height * imageScaleFactor;
    let drawY;
    if (screenshot.isFirst) {
      drawY = 0;
    } else if (screenshot.isLast) {
      drawY = canvasHeight - drawHeight;
    } else {
      drawY = screenshot.actualScrollY * scaleFactor;
    }
    drawY = Math.max(0, Math.min(drawY, canvasHeight - drawHeight));
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      0,
      drawY,
      drawWidth,
      drawHeight
    );
  }

  async downloadSingle() {
    if (this.isBusy) return;
    this.setBusy(true);
    try {
      const tab = await this.getActiveTab();
      const dataUrl = await this.captureCurrentViewport(tab);
      const metadata = this.generateScreenshotMetadata(tab);
      const screenshotWithTitle = await this.decorateScreenshot(
        dataUrl,
        metadata
      );
      await this.downloadPDF(
        [
          {
            dataUrl: screenshotWithTitle,
            timestamp: Date.now(),
            url: tab.url,
            title: metadata.title,
            description: metadata.description,
            pageTitle: tab.title,
          },
        ],
        "screenshot"
      );
      await this.saveData();
      if (this.showInputFields) {
        document.getElementById("screenshotTitle").value = "";
        document.getElementById("screenshotDescription").value = "";
      }
      this.showStatus("PDF downloaded!", "success");
    } catch (error) {
      console.error("Download failed:", error);
      this.showStatus(`Download failed: ${error.message}`, "error");
    } finally {
      this.setBusy(false);
    }
  }

  async downloadAll() {
    if (this.screenshots.length === 0 || this.isBusy) return;
    this.setBusy(true);
    try {
      await this.downloadPDF(this.screenshots, "screenshots-collection");
      this.showStatus(
        `Downloaded ${this.screenshots.length} screenshots as PDF!`,
        "success"
      );
    } catch (error) {
      console.error("Download all failed:", error);
      this.showStatus(`Download failed: ${error.message}`, "error");
    } finally {
      this.setBusy(false);
    }
  }

  async downloadPDF(screenshots, filename) {
    if (screenshots.length === 0) {
      throw new Error("No screenshots are available");
    }
    const { jsPDF } = window.jspdf;
    let pdf = null;
    const addPage = (orientation) => {
      if (!pdf) {
        pdf = new jsPDF({
          orientation,
          unit: "mm",
          format: "a4",
          compress: true,
        });
      } else {
        pdf.addPage("a4", orientation);
      }
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      return { pageWidth, pageHeight };
    };

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const img = await this.loadImage(screenshot.dataUrl);
      const imgRatio = img.width / img.height;
      const imageFormat = this.getImageFormat(screenshot.dataUrl);

      if (screenshot.isFullPage) {
        const orientation = imgRatio > 1 ? "landscape" : "portrait";
        let { pageWidth, pageHeight } = addPage(orientation);
        const drawWidth = pageWidth;
        const drawHeight = drawWidth / imgRatio;
        const pageCount = Math.max(1, Math.ceil(drawHeight / pageHeight));
        const imageAlias = `full-page-${i}`;
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
          if (pageIndex > 0) {
            ({ pageWidth, pageHeight } = addPage(orientation));
          }
          pdf.addImage(
            screenshot.dataUrl,
            imageFormat,
            0,
            -pageIndex * pageHeight,
            pageWidth,
            drawHeight,
            imageAlias,
            "FAST"
          );
        }
        continue;
      }

      const orientation = imgRatio > 1.4 ? "landscape" : "portrait";
      const { pageWidth, pageHeight } = addPage(orientation);
      const pageRatio = pageWidth / pageHeight;
      let drawWidth;
      let drawHeight;
      if (imgRatio > pageRatio) {
        drawWidth = pageWidth;
        drawHeight = pageWidth / imgRatio;
      } else {
        drawHeight = pageHeight;
        drawWidth = pageHeight * imgRatio;
      }
      pdf.addImage(
        screenshot.dataUrl,
        imageFormat,
        (pageWidth - drawWidth) / 2,
        (pageHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
        `screenshot-${i}`,
        "FAST"
      );
    }

    pdf.setProperties({ title: filename });
    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    try {
      await chrome.downloads.download({
        url,
        filename: `${filename}-${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, "-")}.pdf`,
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to decode screenshot"));
      img.src = dataUrl;
    });
  }

  getImageFormat(dataUrl) {
    return dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
  }

  async clearAll() {
    if (this.isBusy) return;
    this.setBusy(true);
    try {
      this.showStatus("Clearing all data...", "success");
      this.screenshots = [];
      this.screenshotCounter = 0;
      this.currentPageNumber = 1;
      document.getElementById("screenshotTitle").value = "";
      document.getElementById("screenshotDescription").value = "";
      document.getElementById("pageNumber").value = 1;
      await chrome.storage.local.remove(STORAGE_KEYS);
      this.accumulateMode = false;
      this.fullPageMode = false;
      this.showInputFields = false;
      this.showUploadSection = false;
      document.getElementById("accumulateMode").checked = false;
      document.getElementById("fullPageMode").checked = false;
      document.getElementById("showInputFields").checked = false;
      document.getElementById("showUploadSection").checked = false;
      document.getElementById("inputSection").style.display = "none";
      document.getElementById("pageNumberSection").style.display = "none";
      document.getElementById("uploadSection").style.display = "none";
      await this.saveData();
      this.showStatus("All screenshots and settings cleared!", "success");
    } catch (error) {
      console.error("Clear failed:", error);
      this.showStatus(`Clear failed: ${error.message}`, "error");
    } finally {
      this.setBusy(false);
    }
  }

  triggerFileUpload() {
    document.getElementById("fileInput").click();
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("uploadArea").classList.add("dragover");
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("uploadArea").classList.remove("dragover");
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("uploadArea").classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files);
    this.processUploadedFiles(files);
  }

  handleFileUpload(e) {
    const files = Array.from(e.target.files);
    this.processUploadedFiles(files);
    e.target.value = "";
  }

  async processUploadedFiles(files) {
    if (this.isBusy) return;
    if (!this.accumulateMode) {
      this.showStatus(
        "Please enable Accumulate Mode to upload images",
        "error"
      );
      return;
    }
    if (!this.showUploadSection) {
      this.showStatus(
        'Please enable "Upload from Local" to upload images',
        "error"
      );
      return;
    }
    const supportedImageTypes = new Set(["image/png", "image/jpeg"]);
    const imageFiles = files.filter((file) =>
      supportedImageTypes.has(file.type)
    );
    if (imageFiles.length === 0) {
      this.showStatus("No valid image files selected", "error");
      return;
    }
    this.setBusy(true);
    this.showStatus(`Processing ${imageFiles.length} image(s)...`, "success");
    const uploadArea = document.getElementById("uploadArea");
    const overlay = document.createElement("div");
    overlay.className = "processing-overlay";
    overlay.innerHTML = `<div class="processing-spinner"></div>Processing images...`;
    uploadArea.appendChild(overlay);
    try {
      const tab = await this.getActiveTab();
      let processedCount = 0;
      for (const file of imageFiles) {
        try {
          await this.processUploadedImage(file, tab);
          processedCount++;
          this.showStatus(
            `Processed ${processedCount}/${imageFiles.length} images`,
            "success"
          );
        } catch (error) {
          console.error("Error processing file:", file.name, error);
          this.showStatus(
            `Error processing ${file.name}: ${error.message}`,
            "error"
          );
        }
      }
      if (processedCount > 0) {
        await this.saveData();
        this.showStatus(
          `Successfully added ${processedCount} image(s)!`,
          "success"
        );
        if (this.showInputFields) {
          document.getElementById("screenshotTitle").value = "";
          document.getElementById("screenshotDescription").value = "";
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      this.showStatus(`Upload failed: ${error.message}`, "error");
    } finally {
      overlay.remove();
      this.setBusy(false);
    }
  }

  async processUploadedImage(file, tab) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target.result;
          const metadata = this.generateUploadMetadata(file, tab);
          const imageWithTitle = await this.decorateScreenshot(
            dataUrl,
            metadata
          );
          const screenshot = {
            dataUrl: imageWithTitle,
            timestamp: Date.now(),
            url: tab.url,
            title: metadata.title,
            description: metadata.description,
            pageTitle: `Uploaded: ${file.name}`,
            isUploaded: true,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          };
          this.screenshots.push(screenshot);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  updatePreview() {
    const container = document.getElementById("previewContainer");
    container.innerHTML = "";
    this.screenshots.forEach((screenshot, index) => {
      const item = document.createElement("div");
      item.className = "preview-item";
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("remove-btn")) {
          this.openPreviewModal(screenshot, index);
        }
      });
      const img = document.createElement("img");
      img.src = screenshot.dataUrl;
      img.title = `${screenshot.title}\n${screenshot.description}`;
      const title = document.createElement("div");
      title.className = "preview-title";
      title.textContent = screenshot.title;
      if (screenshot.isUploaded) {
        const uploadIndicator = document.createElement("div");
        uploadIndicator.style.cssText = `
          position: absolute;
          top: 2px;
          left: 2px;
          background: rgba(156, 39, 176, 0.9);
          color: white;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: bold;
        `;
        uploadIndicator.textContent = "📤";
        item.appendChild(uploadIndicator);
      }
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "×";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeScreenshot(index);
      };
      item.appendChild(img);
      item.appendChild(title);
      item.appendChild(removeBtn);
      container.appendChild(item);
    });
  }

  openPreviewModal(screenshot, index) {
    const modal = document.getElementById("previewModal");
    const modalImage = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalImageTitle");
    const modalUrl = document.getElementById("modalImageUrl");
    const modalTimestamp = document.getElementById("modalImageTimestamp");
    const modalDescription = document.getElementById("modalImageDescription");
    const modalDeleteBtn = document.getElementById("modalDelete");
    modalImage.src = screenshot.dataUrl;
    modalTitle.textContent = screenshot.title;
    const descriptionLines = screenshot.description.split("\n");
    const timestamp = descriptionLines[0] || "Unknown";
    modalTimestamp.textContent = timestamp;
    const urlOrFileInfo = descriptionLines[1] || screenshot.url || "Unknown";
    modalUrl.textContent = urlOrFileInfo;
    const userDescription =
      descriptionLines.length > 2
        ? descriptionLines.slice(2).join("\n")
        : "No additional description";
    modalDescription.textContent = userDescription;
    modalDeleteBtn.dataset.index = index;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    const modal = document.getElementById("previewModal");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  deleteFromModal() {
    const index = parseInt(
      document.getElementById("modalDelete").dataset.index
    );
    this.removeScreenshot(index);
    this.closeModal();
  }

  async removeScreenshot(index) {
    this.screenshots.splice(index, 1);
    await this.saveData();
    this.updateUI();
  }

  updateUI() {
    const count = this.screenshots.length;
    document.getElementById("screenshotCount").textContent = count;
    const downloadSingleBtn = document.getElementById("downloadSingleBtn");
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const clearBtn = document.getElementById("clearBtn");
    const previewSection = document.getElementById("previewSection");
    downloadSingleBtn.disabled = this.isBusy;
    downloadAllBtn.disabled = this.isBusy || count === 0;
    clearBtn.disabled = this.isBusy;
    if (count > 0 && this.accumulateMode) {
      previewSection.style.display = "block";
      this.updatePreview();
    } else {
      previewSection.style.display = "none";
    }
    const captureBtn = document.getElementById("captureBtn");
    captureBtn.disabled = this.isBusy;
    captureBtn.textContent = this.isBusy
      ? "⏳ Working..."
      : this.fullPageMode
      ? "📸 Capture Full Page"
      : "📸 Capture View";
    downloadSingleBtn.textContent = "📄 Quick PDF";
    downloadAllBtn.innerHTML = "📁 Download";
  }

  showStatus(message, type) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";
    if (type === "success") {
      setTimeout(() => {
        if (status.textContent === message) {
          status.style.display = "none";
        }
      }, 3000);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ScreenStitcher();
});
