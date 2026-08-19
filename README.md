# ScreenStitcher

ScreenStitcher is a Manifest V3 Chrome extension that captures the visible browser viewport or a full webpage and exports screenshots as PDF documents. Captures can be downloaded immediately or collected into a multi-page PDF.

## Features

- Fast browser-native visible-area capture using Chrome's tab capture API
- Full-page capture by scrolling, hiding repeated fixed elements, and stitching sections
- Layout-aware scroll settling instead of fixed per-section delays
- Bounded capture retries and Chrome capture-rate throttling
- Restoration of the original page position after a full-page capture
- Automatic page-state restoration if capture is interrupted
- Immediate single-capture PDF downloads
- Accumulate mode for multi-screenshot PDF collections
- Optional rendered title/description headers, plus stored timestamps, URLs, and page numbering
- Local PNG and JPEG image uploads
- Preview and deletion of accumulated screenshots
- Full-page PDF pagination across readable A4 pages
- Local-only persistence; the extension does not send capture data over the network

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome or another Chromium-based browser.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this directory.
5. Pin ScreenStitcher to the browser toolbar if desired.

After changing source files, use the extension page's reload button to load the new version.

## Usage

### Capture the visible viewport

Open the popup and select **Capture View**. When Accumulate Mode is off, ScreenStitcher downloads the capture as a PDF. When it is on, the capture is added to the collection.

**Quick PDF** always downloads the currently visible viewport without adding it to the collection.

### Capture a full page

Enable **Full Page Screenshot**, then select **Capture Full Page**. ScreenStitcher scrolls through the page, captures overlapping sections, hides fixed or sticky elements after the first section, stitches the result, and restores the original scroll position.

The capture waits for scrolling and visible images only when necessary. Sections use a small overlap and JPEG working images to reduce capture, stitching, storage, and PDF generation time while maintaining high visual quality.

Pages that Chrome does not allow extensions to inspect, such as `chrome://` pages and the Chrome Web Store, cannot be captured. Very large pages are scaled down to stay within browser canvas limits.

### Build a collection

1. Enable **Accumulate Mode**.
2. Capture one or more views or full pages.
3. Optionally enable **Upload from Local** to add images.
4. Review or remove captures in the preview area.
5. Select **Download** to generate a combined PDF.

Captures and settings are stored in `chrome.storage.local`. The extension requests unlimited local storage because high-resolution collections can exceed Chrome's standard extension quota. Clearing the collection removes stored screenshots and resets settings.

## Architecture

```text
manifest.json       Extension permissions and entry points
background.js       Context-menu registration and popup launch
content.js          On-demand scrolling and sticky-element control
popup.html          Popup structure
popup.css           Popup presentation
popup.js            Capture, stitching, state, upload, preview, and PDF logic
libs/jspdf.umd.min.js
                    Bundled jsPDF 2.5.1 PDF generator
scripts/validate-extension.mjs
                    Dependency-free manifest and asset validation
```

The project intentionally has no compilation or bundling step. Third-party runtime code is stored locally to comply with Manifest V3's remote-code restrictions.

## Permissions

- `activeTab`: capture and inspect the tab after a user invokes the extension
- `contextMenus`: provide the “Capture with ScreenStitcher” page menu
- `downloads`: save generated PDFs
- `scripting`: inject the full-page scrolling helper on demand
- `storage`: persist settings and accumulated captures locally
- `unlimitedStorage`: support high-resolution screenshot collections

The extension does not request persistent access to every website.

## Development and validation

Node.js is only needed for validation; the extension itself has no npm dependencies.

```sh
npm test
```

The validation command checks JavaScript syntax, parses the manifest, verifies referenced assets, detects duplicate popup IDs, rejects remote popup scripts, and tests the content-script capture/restoration lifecycle. Functional capture testing still requires loading the unpacked extension in a Chromium browser.

## Current limitations

- Browser-protected pages cannot be captured.
- Continuously growing infinite-scroll pages stop after 100 sections rather than running indefinitely.
- Very tall pages are downscaled to Chrome's maximum canvas dimension.
- Fixed elements are retained in the first section and hidden in subsequent sections; complex sites may still produce seams.

## License

No license has been selected yet. Add a license file before distributing or accepting external contributions.
