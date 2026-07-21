// Vitest-Setup: jest-dom-Matcher + jsdom-Luecken stopfen.
import '@testing-library/jest-dom/vitest'

// jsdom kennt Pointer-Capture nicht (AppTile-Drag nutzt es).
if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {}
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
