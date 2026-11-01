# VECTOR — Personal Workspace

A standalone, static personal tools dashboard with a responsive interface, animated Three.js hero, and six browser-based utilities. No Node build or hosting platform required.

## Features

- **Three.js hero** — animated geometric object, orbital rings, particles, and pointer parallax. Graceful CSS fallback if WebGL or the CDN is unavailable.
- **Focus timer** — 25- and 45-minute work sessions, 5-minute break, pause, reset, and progress indicator.
- **Quick notes** — create, edit, delete, and auto-save using your browser's `localStorage`.
- **JSON studio** — format, minify, validate, copy, and edit JSON.
- **Color lab** — generate palettes and copy hex values.
- **Password lab** — cryptographically secure random generation with configurable character sets and length.
- **Unit converter** — length, mass, temperature, SI/IEC digital storage.
- **Keyboard launcher** — `Ctrl+K` or `Cmd+K` to search tools.

## Run locally

For all features to work as intended, serve the folder over HTTP instead of opening `index.html` as a `file://` URL.

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

This is a static website, so upload `index.html`, `style.css`, and `app.js` to any static host.

For GitHub Pages, open **Repository Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save. The site will be published at `https://bemilbandin-ops.github.io/toolsite-threejs/` after GitHub completes the deployment.

## Notes

- Notes are stored locally in your browser and do not sync across devices.
- The Three.js visual uses the pinned ESM build `three@0.180.0` from jsDelivr. An internet connection is required for that 3D enhancement; every utility and the CSS fallback work without loading Three.js.
- Passwords are generated in your browser using `crypto.getRandomValues()` and are not transmitted to a server by this website. Save them in a password manager rather than in browser notes.
- Google Fonts and the Three.js module are the only external frontend assets.
- The site is independent of ChatGPT Sites. It is a recreated standalone version, not an exact source export from the prior Sites deployment.

## Structure

```text
index.html   Page markup and tool widgets
style.css    Design system and responsive layouts
app.js       Tools, local persistence and Three.js animation
```

MIT-style personal use: adjust, remix, and deploy for your own projects.