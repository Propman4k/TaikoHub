// Board-Raster: Konstanten + pure Zellen-Mathematik (getestet in grid.test.js).
export const TILE = 84
export const CELL = 112
export const PAD = 24
export const DRAG_THRESHOLD = 4

// Pixel -> Rasterzelle (geclamped auf >= 0)
export const cellOf = (v) => Math.max(0, Math.round((v - PAD) / CELL))
// Rasterzelle -> Pixel
export const cellPos = (c) => PAD + c * CELL
// Wieviele Spalten passen in die Breite?
export const gridCols = (width) => Math.max(1, Math.floor((width - PAD) / CELL))
// n-te Kachel (zeilenweise) -> Pixelposition
export const cellXY = (n, cols) => ({ x: cellPos(n % cols), y: cellPos(Math.floor(n / cols)) })
