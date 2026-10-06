import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function VenueImageCarousel({
  images = [],
  height = '180px',
  borderRadius = '0px',
  showDots = true,
  showArrows = true,
  showCounter = true,
  overlayBadges = null,
  onImageClick = null,
  alt = 'Venue image',
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const mouseStartX = useRef(0);
  const isDragging = useRef(false);

  // Danh sách ảnh đảm bảo hợp lệ
  const validImages = Array.isArray(images) && images.length > 0
    ? images
    : ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'];

  const count = validImages.length;
  const safeIndex = Math.min(currentIndex, count - 1);

  const prevImage = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? count - 1 : prev - 1));
  };

  const nextImage = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === count - 1 ? 0 : prev + 1));
  };

  // Touch Swipe Handlers (Dành cho điện thoại / màn hình cảm ứng)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = Math.abs(touchStartY.current - e.changedTouches[0].clientY);

    // Chỉ kích hoạt swipe nếu vuốt ngang nhiều hơn vuốt dọc
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        nextImage(); // Vuốt sang trái -> Xem ảnh tiếp theo
      } else {
        prevImage(); // Vuốt sang phải -> Xem ảnh trước đó
      }
    }
  };

  // Mouse Drag Handlers (Dành cho kéo chuột trên máy tính)
  const handleMouseDown = (e) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diffX = mouseStartX.current - e.clientX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: borderRadius,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
        userSelect: 'none',
        cursor: count > 1 ? 'grab' : 'default',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slider Container */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: `translateX(-${safeIndex * 100}%)`,
          transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {validImages.map((imgSrc, idx) => (
          <div
            key={idx}
            style={{
              minWidth: '100%',
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
            onClick={() => onImageClick && onImageClick(idx)}
          >
            <img
              src={imgSrc}
              alt={`${alt} ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
              onError={(e) => {
                // Fallback nếu link ảnh hỏng
                e.target.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';
              }}
            />
          </div>
        ))}
      </div>

      {/* Counter Badge (VD: 1/4) */}
      {showCounter && count > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <ImageIcon size={12} color="#94A3B8" />
          <span>
            {safeIndex + 1}/{count}
          </span>
        </div>
      )}

      {/* Navigation Arrows */}
      {showArrows && count > 1 && (
        <>
          <button
            type="button"
            onClick={prevImage}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(4px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#1E293B',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={nextImage}
            aria-label="Next image"
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(4px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#1E293B',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {showDots && count > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            zIndex: 3,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(4px)',
            padding: '4px 8px',
            borderRadius: '20px',
          }}
        >
          {validImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              style={{
                width: safeIndex === idx ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: safeIndex === idx ? '#FF5722' : 'rgba(255, 255, 255, 0.65)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Custom Overlay Badges (Nổi bật, Khoảng cách, etc.) */}
      {overlayBadges}
    </div>
  );
}
