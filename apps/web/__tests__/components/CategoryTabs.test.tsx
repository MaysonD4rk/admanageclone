import { render, screen, fireEvent } from '@testing-library/react'
import CategoryTabs from '@/components/home/CategoryTabs'

const CATEGORIES = ['All', 'Sale', 'New Year', 'Beauty', 'Health', 'Food']

describe('CategoryTabs', () => {
  it('renders all category buttons', () => {
    render(<CategoryTabs active="All" onChange={jest.fn()} />)
    CATEGORIES.forEach((cat) => {
      expect(screen.getByRole('button', { name: cat })).toBeInTheDocument()
    })
  })

  it('applies active styling to the selected category', () => {
    render(<CategoryTabs active="Beauty" onChange={jest.fn()} />)
    const activeBtn = screen.getByRole('button', { name: 'Beauty' })
    expect(activeBtn).toHaveClass('bg-violet-600')
  })

  it('does not apply active styling to inactive categories', () => {
    render(<CategoryTabs active="All" onChange={jest.fn()} />)
    const inactiveBtn = screen.getByRole('button', { name: 'Sale' })
    expect(inactiveBtn).not.toHaveClass('bg-violet-600')
  })

  it('calls onChange with the clicked category name', () => {
    const onChange = jest.fn()
    render(<CategoryTabs active="All" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Food' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('Food')
  })

  it('calls onChange when clicking the already active category', () => {
    const onChange = jest.fn()
    render(<CategoryTabs active="Sale" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sale' }))

    expect(onChange).toHaveBeenCalledWith('Sale')
  })
})
