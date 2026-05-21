// src/test/lib/photos.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockMkdirSync,
  mockWriteFileSync,
  mockExistsSync,
  mockUnlinkSync,
  mockReadFileSync,
} = vi.hoisted(() => ({
  mockMkdirSync:     vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockExistsSync:    vi.fn(),
  mockUnlinkSync:    vi.fn(),
  mockReadFileSync:  vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    mkdirSync:     mockMkdirSync,
    writeFileSync: mockWriteFileSync,
    existsSync:    mockExistsSync,
    unlinkSync:    mockUnlinkSync,
    readFileSync:  mockReadFileSync,
  },
  mkdirSync:     mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  existsSync:    mockExistsSync,
  unlinkSync:    mockUnlinkSync,
  readFileSync:  mockReadFileSync,
}))

import { savePhoto, deletePhoto, getPhotoBuffer } from '@/lib/photos'

beforeEach(() => {
  vi.clearAllMocks()
  mockExistsSync.mockReturnValue(true)
  mockReadFileSync.mockReturnValue(Buffer.from('img-data'))
})

describe('savePhoto', () => {
  it('saves file and returns URL under /uploads/photos/[surveyId]/', async () => {
    const file = new File(['img'], 'test.jpg', { type: 'image/jpeg' })
    const url = await savePhoto('survey-abc', file)
    expect(url).toMatch(/^\/uploads\/photos\/survey-abc\//)
    expect(url).toMatch(/\.jpg$/)
    expect(mockWriteFileSync).toHaveBeenCalledOnce()
  })

  it('creates the survey subdirectory', async () => {
    const file = new File(['img'], 'test.png', { type: 'image/png' })
    await savePhoto('survey-abc', file)
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('survey-abc'),
      { recursive: true }
    )
  })
})

describe('deletePhoto', () => {
  it('unlinks file when it exists', () => {
    mockExistsSync.mockReturnValue(true)
    deletePhoto('/uploads/photos/survey-abc/x.jpg')
    expect(mockUnlinkSync).toHaveBeenCalledOnce()
  })

  it('does not throw when file does not exist', () => {
    mockExistsSync.mockReturnValue(false)
    expect(() => deletePhoto('/uploads/photos/survey-abc/x.jpg')).not.toThrow()
    expect(mockUnlinkSync).not.toHaveBeenCalled()
  })
})

describe('getPhotoBuffer', () => {
  it('returns buffer from public path', () => {
    const buf = getPhotoBuffer('/uploads/photos/survey-abc/x.jpg')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(mockReadFileSync).toHaveBeenCalledOnce()
  })
})
