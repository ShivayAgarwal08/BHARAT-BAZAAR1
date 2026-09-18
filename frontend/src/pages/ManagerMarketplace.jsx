import { useCallback, useEffect, useState } from 'react'
import { applyForManager, getApplications, listRequests, myRequests, selectIntern } from '../api/manager'
import { getAllProducts } from '../api/product'
import { MdArrowForward, MdPerson } from 'react-icons/md'

export default function ManagerMarketplace() {
  const [requests, setRequests] = useState([])
  const [products, setProducts] = useState([])
  const [ownRequests, setOwnRequests] = useState([])
  const [applicationsByRequest, setApplicationsByRequest] = useState({})
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}')
  const isIntern = user.role === 'intern'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [requestResponse, productResponse, ownRequestResponse] = await Promise.all([
        listRequests(),
        getAllProducts(),
        isIntern ? Promise.resolve({ data: [] }) : myRequests(),
      ])
      setRequests(requestResponse.data)
      setProducts(productResponse.data)
      setOwnRequests(ownRequestResponse.data)

      if (!isIntern) {
        const entries = await Promise.all(ownRequestResponse.data.map(async (request) => [
          request.id,
          (await getApplications(request.id)).data,
        ]))
        setApplicationsByRequest(Object.fromEntries(entries))
      }
    } catch (error) {
      console.error('Failed to fetch manager opportunities', error)
    } finally {
      setLoading(false)
    }
  }, [isIntern])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApply = async (requestId) => {
    const coverNote = prompt('Tell the artisan briefly how you can help:')
    if (!coverNote) return

    try {
      await applyForManager({ request_id: requestId, cover_note: coverNote, college: '', skills: '' })
      alert('Application sent.')
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not send your application.')
    }
  }

  const handleSelect = async (applicationId) => {
    try {
      await selectIntern(applicationId)
      await loadData()
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not select this intern.')
    }
  }

  const productFor = (request) => products.find((product) => product.id === request.product_id)

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">{isIntern ? 'Opportunities' : 'Find a Manager'}</h1>
        <p className="page-subtitle">
          {isIntern
            ? 'Browse open artisan requests and apply to help with a product.'
            : 'Review your manager requests, applications, and selected interns.'}
        </p>
      </div>

      {isIntern ? (
        loading ? <div style={{ textAlign: 'center', padding: 80 }}>Loading opportunities...</div> : requests.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No open opportunities</h3>
            <p style={{ color: '#5a4f7a' }}>Check back when artisans post manager requests.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {requests.map((request) => {
              const product = productFor(request)
              return (
                <div key={request.id} className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3f0ff', display: 'grid', placeItems: 'center', color: '#6c3fcf' }}><MdPerson /></div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{product?.title || 'Product details unavailable'}</div>
                      <div style={{ fontSize: 12, color: '#9488b8' }}>Artisan request #{request.id}</div>
                    </div>
                  </div>
                  <p style={{ color: '#5a4f7a', lineHeight: 1.5, minHeight: 48 }}>{request.description || 'No request details provided.'}</p>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => handleApply(request.id)}>
                    Apply to Help <MdArrowForward />
                  </button>
                </div>
              )
            })}
          </div>
        )
      ) : (
        loading ? <div style={{ textAlign: 'center', padding: 80 }}>Loading your requests...</div> : ownRequests.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No manager requests yet</h3>
            <p style={{ color: '#5a4f7a' }}>Create a manager request from one of your product listings when you need help.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {ownRequests.map((request) => {
              const applications = applicationsByRequest[request.id] || []
              return (
                <section key={request.id} className="card" style={{ padding: 24 }}>
                  <h2 style={{ fontSize: 18, marginBottom: 6 }}>{productFor(request)?.title || `Request #${request.id}`}</h2>
                  <p style={{ color: '#5a4f7a', marginBottom: 16 }}>{request.description || 'No request details provided.'}</p>
                  <div style={{ fontSize: 13, color: '#9488b8', marginBottom: 12 }}>Status: {request.status}</div>
                  {applications.length === 0 ? <p style={{ color: '#9488b8' }}>No applications yet.</p> : applications.map((application) => (
                    <div key={application.id} style={{ borderTop: '1px solid var(--border)', padding: '14px 0', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>Intern #{application.intern_id}</div>
                        <div style={{ color: '#5a4f7a', fontSize: 14 }}>{application.cover_note || 'No cover note provided.'}</div>
                      </div>
                      {application.status === 'pending' ? <button className="btn btn-primary btn-sm" onClick={() => handleSelect(application.id)}>Select</button> : <span className="tag">{application.status}</span>}
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
