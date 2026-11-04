// One consistent set of rounded line icons (inline SVG).
const S = (body, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const ICON = {
  heart: S('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor" stroke="none"/>'),
  heartq: S('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M10.4 10a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.8.6-.8 1.1M12 15.4h.01"/>'),
  box: S('<path d="M4 9l8-4 8 4v8l-8 4-8-4z"/><path d="M4 9l8 4 8-4M12 13v8"/>'),
  house: S('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>'),
  arrows: S('<path d="M5 12h14M14 7l5 5-5 5"/>'),
  bubble: S('<circle cx="12" cy="12" r="8"/><path d="M8.5 10a3.5 3.5 0 0 1 3.5-3"/><circle cx="18.5" cy="5" r="1.6"/>'),
  star: S('<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="currentColor" stroke="none"/>'),
  starO: S('<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'),
  map: S('<path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5z"/><path d="M9 4v13M15 6.5v13"/>'),
  pause: S('<path d="M9 5v14M15 5v14"/>'),
  lock: S('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  up: S('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: S('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  sound: S('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  mute: S('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  fish: S('<path d="M3 12c3-4 8-5 12-3l5-3v12l-5-3c-4 2-9 1-12-3z"/><circle cx="8" cy="11" r=".6" fill="currentColor"/>'),
  bite: S('<ellipse cx="12" cy="13" rx="7" ry="5" fill="currentColor" stroke="none"/><ellipse cx="10" cy="11" rx="2" ry="1.2" fill="#fff" opacity=".45" stroke="none"/>'),
  egg: S('<circle cx="9" cy="13" r="3"/><circle cx="15" cy="13" r="3"/><circle cx="12" cy="8" r="3"/>'),
  back: S('<path d="M15 5l-7 7 7 7"/>'),
  go: S('<path d="M5 12h12M12 6l6 6-6 6"/>'),
  fullscreen: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
};
export const KIND_ICON = { lady: 'heart', empty: 'box', home: 'house', maze: 'arrows', machine: 'bubble' };
