import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminScoreHistoryModal from './AdminScoreHistoryModal'

const player = { id: 'player', name: 'Dice Player' }
const entry = { id: 'one', score: 125, completedAt: '2026-10-01T12:00:00Z' }

describe('AdminScoreHistoryModal', () => {
  it('loads newest first, paginates, and sorts both columns in both directions from page one', async () => {
    const user = userEvent.setup()
    const loadScores = jest.fn(async (id, { page }) => ({ scores: [{ ...entry, id: String(page) }], page, totalPages: 2, totalScores: 51 }))
    render(<AdminScoreHistoryModal user={player} loadScores={loadScores} onClose={jest.fn()} />)
    expect(await screen.findByText('125')).toBeVisible()
    expect(screen.getByRole('dialog', { name: "Dice Player's Score History" })).toBeVisible()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Played' })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 2')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText('Page 1 of 2')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (const [label, sort, direction] of [
      ['Score', 'highest', 'descending'], ['Score', 'lowest', 'ascending'],
      ['Played', 'newest', 'descending'], ['Played', 'oldest', 'ascending'],
    ]) {
      await user.click(screen.getByRole('button', { name: label }))
      expect(loadScores).toHaveBeenLastCalledWith('player', { page: 0, sort })
      expect(screen.getByRole('columnheader', { name: label })).toHaveAttribute('aria-sort', direction)
      expect(document.querySelectorAll('th[aria-sort]')).toHaveLength(1)
      expect(await screen.findByText('Page 1 of 2')).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(loadScores).toHaveBeenLastCalledWith('player', { page: 1, sort })
    }
    expect(document.querySelector('time')).toHaveAttribute('dateTime', entry.completedAt)
  })

  it('shows loading and failure states, retries, and closes via Escape', async () => {
    const user = userEvent.setup()
    let reject
    const loadScores = jest.fn().mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail }))
      .mockResolvedValue({ scores: [], page: 0, totalPages: 0, totalScores: 0 })
    const onClose = jest.fn()
    render(<AdminScoreHistoryModal user={player} loadScores={loadScores} onClose={onClose} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading scores')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await act(async () => reject({}))
    expect(screen.getByRole('alert')).toHaveTextContent('Score history could not be loaded.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No scores recorded yet.')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Score history pages' })).not.toBeInTheDocument()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('ignores stale results and failures after sorting or closing', async () => {
    const user = userEvent.setup()
    let resolveOld, rejectOld
    const loadScores = jest.fn().mockResolvedValueOnce({ scores: [entry], page: 0, totalPages: 1, totalScores: 1 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject }))
      .mockResolvedValue({ scores: [], page: 0, totalPages: 0, totalScores: 0 })
    const { unmount } = render(<AdminScoreHistoryModal user={player} loadScores={loadScores} onClose={jest.fn()} />)
    await screen.findByText('125')
    await user.click(screen.getByRole('button', { name: 'Score' }))
    await user.click(screen.getByRole('button', { name: 'Played' }))
    await act(async () => resolveOld({ scores: [entry], page: 0, totalPages: 1, totalScores: 1 }))
    expect(screen.queryByText('125')).not.toBeInTheDocument()
    unmount()
    await act(async () => rejectOld(new Error('Late error')))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps keyboard focus on a sort header while loading and supports Enter and Space', async () => {
    const user = userEvent.setup()
    let finish
    const result = { scores: [entry], page: 0, totalPages: 1, totalScores: 1 }
    const loadScores = jest.fn().mockResolvedValueOnce(result)
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
      .mockResolvedValue(result)
    render(<AdminScoreHistoryModal user={player} loadScores={loadScores} onClose={jest.fn()} />)
    await screen.findByText('125')
    const scoreHeader = screen.getByRole('button', { name: 'Score' })
    scoreHeader.focus()
    await user.keyboard('{Enter}')
    expect(loadScores).toHaveBeenLastCalledWith('player', { page: 0, sort: 'highest' })
    expect(screen.getByRole('status')).toHaveTextContent('Loading scores')
    expect(scoreHeader).toHaveFocus()
    expect(screen.queryByText('125')).not.toBeInTheDocument()
    await act(async () => finish(result))
    expect(scoreHeader).toHaveFocus()
    await user.keyboard(' ')
    expect(loadScores).toHaveBeenLastCalledWith('player', { page: 0, sort: 'lowest' })
    expect(scoreHeader).toHaveFocus()
  })

  it('keeps the latest sort when rapid switches produce out-of-order responses and errors', async () => {
    const user = userEvent.setup()
    const result = { scores: [entry], page: 0, totalPages: 1, totalScores: 1 }
    const requests = []
    const loadScores = jest.fn().mockResolvedValueOnce(result)
      .mockImplementation((id, options) => new Promise((resolve, reject) => {
        requests.push({ ...options, resolve, reject })
      }))
    render(<AdminScoreHistoryModal user={player} loadScores={loadScores} onClose={jest.fn()} />)
    await screen.findByText('125')

    for (const label of ['Played', 'Played', 'Score', 'Score', 'Played', 'Played', 'Score', 'Score']) {
      await user.click(screen.getByRole('button', { name: label }))
    }
    expect(requests.map(({ sort }) => sort)).toEqual([
      'oldest', 'newest', 'highest', 'lowest', 'newest', 'oldest', 'highest', 'lowest',
    ])
    await act(async () => requests.at(-1).resolve({ ...result, scores: [{ ...entry, score: 25 }] }))

    for (const [index, request] of requests.slice(0, -1).reverse().entries()) {
      await act(async () => {
        if (index % 2 === 0) request.reject(new Error('Choose newest, highest, or lowest.'))
        else request.resolve({ ...result, scores: [{ ...entry, score: 999 }] })
      })
      expect(screen.getByText('25')).toBeVisible()
      expect(screen.queryByText('999')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Score' })).toHaveAttribute('aria-sort', 'ascending')
    }
  })
})
