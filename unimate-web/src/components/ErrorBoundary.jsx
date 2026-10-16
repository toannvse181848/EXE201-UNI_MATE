import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UNI-MATE Global Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            padding: '24px',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            color: '#1E293B',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: '900',
                color: '#0F172A',
                marginBottom: '8px',
                letterSpacing: '-0.4px',
              }}
            >
              Đã có lỗi xảy ra
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              Ứng dụng gặp sự cố ngoài dự kiến trong lúc hiển thị. Vui lòng thử tải lại trang hoặc quay về trang chủ.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#475569',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '24px',
                  maxHeight: '120px',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '14px',
                  backgroundColor: '#FF5722',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 87, 34, 0.3)',
                }}
              >
                <RefreshCw size={16} />
                <span>Tải lại trang</span>
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontWeight: '700',
                  fontSize: '14px',
                  border: '1.5px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <Home size={16} />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
