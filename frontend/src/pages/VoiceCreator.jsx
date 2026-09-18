import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeProduct } from '../api/ai'
import { createProduct } from '../api/product'
import { MdMic, MdStop, MdAutoAwesome, MdCloudUpload, MdArrowForward, MdPhotoCamera, MdVideocam } from 'react-icons/md'

export default function VoiceCreator() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}')
  
  useEffect(() => {
    if (user.role === 'intern') {
      navigate('/dashboard')
    }
  }, [user.role, navigate])

  const [step, setStep] = useState(1) // 1: Input, 2: Analysis result
  const [description, setDescription] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const recognitionRef = useRef(null)

  const startRecording = () => {
    setIsRecording(true)
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Please type instead.")
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'hi-IN' // Default to Hindi, can be dynamic

    recognitionRef.current.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setDescription(transcript)
    }

    recognitionRef.current.start()
  }

  const stopRecording = () => {
    setIsRecording(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const handleAnalyze = async () => {
    if (!description.trim()) return
    setAnalyzing(true)
    try {
      // The backend returns either an AI draft or an honest local basic draft.
      const response = await analyzeProduct({
        description: description,
        language: user.language || 'hi'
      });
      
      setResult({ ...response.data, price: response.data.suggested_price ?? '' });
      setStep(2);
    } catch (err) {
      console.error('Backend AI Analysis failed:', err);
      alert('AI was unable to analyze your description. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  const handleConfirmListing = async () => {
    setLoading(true)
    try {
      // Pass the reviewed draft, including any manual edits, to create the listing.
      await createProduct({
        raw_description: description,
        quantity: result.quantity,
        language: user.language || 'hi',
        ai_data: result 
      })
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to create product', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">{step === 1 ? 'Describe Your Product' : 'Review Your Listing Draft'}</h1>
        <p className="page-subtitle">
          {step === 1 
            ? 'Speak or type about your product in your local language.' 
            : 'Review and edit the draft before creating your listing.'}
        </p>
      </div>

      {step === 1 ? (
        <div className="card" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div 
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 100, height: 100, borderRadius: '50%', background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #6c3fcf, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                fontSize: 40, margin: '0 auto 16px', cursor: 'pointer',
                boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 10px 30px rgba(108, 63, 207, 0.3)',
                transition: 'all 0.3s ease'
              }}
              className={isRecording ? 'float' : ''}
            >
              {isRecording ? <MdStop /> : <MdMic />}
            </div>
            <p style={{ fontWeight: 600, color: isRecording ? '#ef4444' : '#6c3fcf' }}>
              {isRecording ? 'Listening... Click to stop' : 'Tap to speak in any language'}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Product Description</label>
            <textarea 
              className="input"
              rows="4"
              placeholder='Example: "मेरे पास हाथ से बुना हुआ नीला दुपट्टा है, 10 पीस हैं"'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div 
              style={{ 
                border: '2px dashed var(--border)', borderRadius: 12, padding: 24, 
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(255,255,255,0.5)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
            >
              <div style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 8 }}><MdPhotoCamera style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Upload Photos</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tap to open gallery</div>
            </div>
            <div 
              style={{ 
                border: '2px dashed var(--border)', borderRadius: 12, padding: 24, 
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(255,255,255,0.5)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
            >
              <div style={{ fontSize: 32, color: 'var(--accent)', marginBottom: 8 }}><MdVideocam style={{ margin: '0 auto' }} /></div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Upload Video</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tap to record product</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleAnalyze}
              disabled={analyzing || !description.trim()}
            >
              {analyzing ? 'Preparing your draft...' : <><MdAutoAwesome /> Create Listing Draft</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in">
          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ 
                width: 120, height: 120, background: '#f3f0ff', borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60
              }}>
                {result.category === 'handloom' ? '🧣' : '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <span className="tag">{result.source === 'ai' ? 'AI-generated draft' : 'Basic draft from your description'}</span>
                {result.source === 'basic_draft' && (
                  <p style={{ color: '#5a4f7a', lineHeight: 1.6, margin: '16px 0 0' }}>
                    AI enhancement is currently unavailable. You can still edit and create this listing.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{result.source === 'ai' ? 'AI-generated draft' : 'Basic draft from your description'}</h3>
            <div className="form-group">
              <label className="form-label">Your Spoken or Typed Description</label>
              <textarea className="input" rows="3" value={description} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Product Title</label>
              <input className="input" value={result.title} onChange={(e) => setResult({ ...result, title: e.target.value, product_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Product Description</label>
              <textarea className="input" rows="4" value={result.description} onChange={(e) => setResult({ ...result, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Price</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="Enter your price" value={result.price} onChange={(e) => setResult({ ...result, price: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input className="input" value={(Array.isArray(result.tags) ? result.tags : []).join(', ')} onChange={(e) => setResult({ ...result, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} placeholder="Separate tags with commas" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>
              Back to Recorder
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleConfirmListing}
              disabled={loading}
            >
              {loading ? 'Creating Listing...' : <><MdCloudUpload /> Confirm & Create Listing</>}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <div style={{ 
            background: 'white', display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 24px', 
            borderRadius: 50, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' 
          }}>
            <div style={{ fontSize: 24 }}>💡</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Listing tip</div>
              <div style={{ fontSize: 12, color: '#5a4f7a' }}>Mention the material and quantity to make your draft more useful.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
