class ScreenStitcher {
  constructor() {
    this.screenshots = [];
    this.accumulateMode = false;
    this.fullPageMode = false;
    this.showInputFields = false;
    this.showUploadSection = false;
    this.screenshotCounter = 0;
    this.currentPageNumber = 1;
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.updateUI();

    // Pre-inject html2canvas into active tab
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["libs/html2canvas.min.js"],
      });
    } catch (error) {
      console.error("Failed to pre-load html2canvas:", error);
    }
  }

  async loadData() {
    const data = await chrome.storage.local.get([
      "screenshots",
      "accumulateMode",
      "fullPageMode",
      "showInputFields",
      "showUploadSection",
      "screenshotCounter",
      "currentPageNumber",
    ]);
    this.screenshots = data.screenshots || [];
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
    const baseDescription = `${currentTime}\n${tab.url}`;
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
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
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
      this.showStatus("Failed to capture screenshot", "error");
    }
  }

  async captureVisibleArea(tab) {
    this.showStatus("Capturing screenshot...", "success");

    // Capture the screenshot using html2canvas
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        // Wait for any animations/transitions to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        const canvas = await html2canvas(document.documentElement, {
          useCORS: true,
          scale: window.devicePixelRatio,
          logging: false,
          allowTaint: true,
          backgroundColor: null,
          foreignObjectRendering: true,
          removeContainer: false,
          x: window.scrollX,
          y: window.scrollY,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: document.documentElement.clientHeight,
          onclone: (clonedDoc) => {
            // Ensure all styles are computed and applied
            const styles = window.getComputedStyle(document.documentElement);
            clonedDoc.documentElement.style.cssText = Array.from(styles).reduce(
              (str, property) => {
                return `${str}${property}:${styles.getPropertyValue(
                  property
                )};`;
              },
              ""
            );
          },
        });
        return canvas.toDataURL("image/png", 1.0);
      },
    });

    const dataUrl = result.result;
    const metadata = this.generateScreenshotMetadata(tab);
    const screenshotWithTitle = await this.addTitleToScreenshot(
      dataUrl,
      metadata.title,
      metadata.description
    );
    const screenshot = {
      dataUrl: screenshotWithTitle,
      originalDataUrl: dataUrl,
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
      this.showStatus("Screenshot downloaded!", "success");
    }
  }

  async captureFullPage(tab) {
    this.showStatus("Preparing full page capture...", "success");
    try {
      // Get the full page dimensions and capture the screenshot
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          // Wait for any animations/transitions to complete
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Get full page dimensions
          const body = document.body;
          const html = document.documentElement;
          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );

          // Configure html2canvas for full page
          const canvas = await html2canvas(document.documentElement, {
            useCORS: true,
            scale: window.devicePixelRatio,
            logging: false,
            allowTaint: true,
            backgroundColor: null,
            height: height,
            windowHeight: height,
            foreignObjectRendering: true,
            removeContainer: false,
            x: window.scrollX,
            y: window.scrollY,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            windowWidth: document.documentElement.clientWidth,
            onclone: (clonedDoc) => {
              // Ensure all styles are computed and applied
              const styles = window.getComputedStyle(document.documentElement);
              clonedDoc.documentElement.style.cssText = Array.from(
                styles
              ).reduce((str, property) => {
                return `${str}${property}:${styles.getPropertyValue(
                  property
                )};`;
              }, "");
            },
          });
          return canvas.toDataURL("image/png", 1.0);
        },
      });

      const dataUrl = result.result;
      const metadata = this.generateScreenshotMetadata(tab);
      const screenshotWithTitle = await this.addTitleToScreenshot(
        dataUrl,
        metadata.title,
        metadata.description
      );
      const fullPageScreenshot = {
        dataUrl: screenshotWithTitle,
        originalDataUrl: dataUrl,
        timestamp: Date.now(),
        url: tab.url,
        title: metadata.title,
        description: metadata.description,
        pageTitle: tab.title + " (Full Page)",
      };

      if (this.accumulateMode) {
        this.screenshots.push(fullPageScreenshot);
        await this.saveData();
        this.showStatus(
          `Full page screenshot "${metadata.title}" captured!`,
          "success"
        );
      } else {
        await this.downloadPDF([fullPageScreenshot], "fullpage-screenshot");
        this.showStatus("Full page screenshot downloaded!", "success");
      }
    } catch (error) {
      console.error("Full page capture failed:", error);
      this.showStatus("Failed to capture full page: " + error.message, "error");
    }
  }

  async addTitleToScreenshot(dataUrl, title, description) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const padding = 15;
        const lineHeight = 16;
        const titleHeight = 20;
        const descriptionLines = description.split("\n");
        const headerHeight =
          titleHeight +
          padding +
          descriptionLines.length * lineHeight +
          padding;
        canvas.width = img.width;
        canvas.height = img.height + headerHeight;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, headerHeight);
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
        ctx.fillText(title, padding, padding);
        ctx.font = "12px Arial, sans-serif";
        ctx.fillStyle = "#666666";
        let y = padding + titleHeight + 5;
        const maxWidth = canvas.width - padding * 2;
        descriptionLines.forEach((line) => {
          const words = line.split(" ");
          let currentLine = "";
          for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + " ";
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && i > 0) {
              ctx.fillText(currentLine, padding, y);
              currentLine = words[i] + " ";
              y += lineHeight;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine.trim()) {
            ctx.fillText(currentLine, padding, y);
            y += lineHeight;
          }
        });
        ctx.drawImage(img, 0, headerHeight);
        resolve(canvas.toDataURL("image/png", 1.0));
      };
      img.src = dataUrl;
    });
  }

  async ensureContentScriptInjected(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "ping" });
    } catch (error) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });
      await this.sleep(500);
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
        await this.sleep(1000);
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
        await this.sleep(500);
      }
    }
  }

  async captureWithSelectiveSticky(tab, pageInfo) {
    const screenshots = [];
    const viewportHeight = pageInfo.viewportHeight;
    const totalHeight = pageInfo.scrollHeight;
    const stickyElements = pageInfo.stickyElements || [];
    const overlapPixels = Math.floor(viewportHeight * 0.15);
    const effectiveStepSize = viewportHeight - overlapPixels;
    const scrollSteps =
      Math.ceil((totalHeight - viewportHeight) / effectiveStepSize) + 1;
    await this.sendMessageWithRetry(tab.id, { action: "scrollToTop" });
    await this.sleep(1000);
    for (let i = 0; i < scrollSteps; i++) {
      let scrollY;
      if (i === 0) {
        scrollY = 0;
      } else if (i === scrollSteps - 1) {
        scrollY = totalHeight - viewportHeight;
        if (stickyElements.length > 0) {
          await this.sendMessageWithRetry(tab.id, {
            action: "hideStickyElements",
          });
          await this.sleep(300);
        }
      } else {
        scrollY = i * effectiveStepSize;
        if (stickyElements.length > 0) {
          await this.sendMessageWithRetry(tab.id, {
            action: "hideStickyElements",
          });
          await this.sleep(300);
        }
      }
      try {
        await this.sendMessageWithRetry(tab.id, {
          action: "scrollToPosition",
          y: scrollY,
        });
        await this.sleep(800);
        const actualPosition = await this.sendMessageWithRetry(tab.id, {
          action: "getScrollPosition",
        });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: "png",
          quality: 100,
        });
        screenshots.push({
          dataUrl,
          plannedScrollY: scrollY,
          actualScrollY: actualPosition.y,
          viewportHeight,
          step: i,
          isFirst: i === 0,
          isLast: i === scrollSteps - 1,
          devicePixelRatio: pageInfo.devicePixelRatio || 1,
          stickyHidden: i > 0,
        });
        if (i > 0 && i < scrollSteps - 1 && stickyElements.length > 0) {
          await this.sendMessageWithRetry(tab.id, {
            action: "showStickyElements",
          });
          await this.sleep(200);
        }
        this.showStatus(
          `Capturing section ${i + 1}/${scrollSteps}...`,
          "success"
        );
      } catch (error) {
        console.error(`Failed to capture step ${i + 1}:`, error);
      }
    }
    await this.sendMessageWithRetry(tab.id, { action: "showStickyElements" });
    await this.sendMessageWithRetry(tab.id, { action: "scrollToTop" });
    return screenshots;
  }

  async createSeamlessImage(screenshots, pageInfo) {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const firstImg = new Image();
      firstImg.onload = () => {
        const canvasWidth = firstImg.width;
        const canvasHeight = Math.round(
          (pageInfo.scrollHeight / pageInfo.viewportHeight) * firstImg.height
        );
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        let loadedCount = 0;
        const images = [];
        screenshots.forEach((screenshot, index) => {
          const img = new Image();
          img.onload = () => {
            images[index] = img;
            loadedCount++;
            if (loadedCount === screenshots.length) {
              this.stitchImagesSeamlessly(
                ctx,
                images,
                screenshots,
                pageInfo,
                canvasWidth,
                canvasHeight
              );
              resolve(canvas.toDataURL("image/png", 1.0));
            }
          };
          img.src = screenshot.dataUrl;
        });
      };
      firstImg.src = screenshots[0].dataUrl;
    });
  }

  stitchImagesSeamlessly(
    ctx,
    images,
    screenshots,
    pageInfo,
    canvasWidth,
    canvasHeight
  ) {
    const scaleFactor = canvasWidth / pageInfo.viewportWidth;
    screenshots.forEach((screenshot, index) => {
      const img = images[index];
      if (!img) return;
      let drawY;
      if (screenshot.isFirst) {
        drawY = 0;
      } else if (screenshot.isLast) {
        drawY = canvasHeight - img.height;
      } else {
        drawY = screenshot.actualScrollY * scaleFactor;
      }
      drawY = Math.max(0, Math.min(drawY, canvasHeight - img.height));
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        0,
        drawY,
        img.width,
        img.height
      );
    });
  }

  async downloadSingle() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (this.fullPageMode) {
        await this.captureFullPage(tab);
      } else {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: "png",
          quality: 100,
        });
        const metadata = this.generateScreenshotMetadata(tab);
        const screenshotWithTitle = await this.addTitleToScreenshot(
          dataUrl,
          metadata.title,
          metadata.description
        );
        await this.downloadPDF(
          [
            {
              dataUrl: screenshotWithTitle,
              originalDataUrl: dataUrl,
              timestamp: Date.now(),
              url: tab.url,
              title: metadata.title,
              description: metadata.description,
              pageTitle: tab.title,
            },
          ],
          "screenshot"
        );
        if (this.showInputFields) {
          document.getElementById("screenshotTitle").value = "";
          document.getElementById("screenshotDescription").value = "";
        }
        this.showStatus("PDF downloaded!", "success");
      }
    } catch (error) {
      console.error("Download failed:", error);
      this.showStatus("Failed to download PDF", "error");
    }
  }

  async downloadAll() {
    if (this.screenshots.length === 0) return;
    try {
      await this.downloadPDF(this.screenshots, "screenshots-collection");
      this.showStatus(
        `Downloaded ${this.screenshots.length} screenshots as PDF!`,
        "success"
      );
    } catch (error) {
      console.error("Download all failed:", error);
      this.showStatus("Failed to download PDF", "error");
    }
  }

  async downloadPDF(screenshots, filename) {
    const { jsPDF } = window.jspdf;
    let pdf;
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const img = new Image();
      img.src = screenshot.dataUrl;
      await new Promise((resolve) => {
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          const imgRatio = imgWidth / imgHeight;
          if (i === 0) {
            if (screenshot.title && screenshot.title.includes("Full Page")) {
              const mmPerPixel = 0.264583;
              const pdfWidth = Math.min(imgWidth * mmPerPixel, 210);
              const pdfHeight = (pdfWidth / imgWidth) * imgHeight;
              pdf = new jsPDF("p", "mm", [pdfWidth, pdfHeight]);
            } else {
              if (imgRatio > 1.4) {
                pdf = new jsPDF("l", "mm", "a4");
              } else {
                pdf = new jsPDF("p", "mm", "a4");
              }
            }
          } else {
            pdf.addPage();
          }
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          if (screenshot.title && screenshot.title.includes("Full Page")) {
            pdf.addImage(
              screenshot.dataUrl,
              "PNG",
              0,
              0,
              pageWidth,
              pageHeight,
              undefined,
              "FAST"
            );
          } else {
            const pageRatio = pageWidth / pageHeight;
            let drawWidth, drawHeight, offsetX, offsetY;
            if (imgRatio > pageRatio) {
              drawWidth = pageWidth;
              drawHeight = pageWidth / imgRatio;
              offsetX = 0;
              offsetY = (pageHeight - drawHeight) / 2;
            } else {
              drawHeight = pageHeight;
              drawWidth = pageHeight * imgRatio;
              offsetX = (pageWidth - drawWidth) / 2;
              offsetY = 0;
            }
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");
            pdf.addImage(
              screenshot.dataUrl,
              "PNG",
              offsetX,
              offsetY,
              drawWidth,
              drawHeight,
              undefined,
              "FAST"
            );
          }
          resolve();
        };
      });
    }
    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    await chrome.downloads.download({
      url: url,
      filename: `${filename}-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.pdf`,
    });
  }

  async clearAll() {
    this.showStatus("Clearing all data...", "success");
    this.screenshots = [];
    this.screenshotCounter = 0;
    this.currentPageNumber = 1;
    document.getElementById("screenshotTitle").value = "";
    document.getElementById("screenshotDescription").value = "";
    document.getElementById("pageNumber").value = 1;
    await chrome.storage.local.clear();
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
    this.updateUI();
    this.showStatus("All screenshots and data cleared!", "success");
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
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      this.showStatus("No valid image files selected", "error");
      return;
    }
    this.showStatus(`Processing ${imageFiles.length} image(s)...`, "success");
    const uploadArea = document.getElementById("uploadArea");
    const overlay = document.createElement("div");
    overlay.className = "processing-overlay";
    overlay.innerHTML = `<div class="processing-spinner"></div>Processing images...`;
    uploadArea.appendChild(overlay);
    let processedCount = 0;
    for (const file of imageFiles) {
      try {
        await this.processUploadedImage(file);
        processedCount++;
        this.showStatus(
          `Processed ${processedCount}/${imageFiles.length} images`,
          "success"
        );
      } catch (error) {
        console.error("Error processing file:", file.name, error);
        this.showStatus(`Error processing ${file.name}`, "error");
      }
    }
    uploadArea.removeChild(overlay);
    if (processedCount > 0) {
      await this.saveData();
      this.updateUI();
      this.showStatus(
        `Successfully added ${processedCount} image(s)!`,
        "success"
      );
      if (this.showInputFields) {
        document.getElementById("screenshotTitle").value = "";
        document.getElementById("screenshotDescription").value = "";
      }
    }
  }

  async processUploadedImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target.result;
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const metadata = this.generateUploadMetadata(file, tab);
          const imageWithTitle = await this.addTitleToScreenshot(
            dataUrl,
            metadata.title,
            metadata.description
          );
          const screenshot = {
            dataUrl: imageWithTitle,
            originalDataUrl: dataUrl,
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

  removeScreenshot(index) {
    this.screenshots.splice(index, 1);
    this.saveData();
    this.updateUI();
  }

  updateUI() {
    const count = this.screenshots.length;
    document.getElementById("screenshotCount").textContent = count;
    const downloadSingleBtn = document.getElementById("downloadSingleBtn");
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const clearBtn = document.getElementById("clearBtn");
    const previewSection = document.getElementById("previewSection");
    downloadSingleBtn.disabled = this.accumulateMode && count === 0;
    downloadAllBtn.disabled = count === 0;
    clearBtn.disabled = count === 0;
    if (count > 0 && this.accumulateMode) {
      previewSection.style.display = "block";
      this.updatePreview();
    } else {
      previewSection.style.display = "none";
    }
    const captureBtn = document.getElementById("captureBtn");
    if (this.fullPageMode) {
      captureBtn.innerHTML = "📸 Capture";
      downloadSingleBtn.innerHTML = "📄 Current Page";
    } else {
      captureBtn.innerHTML = "📸 Capture";
      downloadSingleBtn.innerHTML = "📄 Current Page";
    }
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
