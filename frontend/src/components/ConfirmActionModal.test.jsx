import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import ConfirmActionModal from './ConfirmActionModal'

describe('ConfirmActionModal', () => {
  it('renders a non-destructive busy confirmation state', () => {
    render(
      <ConfirmActionModal
        title="Apply update?"
        description="Save this administrative change."
        confirmLabel="Apply"
        busyLabel="Applying…"
        isBusy
        danger={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )

    expect(screen.getByText('✓')).toHaveClass('admin-modal-mark')
    expect(screen.getByText('✓')).not.toHaveClass('admin-modal-mark-danger')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Applying…' })).toHaveClass('admin-primary-button')
  })
})
