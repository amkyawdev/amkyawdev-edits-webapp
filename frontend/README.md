# amkyawdev-edits Frontend

A modern video editing web application with a sleek dark theme UI.

## Features

- **Video Upload**: Drag & drop or browse to upload videos
- **Video Player**: Custom video player with play/pause controls
- **Timeline**: Visual timeline with scrubbing support
- **Trim**: Cut video segments with start/end markers
- **Filters**: Apply various filters (brightness, contrast, saturation, grayscale, sepia, blur)
- **Export**: Download edited videos

## Tech Stack

- Vanilla JavaScript (ES6+)
- CSS3 with custom properties
- HTML5 Video API

## Getting Started

### Local Development

1. Open `index.html` in a browser, or
2. Use a local server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

### Configuration

Update the `API_BASE` URL in `app.js` to point to your backend:

```javascript
const CONFIG = {
    API_BASE: 'https://your-vercel-backend.vercel.app', // or 'http://localhost:8000' for local
    // ...
};
```

## Project Structure

```
frontend/
├── index.html    # Main HTML file
├── styles.css     # All styles
├── app.js         # Application logic
└── README.md      # This file
```

## Keyboard Shortcuts

- `Space` - Play/Pause
- `←` - Skip back 5 seconds
- `→` - Skip forward 5 seconds

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Backend

This frontend works with the amkyawdev-edits Backend API. Deploy the backend to Vercel:

```bash
cd ../backend
vercel --prod
```

## License

MIT
