// src/test/lib/photos.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Vercel Blob mock ────────────────────────────────────────────────────────
const { mockPut, mockDel } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockDel: vi.fn(),
}))
vi.mock('@vercel/blob', () => ({ put: mockPut, del: mockDel }))

// ── fs mock ──────────────────────────────────────────────────────────────────
const {
  mockMkdirSync,
  mockWriteFileSync,
  mockExistsSync,
  mockUnlinkSync,
  mockReadFileSync,
} = vi.hoisted(() => ({
  mockMkdirSync:     vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockExistsSync:    vi.fn().mockReturnValue(true),
  mockUnlinkSync:    vi.fn(),
  mockReadFileSync:  vi.fn().mockReturnValue(Buffer.from('img-bytes')),
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

// ── helpers ─────────────────────────────────────────────────────────────────
function makeFile(name = 'photo.jpg', type = 'image/jpeg', bytes = 'img') {
  return new File([bytes], name, { type })
}

// ── tests ───────────────────────────────────────────────────────────────────
describe('photos.ts — Vercel Blob path (BLOB_READ_WRITE_TOKEN set)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(Buffer.from('img-bytes'))
    process.env.BLOB_READ_WRITE_TOKEN = 'token-abc'
  })
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN
  })

  it('savePhoto calls put() and returns blob url', async () => {
    mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel-storage.com/survey1/abc.jpg' })

    const { savePhoto } = await import('@/lib/photos')
    const url = await savePhoto('survey1', makeFile())

    expect(mockPut).toHaveBeenCalledOnce()
    const [blobPath, fileArg, opts] = mockPut.mock.calls[0]
    expect(blobPath).toMatch(/^survey1\//)
    expect(fileArg).toBeInstanceOf(File)
    expect(opts).toMatchObject({ access: 'public' })
    expect(url).toBe('https://blob.vercel-storage.com/survey1/abc.jpg')
  })

  it('deletePhoto calls del() with the blob url', async () => {
    mockDel.mockResolvedValueOnce(undefined)

    const { deletePhoto } = await import('@/lib/photos')
    await deletePhoto('https://blob.vercel-storage.com/survey1/abc.jpg')

    expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/survey1/abc.jpg')
    expect(mockUnlinkSync).not.toHaveBeenCalled()
  })

  it('getPhotoDataUri fetches blob url and returns data URI', async () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff])
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeJpeg.buffer),
    } as unknown as Response)

    const { getPhotoDataUri } = await import('@/lib/photos')
    const uri = await getPhotoDataUri('https://blob.vercel-storage.com/s/photo.jpg')

    expect(global.fetch).toHaveBeenCalledWith('https://blob.vercel-storage.com/s/photo.jpg')
    expect(uri).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('getPhotoDataUri returns null on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false } as unknown as Response)

    const { getPhotoDataUri } = await import('@/lib/photos')
    const uri = await getPhotoDataUri('https://blob.vercel-storage.com/s/missing.jpg')

    expect(uri).toBeNull()
  })
})

describe('photos.ts — Filesystem path (no BLOB_READ_WRITE_TOKEN)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(Buffer.from('img-bytes'))
    delete process.env.BLOB_READ_WRITE_TOKEN
  })

  it('savePhoto writes to disk and returns /uploads/ url', async () => {
    const { savePhoto } = await import('@/lib/photos')
    const url = await savePhoto('survey1', makeFile())

    expect(mockPut).not.toHaveBeenCalled()
    expect(mockWriteFileSync).toHaveBeenCalledOnce()
    expect(url).toMatch(/^\/uploads\/photos\/survey1\//)
  })

  it('deletePhoto calls unlinkSync for a /uploads/ url', async () => {
    const { deletePhoto } = await import('@/lib/photos')
    await deletePhoto('/uploads/photos/survey1/abc.jpg')

    expect(mockDel).not.toHaveBeenCalled()
    expect(mockUnlinkSync).toHaveBeenCalledOnce()
  })

  it('deletePhoto throws for a path outside /uploads/', async () => {
    const { deletePhoto } = await import('@/lib/photos')
    await expect(deletePhoto('/etc/passwd')).rejects.toThrow('Invalid photo path')
  })

  it('getPhotoDataUri reads file and returns data URI', async () => {
    const { getPhotoDataUri } = await import('@/lib/photos')
    const uri = await getPhotoDataUri('/uploads/photos/survey1/abc.jpg')

    expect(mockReadFileSync).toHaveBeenCalledOnce()
    expect(uri).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('getPhotoDataUri returns null on read error', async () => {
    mockReadFileSync.mockImplementationOnce(() => { throw new Error('ENOENT') })

    const { getPhotoDataUri } = await import('@/lib/photos')
    const uri = await getPhotoDataUri('/uploads/photos/survey1/missing.jpg')

    expect(uri).toBeNull()
  })

  it('getPhotoDataUri throws for a path outside /uploads/', async () => {
    const { getPhotoDataUri } = await import('@/lib/photos')
    await expect(getPhotoDataUri('/etc/passwd')).rejects.toThrow('Invalid photo path')
  })
})
