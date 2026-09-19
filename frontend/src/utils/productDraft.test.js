import assert from 'node:assert/strict'
import test from 'node:test'
import { categoryPlaceholder, normalizeProductDraft } from './productDraft.js'

const transcript = 'मेरे पास 10 साड़ियाँ हैं'

test('normalizes nullable basic-draft fields without crashing', () => {
  const draft = normalizeProductDraft({
    source: 'basic_draft', provider: null, title: transcript, description: transcript,
    category: null, materials: null, quantity: 10, tags: null, suggested_price: null,
    suggested_price_min: null, suggested_price_max: null, target_customer: null, selling_points: null,
  }, transcript, 'hi')

  assert.equal(draft.category, '')
  assert.deepEqual(draft.materials, [])
  assert.deepEqual(draft.tags, [])
  assert.equal(draft.price, '')
  assert.equal(draft.provider, null)
  assert.equal(categoryPlaceholder(draft.category).label, 'Product placeholder')
})

test('recognizes Hindi and English textile categories', () => {
  assert.equal(categoryPlaceholder('साड़ियाँ').label, 'Textile product')
  assert.equal(categoryPlaceholder('textile').label, 'Textile product')
})

test('keeps an uploaded image URL while normalizing optional fields', () => {
  const draft = normalizeProductDraft({ title: 'Product', description: 'Product description', image_url: 'https://example.test/image.jpg' }, 'Product description', 'en')
  assert.equal(draft.image_url, 'https://example.test/image.jpg')
})
