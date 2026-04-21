import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeProduct, generateListing } from '../api/ai'
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
      // Use Puter.js AI directly from the browser
      const prompt = `
        Act as a product market expert for rural products in India.
        Analyze the following product description: "${description}"
        Language: ${user.language || 'hi'}

        Respond in strictly valid JSON format with these exact fields:
        - product_name: (Short specific name)
        - category: (One of: handloom, pottery, jewelry, food, other)
        - material: (Primary material)
        - min_price: (Estimated minimum market price in INR)
        - max_price: (Estimated maximum market price in INR)
        - quantity: (Extracted quantity, default 1)
        - tags: (Array of 5 SEO tags)
        - greeting: (A warm conversational greeting for the artisan in their language)
        - title: (Catchy, SEO-friendly marketing title)
        - description: (Story-based marketing description highlighting craftsmanship)
        - suggested_price: (Realistic selling price based on max_price)
        - profit_margin: (Estimated profit based on 40% margin)

        No code blocks, no intro, just JSON.
      `;

      const response = await window.puter.ai.chat(prompt);
      const rawText = response.toString().trim();
      
      // Clean potential markdown blocks
      const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonString);
      
      setResult(data);
      setStep(2);
    } catch (err) {
      console.error('Puter AI Analysis failed:', err);
      alert('AI was unable to analyze your description. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  const handleConfirmListing = async () => {
    setLoading(true)
    try {
      // Pass the AI generated data to the backend to create the full product
      const { data } = await createProduct({
        raw_description: description,
        quantity: result.quantity,
        language: user.language || 'hi',
        // Backend now accepts pre-analyzed AI data
        ai_data: result 
      })
      navigate(`/listing/${data.id}`)
    } catch (err) {
      console.error('Failed to create product', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">{step === 1 ? 'Describe Your Product' : 'AI Analysis Result'}</h1>
        <p className="page-subtitle">
          {step === 1 
            ? 'Speak or type about your product in your local language.' 
            : 'AI has analyzed your product. Review the details below.'}
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
              {analyzing ? 'Analyzing with AI...' : <><MdAutoAwesome /> Analyze with AI</>}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 800 }}>{result.product_name}</h3>
                  <span className="tag">{result.category}</span>
                </div>
                <p style={{ color: '#5a4f7a', lineHeight: 1.6, marginBottom: 16 }}>{result.greeting}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#9488b8', marginBottom: 4 }}>Market Value</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>₹{result.min_price} - ₹{result.max_price}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#9488b8', marginBottom: 4 }}>Profit Margin (Est.)</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>₹{result.profit_margin}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>AI Generated Listing</h3>
            <div className="form-group">
              <label className="form-label">Product Title</label>
              <input className="input" value={result.title} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Product Description</label>
              <textarea className="input" rows="4" value={result.description} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Suggested Price</label>
              <input className="input" value={`₹${result.suggested_price}`} readOnly />
            </div>
            <div>
              <label className="form-label">Tags</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {result.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
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
              <div style={{ fontSize: 13, fontWeight: 700 }}>AI Tip</div>
              <div style={{ fontSize: 12, color: '#5a4f7a' }}>Mention the material and quantity for better price estimation.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
