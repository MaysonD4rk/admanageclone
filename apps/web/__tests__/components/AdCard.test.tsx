import { render, screen, fireEvent } from '@testing-library/react'
import AdCard from '@/components/home/AdCard'
import type { Ad } from '@/lib/types'

const mockAd: Ad = {
  id: 'ad_001',
  title: 'Summer Glow Ad',
  imageUrl: 'https://picsum.photos/seed/test/400/500',
  category: 'Beauty',
}

describe('AdCard', () => {
  it('renders the ad title', () => {
    render(<AdCard ad={mockAd} onRecreate={jest.fn()} />)
    expect(screen.getByText('Summer Glow Ad')).toBeInTheDocument()
  })

  it('renders the category badge', () => {
    render(<AdCard ad={mockAd} onRecreate={jest.fn()} />)
    expect(screen.getByText('Beauty')).toBeInTheDocument()
  })

  it('calls onRecreate with the ad when the Recreate button is clicked', () => {
    const onRecreate = jest.fn()
    render(<AdCard ad={mockAd} onRecreate={onRecreate} />)

    fireEvent.click(screen.getByRole('button', { name: /recreate/i }))

    expect(onRecreate).toHaveBeenCalledTimes(1)
    expect(onRecreate).toHaveBeenCalledWith(mockAd)
  })

  it('renders an image with the correct src', () => {
    render(<AdCard ad={mockAd} onRecreate={jest.fn()} />)
    const img = screen.getByRole('img', { name: mockAd.title })
    expect(img).toBeInTheDocument()
  })
})
