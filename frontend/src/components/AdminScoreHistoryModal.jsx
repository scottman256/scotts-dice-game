import React, { useEffect, useState } from 'react'
import AdminDialog from './AdminDialog'

const SCORE_COLUMNS = [
  { label: 'Score', ascending: 'lowest', descending: 'highest' },
  { label: 'Played', ascending: 'oldest', descending: 'newest' },
]

export default function AdminScoreHistoryModal({ user, loadScores, onClose }) {
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    loadScores(user.id, { page, sort }).then((data) => {
      if (!active) return
      setResult(data)
      setStatus('ready')
    }).catch((failure) => {
      if (!active) return
      setError(failure?.message || 'Score history could not be loaded.')
      setStatus('error')
    })
    return () => { active = false }
  }, [user.id, loadScores, page, sort, attempt])

  return (
    <AdminDialog title={`${user.name}'s Score History`} onClose={onClose}>
      <p>All stored scores, including older records. Dates show when each score was saved.</p>
      {status === 'loading' && <p role="status">Loading scores…</p>}
      {error && <><p className="admin-inline-error" role="alert">{error}</p><button type="button" className="admin-modal-cancel" onClick={() => setAttempt((value) => value + 1)}>Retry</button></>}
      {status === 'ready' && <p>{result.totalScores === 0 ? 'No scores recorded yet.' : `${result.totalScores} recorded scores`}</p>}
      {result?.totalScores > 0 && (
        <div className="admin-score-history-table" aria-busy={status === 'loading'}>
          <table className="admin-users-table">
            <caption className="visually-hidden">Scores for {user.name}. Activate a column heading to sort; activate it again to reverse the order.</caption>
            <thead><tr>{SCORE_COLUMNS.map((column) => {
              const direction = sort === column.ascending ? 'ascending' : sort === column.descending ? 'descending' : undefined
              const nextDirection = direction === 'descending' ? 'ascending' : 'descending'
              return (
                <th key={column.label} scope="col" aria-sort={direction}>
                  <button type="button" className="admin-column-sort"
                    title={`Sort ${column.label.toLowerCase()} ${nextDirection}`}
                    onClick={() => { setSort(column[nextDirection]); setPage(0) }}>
                    {column.label}
                    <span aria-hidden="true">{direction === 'ascending' ? '↑' : direction === 'descending' ? '↓' : '↕'}</span>
                  </button>
                </th>
              )
            })}</tr></thead>
            <tbody>{status === 'ready' && result.scores.map((score) => <tr key={score.id}>
              <td>{score.score}</td><td><time dateTime={score.completedAt}>{new Date(score.completedAt).toLocaleString()}</time></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {status === 'ready' && result.totalScores > 0 && (
        <nav className="admin-history-pagination" aria-label="Score history pages">
          <button type="button" className="admin-modal-cancel" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {result.page + 1} of {result.totalPages}</span>
          <button type="button" className="admin-modal-cancel" disabled={page + 1 >= result.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </nav>
      )}
      <div className="admin-modal-actions"><button type="button" className="admin-modal-cancel" onClick={onClose}>Close</button></div>
    </AdminDialog>
  )
}
