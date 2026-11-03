import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchableSelect from '@/components/SearchableSelect'

const options = [
  { value: '1', label: 'Acme Ltd' },
  { value: '2', label: 'Beta UAB' },
  { value: '3', label: 'Acacia MB' },
]

describe('SearchableSelect', () => {
  const setup = (value = '', extra: Partial<ComponentProps<typeof SearchableSelect>> = {}) => {
    const onChange = jest.fn()
    render(<SearchableSelect value={value} onChange={onChange} options={options} {...extra} />)
    return { onChange }
  }

  it('shows the "All" label when nothing is selected', () => {
    setup()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
  })

  it('shows a custom all-label', () => {
    setup('', { allLabel: 'All clients' })
    expect(screen.getByRole('button', { name: 'All clients' })).toBeInTheDocument()
  })

  it('shows the label of the selected option', () => {
    setup('2')
    expect(screen.getByRole('button', { name: 'Beta UAB' })).toBeInTheDocument()
  })

  it('keeps the list closed until the trigger is clicked', () => {
    setup()
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument()
    expect(screen.queryByText('Acme Ltd')).not.toBeInTheDocument()
  })

  it('opens a list with every option', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument()
    for (const o of options) expect(screen.getByRole('button', { name: o.label })).toBeInTheDocument()
  })

  it('filters options case-insensitively as the user types', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await userEvent.type(screen.getByPlaceholderText('Search…'), 'AC')

    expect(screen.getByRole('button', { name: 'Acme Ltd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acacia MB' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Beta UAB' })).not.toBeInTheDocument()
  })

  it('shows "No matches" when nothing fits the query', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await userEvent.type(screen.getByPlaceholderText('Search…'), 'zzz')
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('reports the chosen value and closes the list', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await userEvent.click(screen.getByRole('button', { name: 'Beta UAB' }))

    expect(onChange).toHaveBeenCalledWith('2')
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument()
  })

  it('clears the selection by choosing the all-entry', async () => {
    const { onChange } = setup('2')
    await userEvent.click(screen.getByRole('button', { name: 'Beta UAB' }))
    // the trigger and the highlighted option share a name; the all-entry is unique
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('closes when the user clicks outside', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument()

    await userEvent.click(document.body)
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument()
  })

  it('resets the query each time it reopens', async () => {
    setup()
    const trigger = screen.getByRole('button', { name: 'All' })
    await userEvent.click(trigger)
    await userEvent.type(screen.getByPlaceholderText('Search…'), 'acme')
    await userEvent.click(trigger)
    await userEvent.click(trigger)
    expect(screen.getByPlaceholderText('Search…')).toHaveValue('')
  })

  it.todo('closes on Escape (not supported by the component today)')
})
