import { describe, it, expect } from 'vitest'
import { cellOf, cellPos, gridCols, cellXY, CELL, PAD } from './grid.js'

describe('grid', () => {
  it('cellPos und cellOf sind invers', () => {
    for (const c of [0, 1, 2, 7]) expect(cellOf(cellPos(c))).toBe(c)
  })
  it('cellOf rastet auf die naechste Zelle', () => {
    expect(cellOf(PAD)).toBe(0)
    expect(cellOf(PAD + CELL * 0.4)).toBe(0)
    expect(cellOf(PAD + CELL * 0.6)).toBe(1)
  })
  it('cellOf clamped negative Positionen auf 0', () => {
    expect(cellOf(-500)).toBe(0)
  })
  it('gridCols: mindestens 1 Spalte, sonst Breite/CELL', () => {
    expect(gridCols(0)).toBe(1)
    expect(gridCols(PAD + CELL * 3 + 10)).toBe(3)
  })
  it('cellXY laeuft zeilenweise durch das Raster', () => {
    expect(cellXY(0, 3)).toEqual({ x: cellPos(0), y: cellPos(0) })
    expect(cellXY(2, 3)).toEqual({ x: cellPos(2), y: cellPos(0) })
    expect(cellXY(3, 3)).toEqual({ x: cellPos(0), y: cellPos(1) })
  })
})
