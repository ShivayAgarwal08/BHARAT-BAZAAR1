/**
 * ProductCard Component
 * Displays a single product listing with title, description, price, and tags.
 * Used both on the Home page (preview) and Products page (saved items).
 */

interface ProductCardProps {
  id?: number;
  title: string;
  description: string;
  price: string;
  tags: string[];
  isPreview?: boolean;       // true = unsaved preview on home page
  onSave?: () => void;       // callback to save the product
  isSaving?: boolean;        // loading state while saving
  createdAt?: string;        // shown on products page
}

export default function ProductCard({
  title,
  description,
  price,
  tags,
  isPreview = false,
  onSave,
  isSaving = false,
  createdAt,
}: ProductCardProps) {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        background: 'linear-gradient(145deg, #111827, #1a2234)',
        border: isPreview ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        boxShadow: isPreview ? '0 0 30px rgba(249,115,22,0.1)' : 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(249,115,22,0.4)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = isPreview
          ? '1px solid rgba(249,115,22,0.4)'
          : '1px solid rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: isPreview
            ? 'linear-gradient(90deg, #f97316, #fbbf24)'
            : 'linear-gradient(90deg, #10b981, #6366f1)',
          borderRadius: '16px 16px 0 0',
        }}
      />

      {/* Decorative background blob */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '100px',
          height: '100px',
          background: isPreview
            ? 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Title + Price row */}
      <div
        className="flex justify-between items-start"
        style={{ marginBottom: '12px', gap: '12px' }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#f1f5f9',
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {title}
        </h3>
        <span
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#10b981',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '8px',
            padding: '4px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          {price}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: '14px',
          color: '#94a3b8',
          lineHeight: 1.65,
          marginBottom: '16px',
        }}
      >
        {description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap" style={{ gap: '6px', marginBottom: onSave ? '20px' : '0' }}>
        {tags.map((tag, i) => (
          <span
            key={i}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#6366f1',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '20px',
              padding: '3px 10px',
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Save button (only shown on home page preview) */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: isSaving
              ? '#374151'
              : 'linear-gradient(135deg, #10b981, #059669)',
            color: isSaving ? '#6b7280' : '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isSaving ? 'none' : '0 4px 15px rgba(16,185,129,0.3)',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            if (!isSaving)
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isSaving ? '⏳ Saving...' : '💾 Save Product'}
        </button>
      )}

      {/* Timestamp on saved products */}
      {createdAt && (
        <p
          style={{
            fontSize: '11px',
            color: '#475569',
            marginTop: '12px',
            textAlign: 'right',
          }}
        >
          {new Date(createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
