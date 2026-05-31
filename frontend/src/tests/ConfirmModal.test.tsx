import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ConfirmModal from '../components/common/ConfirmModal'

describe('ConfirmModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmModal isOpen={false} title="Modal" message="Content" onConfirm={() => {}} onClose={() => {}} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title and message when open', () => {
    render(
      <ConfirmModal isOpen={true} title="Delete?" message="Are you sure?" onConfirm={() => {}} onClose={() => {}} />
    )
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal isOpen={true} title="Test" message="Msg" onConfirm={onConfirm} onClose={() => {}} />
    )
    fireEvent.click(screen.getByText('Confirmar'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn()
    render(
      <ConfirmModal isOpen={true} title="Test" message="Msg" onConfirm={() => {}} onClose={onClose} />
    )
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isLoading is true', () => {
    render(
      <ConfirmModal isOpen={true} title="Test" message="Msg" onConfirm={() => {}} onClose={() => {}} isLoading={true} />
    )
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })

  it('renders with custom confirmText and cancelText', () => {
    render(
      <ConfirmModal isOpen={true} title="Test" message="Msg" onConfirm={() => {}} onClose={() => {}} confirmText="Sí" cancelText="No" />
    )
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })
})
