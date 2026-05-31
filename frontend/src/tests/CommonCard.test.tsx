import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CommonCard from '../components/common/CommonCard'

describe('CommonCard', () => {
  it('renders title and children', () => {
    render(
      <CommonCard title="Test Title">
        <p>Child Content</p>
      </CommonCard>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('renders badge with badgeColor', () => {
    render(
      <CommonCard title="Card" badge="ACTIVE" badgeColor="bg-green-500/10 text-green-400 border-green-500/20">
        <p>Content</p>
      </CommonCard>
    )
    const badge = screen.getByText('ACTIVE')
    expect(badge).toBeInTheDocument()
  })

  it('calls onView when clicked', () => {
    const onView = vi.fn()
    render(
      <CommonCard title="Card" onView={onView}>
        <p>Content</p>
      </CommonCard>
    )
    fireEvent.click(screen.getByText('Detalles'))
    expect(onView).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(
      <CommonCard title="Card" onEdit={onEdit}>
        <p>Content</p>
      </CommonCard>
    )
    fireEvent.click(screen.getByLabelText('Editar Card'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(
      <CommonCard title="Card" onDelete={onDelete}>
        <p>Content</p>
      </CommonCard>
    )
    fireEvent.click(screen.getByLabelText('Eliminar Card'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('does NOT show edit/delete buttons when handlers are null', () => {
    render(
      <CommonCard title="Card">
        <p>Content</p>
      </CommonCard>
    )
    expect(screen.queryByLabelText('Editar Card')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Eliminar Card')).not.toBeInTheDocument()
  })
})
