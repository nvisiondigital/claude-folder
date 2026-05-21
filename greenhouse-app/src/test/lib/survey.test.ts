// src/test/lib/survey.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { PHOTO_SECTIONS, getSlotDef } from '@/lib/survey'

describe('PHOTO_SECTIONS', () => {
  it('has 4 sections', () => {
    expect(PHOTO_SECTIONS).toHaveLength(4)
  })

  it('has exactly 23 photo slots in total', () => {
    const total = PHOTO_SECTIONS.flatMap(s => s.slots).length
    expect(total).toBe(23)
  })

  it('has contiguous slot indices 1–23', () => {
    const indices = PHOTO_SECTIONS.flatMap(s => s.slots).map(s => s.index)
    expect(indices).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23])
  })
})

describe('getSlotDef', () => {
  it('returns correct slot for index 1', () => {
    const slot = getSlotDef(1)
    expect(slot?.name).toBe('Parkeergelegenheid')
  })

  it('returns null for out-of-range indices', () => {
    expect(getSlotDef(0)).toBeNull()
    expect(getSlotDef(24)).toBeNull()
  })
})
