import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeProduct } from '../api/ai'
import { createProduct } from '../api/product'
import { MdMic, MdStop, MdAutoAwesome, MdCloudUpload, MdPhotoCamera, MdVideocam } from 'react-icons/md'

const categoryPlaceholder = (category = '') => {
  const normalized = category.toLowerCase()
  if (/(saree|sari|textile|handloom|fabric|weav|साड़ी|साड़ियाँ|वस्त्र|कपड़ा)/.test(normalized)) return { icon: '🧵', label: 'Textile product' }
  if (/(pottery|diya|ceramic|clay|मिट्टी|दीया)/.test(normalized)) return { icon: '🏺', label: 'Pottery product' }
  if (/(jewel|bead|ornament|आभूषण|गहना)/.test(normalized)) return { icon: '💍', label: 'Jewelry product' }
  if (/(wood|carv|bamboo|craft|लकड़ी|बांस)/.test(normalized)) return { icon: '🪵', label: 'Craft product' }
  return { icon: '🛍️', label: 'Product placeholder' }
}

const transcriptTitle = (transcript) => transcript.trim().split(/\s+/).slice(0, 12).join(' ').slice(0, 120)

const createSafeBasicDraft = (transcript, language) => ({
  source: 'basic_draft',
  product_name: transcriptTitle(transcript),
  title: transcriptTitle(transcript),
  description: transcript,
  category: null,
  material: null,
  materials: [],
  quantity: 1,
  tags: [],
  suggested_price: null,
  suggested_price_min: null,
  suggested_price_max: null,
  price: '',
  language,
})

const normalizeDraft = (data, transcript, language) => {
  const title = typeof data?.title === 'string' ? data.title.trim() : ''
  const generatedDescription = typeof data?.description === 'string' ? data.description.trim() : ''
  const usable = title.length > 0 && generatedDescription.length > 0

  if (!usable) return createSafeBasicDraft(transcript, language)

  return {
    ...data,
    source: data.source === 'ai' ? 'ai' : 'basic_draft',
    title,
    product_name: data.product_name || title,
    description: generatedDescription,
    category: typeof data.category === 'string' ? data.category : null,
    materials: Array.isArray(data.materials) ? data.materials.filter(Boolean) : [],
    quantity: Number.isInteger(Number(data.quantity)) && Number(data.quantity) > 0 ? Number(data.quantity) : 1,
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
    price: data.suggested_price ?? '',
    language,
  }
}

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
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inputError, setInputError] = useState('')

  const recognitionRef = useRef(null)
  const descriptionRef = useRef('')
  const finalTranscriptRef = useRef('')
  const speechLanguageRef = useRef('')

  const commitDescription = (nextDescription) => {
    descriptionRef.current = nextDescription
    setDescription(nextDescription)
  }

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Please type instead.")
      return
    }

    setInputError('')
    finalTranscriptRef.current = descriptionRef.current.trim()
    setFinalTranscript(finalTranscriptRef.current)
    setInterimTranscript('')
    setIsRecording(true)

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'hi-IN'
    speechLanguageRef.current = recognitionRef.current.lang

    recognitionRef.current.onresult = (event) => {
      let committedTranscript = finalTranscriptRef.current
      let nextInterimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript.trim()
        if (!segment) continue
        if (event.results[i].isFinal) {
          committedTranscript = [committedTranscript, segment].filter(Boolean).join(' ')
        } else {
          nextInterimTranscript = [nextInterimTranscript, segment].filter(Boolean).join(' ')
        }
      }
      finalTranscriptRef.current = committedTranscript
      setFinalTranscript(committedTranscript)
      setInterimTranscript(nextInterimTranscript)
      commitDescription([committedTranscript, nextInterimTranscript].filter(Boolean).join(' '))
    }

    recognitionRef.current.onend = () => {
      const committedTranscript = finalTranscriptRef.current.trim() || descriptionRef.current.trim()
      if (committedTranscript) commitDescription(committedTranscript)
      finalTranscriptRef.current = committedTranscript
      setFinalTranscript(committedTranscript)
      setInterimTranscript('')
      setIsRecording(false)
      recognitionRef.current = null
    }

    recognitionRef.current.onerror = () => {
      setInputError('Speech recognition stopped. Please review or type your description before creating a draft.')
    }

    recognitionRef.current.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const handleAnalyze = async () => {
    if (isRecording) {
      setInputError('Please stop recording and wait for your transcript before creating a draft.')
      return
    }
    const transcript = descriptionRef.current.trim()
    if (!transcript) {
      setInputError('Please describe your product before creating a draft.')
      return
    }
    setInputError('')
    setAnalyzing(true)
    const requestLanguage = speechLanguageRef.current || user.language || 'en'
    try {
      // The backend returns either an AI draft or an honest local basic draft.
      const response = await analyzeProduct({
        description: transcript,
        language: requestLanguage
      });
      const draft = normalizeDraft(response.data, transcript, requestLanguage)
      commitDescription(transcript)
      setResult(draft)
      setStep(2);
    } catch (err) {
      console.error('Backend AI Analysis failed:', err);
      const detail = err.response?.data?.detail
      setInputError(typeof detail === 'string' ? detail : 'AI was unable to analyze your description. Please try again.')
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
        language: result.language || user.language || 'en',
        ai_data: result 
      })
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to create product', err)
    } finally {
      setLoading(false)
    }
  }

  const placeholder = categoryPlaceholder(result?.category)

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
            {isRecording && (interimTranscript || finalTranscript) && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 0' }}>
                {interimTranscript ? `Recognizing: ${interimTranscript}` : `Recognized: ${finalTranscript}`}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Product Description</label>
            <textarea 
              className="input"
              rows="4"
              placeholder='Example: "मेरे पास हाथ से बुना हुआ नीला दुपट्टा है, 10 पीस हैं"'
              value={description}
              onChange={(e) => {
                const nextDescription = e.target.value
                speechLanguageRef.current = ''
                finalTranscriptRef.current = nextDescription
                setFinalTranscript(nextDescription)
                setInterimTranscript('')
                commitDescription(nextDescription)
              }}
            />
          </div>
          {inputError && <p style={{ color: '#b42318', margin: '-8px 0 16px' }}>{inputError}</p>}

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
              disabled={isRecording || analyzing}
            >
              {isRecording ? 'Finish recording to continue' : analyzing ? 'Preparing your draft...' : <><MdAutoAwesome /> Create Listing Draft</>}
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
                {result.image_url ? <img src={result.image_url} alt={result.title || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} /> : <span role="img" aria-label={placeholder.label}>{placeholder.icon}</span>}
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
              <label className="form-label">Category</label>
              <input className="input" value={result.category || ''} onChange={(e) => setResult({ ...result, category: e.target.value })} placeholder="e.g. Textile, pottery, jewelry" />
            </div>
            <div className="form-group">
              <label className="form-label">Materials</label>
              <input className="input" value={(Array.isArray(result.materials) ? result.materials : []).join(', ')} onChange={(e) => setResult({ ...result, materials: e.target.value.split(',').map(item => item.trim()).filter(Boolean), material: e.target.value })} placeholder="Separate materials with commas" />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="input" type="number" min="1" step="1" value={result.quantity || 1} onChange={(e) => setResult({ ...result, quantity: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Price</label>
              {result.source === 'ai' && (
                <p style={{ color: '#5a4f7a', fontSize: 13, margin: '6px 0 10px' }}>AI price estimate — please review before publishing</p>
              )}
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
