import { useCallback, useEffect, useState } from 'react'
import { operations } from '../api/operations'
import { getApiErrorMessage } from '../utils/apiError'

const config = { paid: ['Paid Engagements', 'No paid engagements have been recorded.', 'adminPaid'], payments: ['External Payment Records', 'No external payments have been recorded.', 'adminPayments'], issues: ['Issues', 'No issues have been reported.', 'adminIssues'] }
export default function AdminOperations({ kind }) {
  const [rows, setRows] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(0)
  const [title, empty, method] = config[kind]
  const load = useCallback(() => operations[method]().then(setRows).catch(e => setError(getApiErrorMessage(e, `Could not load ${title.toLowerCase()}.`))), [method, title])
  useEffect(() => { load() }, [load])
  const verify = async id => { setBusy(id); try { await operations.verifyPayment(id); load() } catch (e) { setError(getApiErrorMessage(e, 'Could not verify payment.')) } finally { setBusy(0) } }
  return <main className="page"><h1>{title}</h1>{kind === 'payments' && <p className="muted">Payment made outside Bharat Bazaar. Records do not mean the platform processed a payment.</p>}{error && <p role="alert">{error}</p>}{!rows ? <p>Loading…</p> : rows.length === 0 ? <p className="empty-state">{empty}</p> : <div className="card-grid">{rows.map(row => <article className="service-card" key={row.id}><h2>{row.title || `${row.category || row.method} record`}</h2>{kind === 'paid' && <><p>Status: {row.status}</p><p>Rate: {row.agreed_rate} ({row.rate_type})</p></>}{kind === 'payments' && <><p>Amount: {row.amount}</p><p>Method: {row.method}</p><p>Status: {row.status}</p>{row.status !== 'verified' && <button onClick={() => verify(row.id)} disabled={busy === row.id}>{busy === row.id ? 'Verifying…' : 'Mark verified'}</button>}</>}{kind === 'issues' && <><p>{row.description}</p><p>Status: {row.status}</p></>}</article>)}</div>}</main>
}
