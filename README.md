# ScreenStitcher

A powerful Chrome extension for capturing screenshots and converting them to PDF documents. ScreenStitcher allows you to capture individual screenshots or accumulate multiple screenshots to create comprehensive PDF collections.

## Features

### 📸 Screenshot Capture

- **Visible Area Capture**: Capture the currently visible portion of any webpage
- **Full Page Capture**: Automatically scroll and capture entire web pages
- **High-Quality Screenshots**: Uses html2canvas for crisp, high-resolution captures
- **Smart Sticky Element Handling**: Automatically hides sticky elements during full-page captures

### 📄 PDF Generation

- **Single Screenshot PDF**: Download individual screenshots as PDF
- **Multi-Screenshot PDF**: Combine multiple screenshots into a single PDF document
- **Automatic Page Sizing**: Intelligently adjusts PDF page size based on content
- **Custom Titles & Descriptions**: Add metadata to each screenshot

### 🎛️ Advanced Modes

- **Accumulate Mode**: Collect multiple screenshots before downloading
- **Custom Title & Description**: Add personalized titles and descriptions to screenshots
- **Page Numbering**: Automatic page numbering for organized collections
- **Local File Upload**: Upload and include local images in your collections

### 🖼️ Image Management

- **Preview Gallery**: Visual preview of all captured screenshots
- **Individual Management**: View, delete, or manage individual screenshots
- **Drag & Drop Upload**: Easy file upload with drag-and-drop support
- **Multiple Format Support**: Supports PNG, JPG, and JPEG files

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the ScreenStitcher folder
5. The extension will appear in your Chrome toolbar

### Permissions

The extension requires the following permissions:

- `activeTab`: To capture screenshots of the current tab
- `storage`: To save screenshot data locally
- `downloads`: To download generated PDF files
- `scripting`: To inject capture scripts into web pages
- `host_permissions`: To work on all websites

## Usage

### Basic Screenshot Capture

1. Navigate to any webpage you want to capture
2. Click the ScreenStitcher extension icon in your toolbar
3. Click "📸 Capture" to take a screenshot of the visible area
4. The screenshot will be automatically downloaded as a PDF

### Full Page Capture

1. Enable "Full Page Screenshot" toggle
2. Click "📸 Capture" to capture the entire webpage
3. The extension will automatically scroll and capture the full page

### Accumulate Mode

1. Enable "Accumulate Mode" toggle
2. Capture multiple screenshots using the "📸 Capture" button
3. Each screenshot will be added to your collection
4. Click "📁 Download" to download all screenshots as a single PDF

### Custom Titles and Descriptions

1. Enable "Custom Title & Description" toggle
2. Enter a title and description for your screenshot
3. The page number will be automatically incremented
4. Capture your screenshot with the custom metadata

### Upload Local Images

1. Enable both "Accumulate Mode" and "Upload from Local" toggles
2. Drag and drop image files onto the upload area or click to browse
3. Uploaded images will be added to your collection with metadata
4. Download all images as a single PDF

## File Structure

```
ScreenStitcher/
├── manifest.json          # Extension manifest
├── popup.html            # Main popup interface
├── popup.js              # Main application logic
├── popup.css             # Styling for the popup
├── content.js            # Content script for page interaction
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── libs/                 # Third-party libraries
    ├── html2canvas.min.js
    ├── jspdf.umd.min.js
    └── pdfobject.min.js
```

## Technical Details

### Dependencies

- **html2canvas**: For high-quality screenshot capture
- **jsPDF**: For PDF generation and manipulation
- **PDFObject**: For PDF handling utilities

### Browser Compatibility

- Chrome (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

### Storage

- Uses Chrome's local storage API
- Screenshots are stored as base64 data URLs
- Settings and preferences are persisted across sessions

## Development

### Prerequisites

- Chrome browser with developer mode enabled
- Basic understanding of Chrome extension development

### Building

No build process required - the extension runs directly from source files.

### Testing

1. Load the extension in developer mode
2. Test on various websites with different layouts
3. Verify PDF generation and download functionality
4. Test with different image formats and sizes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please check the license file for specific terms.

## Support

For issues, feature requests, or questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

## Changelog

### Version 1.0

- Initial release
- Basic screenshot capture functionality
- PDF generation
- Accumulate mode
- Full page capture
- Local file upload
- Custom titles and descriptions
- Preview gallery
- Drag and drop support

---

**ScreenStitcher** - Capture, organize, and convert your web content into beautiful PDF documents.
