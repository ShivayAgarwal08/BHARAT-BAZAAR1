/**
 * Products Page — Bharat Bazaar
 * Fetches and displays all saved products from the backend.
 */
'use client';

import { useState, useEffect } from 'react';
import ProductList from '../../components/ProductList';
import Link from 'next/link';

const BACKEND_URL = 'http://127.0.0.1:8000';

interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  tags: string[];
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/products`);
        if (!res.ok) throw new Error('Failed to fetch products');
        const data: Product[] = await res.json();
        setProducts(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not connect to backend. Is it running?'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '40px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📦</div>
          <h1
            className="gradient-text"
            style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '8px' }}
          >
            My Products
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {loading
              ? 'Loading your listings...'
              : `${products.length} product${products.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>

        {/* Add new product CTA */}
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.03)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)')
          }
        >
          🎤 Add New Product
        </Link>
      </div>

      {/* ─── Error State ───────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '32px',
            color: '#fca5a5',
            fontSize: '14px',
          }}
        >
          ⚠️ {error}
          <br />
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>
            Make sure the backend is running: <code style={{ color: '#818cf8' }}>uvicorn main:app --reload</code>
          </span>
        </div>
      )}

      {/* ─── Products Grid ─────────────────────────────────────────────────── */}
      <ProductList products={products} loading={loading} />
    </div>
  );
}
