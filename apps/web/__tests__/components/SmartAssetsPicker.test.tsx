import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SmartAssetsPicker from '@/components/smart-assets/SmartAssetsPicker'

const MOCK_ASSETS = [
  { id: 'sa_1', title: 'Asset 1', imageUrl: 'https://picsum.photos/seed/a1/400/400', createdAt: '2025-01-01' },
  { id: 'sa_2', title: 'Asset 2', imageUrl: 'https://picsum.photos/seed/a2/400/400', createdAt: '2025-01-02' },
]

function mockFetch(data: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => data,
  } as Response)
}

afterEach(() => {
  jest.restoreAllMocks()
})

/** Helper: render and wait until loading spinner disappears */
async function renderAndWait(props: Parameters<typeof SmartAssetsPicker>[0]) {
  await act(async () => {
    render(<SmartAssetsPicker {...props} />)
  })
  // Wait for loading state to resolve
  await waitFor(() =>
    expect(screen.queryByText(/loading smart assets/i)).not.toBeInTheDocument(),
  )
}

describe('SmartAssetsPicker', () => {
  it('shows a loading indicator initially', () => {
    // Use a fetch that never resolves so we stay in loading state
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}))
    render(<SmartAssetsPicker onSelect={jest.fn()} />)
    expect(screen.getByText(/loading smart assets/i)).toBeInTheDocument()
  })

  it('renders asset thumbnails after loading', async () => {
    mockFetch(MOCK_ASSETS)
    await renderAndWait({ onSelect: jest.fn() })

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(MOCK_ASSETS.length)
  })

  it('shows empty state when no Smart Assets exist', async () => {
    mockFetch([])
    await renderAndWait({ onSelect: jest.fn() })

    expect(screen.getByText(/no smart assets saved yet/i)).toBeInTheDocument()
  })

  it('calls onSelect with the image URL when an asset is clicked', async () => {
    mockFetch(MOCK_ASSETS)
    const onSelect = jest.fn()
    await renderAndWait({ onSelect })

    const buttons = await waitFor(() => {
      const btns = screen.getAllByRole('button')
      expect(btns.length).toBeGreaterThan(0)
      return btns
    })

    fireEvent.click(buttons[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(MOCK_ASSETS[0].imageUrl)
  })

  it('shows a ring on assets that are already selected', async () => {
    mockFetch(MOCK_ASSETS)
    await renderAndWait({
      onSelect: jest.fn(),
      selectedUrls: [MOCK_ASSETS[0].imageUrl],
    })

    const buttons = screen.getAllByRole('button')
    expect(buttons[0].className).toContain('ring')
    expect(buttons[1].className).not.toContain('ring')
  })

  it('fetches from /api/smart-assets on mount', async () => {
    mockFetch(MOCK_ASSETS)
    await renderAndWait({ onSelect: jest.fn() })

    expect(global.fetch).toHaveBeenCalledWith('/api/smart-assets')
  })
})
