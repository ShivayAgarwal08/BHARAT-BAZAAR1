/**
 * ProductList Component
 * Renders a grid of ProductCard components for the Products page.
 */

import ProductCard from './ProductCard';

interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  tags: string[];
  created_at: string;
}

interface ProductListProps {
  products: Product[];
  loading?: boolean;
}

export default function ProductList({ products, loading = false }: ProductListProps) {
  // Show skeleton shimmer cards while loading
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="shimmer"
            style={{
              height: '220px',
              borderRadius: '16px',
            }}
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center"
        style={{
          padding: '60px 20px',
          color: '#475569',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
          No products saved yet
        </h3>
        <p style={{ fontSize: '14px', color: '#475569' }}>
          Go to the Home page, speak a product description, and save a listing!
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
      }}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          description={product.description}
          price={product.price}
          tags={product.tags}
          createdAt={product.created_at}
        />
      ))}
    </div>
  );
}
