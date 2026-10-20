import React, { useEffect, useRef } from 'react';

// Client ID của ứng dụng OAuth trên Google Cloud (thông tin công khai, không phải bí mật)
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1059018981557-qqhc9sdg1m9bqugesvu185u38b7s2m6e.apps.googleusercontent.com';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Không tải được Google Sign-In'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

/**
 * Nút "Đăng nhập bằng Google" chính chủ của Google (Google Identity Services).
 * onCredential nhận ID token để gửi lên backend xác minh. Chưa cấu hình Client ID thì không hiện gì.
 */
export default function GoogleSignInButton({ onCredential, text = 'signin_with' }) {
  const containerRef = useRef(null);
  // Giữ hàm xử lý mới nhất mà không phải khởi tạo lại nút Google
  const handlerRef = useRef(onCredential);
  useEffect(() => {
    handlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => handlerRef.current?.(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          locale: 'vi',
          width: Math.min(400, containerRef.current.offsetWidth || 320),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 12px', color: '#A8A29E', fontSize: '12px' }}>
        <span style={{ flex: 1, height: '1px', backgroundColor: '#E7E5E4' }} />
        hoặc
        <span style={{ flex: 1, height: '1px', backgroundColor: '#E7E5E4' }} />
      </div>
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
      <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: '#A8A29E' }}>
        Khi tiếp tục, bạn đồng ý với{' '}
        <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#78716C' }}>Điều khoản</a> và{' '}
        <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: '#78716C' }}>Chính sách quyền riêng tư</a>
      </p>
    </div>
  );
}
