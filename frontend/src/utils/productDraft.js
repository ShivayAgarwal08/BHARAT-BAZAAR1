const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '')

const asStringArray = (value) => (
  Array.isArray(value) ? value.map(asTrimmedString).filter(Boolean) : []
)

const asPositiveNumberOrNull = (value) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

const asNonNegativeNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export const categoryPlaceholder = (category) => {
  const normalized = typeof category === 'string' ? category.toLowerCase() : ''
  if (/(saree|sari|textile|handloom|fabric|weav|साड़ी|साड़ियाँ|वस्त्र|कपड़ा)/.test(normalized)) return { icon: '🧵', label: 'Textile product' }
  if (/(pottery|diya|ceramic|clay|मिट्टी|दीया)/.test(normalized)) return { icon: '🏺', label: 'Pottery product' }
  if (/(jewel|bead|ornament|आभूषण|गहना)/.test(normalized)) return { icon: '💍', label: 'Jewelry product' }
  if (/(wood|carv|bamboo|craft|लकड़ी|बांस)/.test(normalized)) return { icon: '🪵', label: 'Craft product' }
  return { icon: '🛍️', label: 'Product placeholder' }
}

const transcriptTitle = (transcript) => asTrimmedString(transcript).split(/\s+/).filter(Boolean).slice(0, 12).join(' ').slice(0, 120) || 'Product listing draft'

export const createSafeBasicDraft = (transcript, language) => {
  const description = asTrimmedString(transcript)
  const title = transcriptTitle(description)
  return {
    source: 'basic_draft',
    provider: null,
    product_name: title,
    title,
    description,
    category: '',
    material: '',
    materials: [],
    quantity: 1,
    tags: [],
    suggested_price: null,
    suggested_price_min: null,
    suggested_price_max: null,
    target_customer: '',
    selling_points: [],
    image_url: '',
    price: '',
    language: asTrimmedString(language),
  }
}

export const normalizeProductDraft = (data, transcript, language) => {
  const title = asTrimmedString(data?.title)
  const description = asTrimmedString(data?.description)
  if (!title || !description) return createSafeBasicDraft(transcript, language)

  const suggestedPrice = asNonNegativeNumberOrNull(data?.suggested_price)
  const materials = asStringArray(data?.materials)
  return {
    source: data?.source === 'ai' ? 'ai' : 'basic_draft',
    provider: data?.provider === 'gemini' || data?.provider === 'groq' ? data.provider : null,
    title,
    product_name: asTrimmedString(data?.product_name) || title,
    description,
    category: asTrimmedString(data?.category),
    material: asTrimmedString(data?.material),
    materials,
    quantity: asPositiveNumberOrNull(data?.quantity),
    tags: asStringArray(data?.tags),
    suggested_price: suggestedPrice,
    suggested_price_min: asNonNegativeNumberOrNull(data?.suggested_price_min),
    suggested_price_max: asNonNegativeNumberOrNull(data?.suggested_price_max),
    target_customer: asTrimmedString(data?.target_customer),
    selling_points: asStringArray(data?.selling_points),
    image_url: asTrimmedString(data?.image_url),
    price: suggestedPrice ?? '',
    language: asTrimmedString(data?.language) || asTrimmedString(language),
  }
}
