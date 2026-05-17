import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, MyRegistration } from '../api/client';
import StepIndicator from '../components/StepIndicator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const STEPS = ['Xem lại', 'Thanh toán', 'Hoàn tất'];

export function PaymentCheckoutPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<MyRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!registrationId) return;
    api
      .getMyRegistrations()
      .then((regs) => {
        const found = regs.find((r) => r.id === registrationId);
        setRegistration(found || null);
      })
      .catch((e) => {
        setMsg(`❌ Không thể tải thông tin: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, [registrationId]);

  const handlePay = async () => {
    if (!registrationId) return;
    setPaying(true);
    setMsg('');
    try {
      const idempotencyKey = crypto.randomUUID();
      const intent = await api.createPaymentIntent(registrationId, idempotencyKey);
      setPaymentIntentId(intent.paymentIntentId);
      setCurrentStep(1);
      setMsg('✅ Thanh toán được khởi tạo. Vui lòng xác nhận thanh toán dưới đây.');
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setPaying(false);
    }
  };

  const handleMockPayment = async () => {
    if (!paymentIntentId) return;
    setPaying(true);
    setMsg('');
    try {
      const response = await fetch(`/api/payments/mock-payment/pay/${paymentIntentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'success' }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Payment failed');
      setMsg('✅ Thanh toán thành công!');
      setCurrentStep(2);
      setTimeout(() => navigate('/my-registrations'), 1500);
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div style={styles.loading}><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Đang tải...</div>;
  if (!registration) return <div style={styles.loading}>Không tìm thấy đơn đăng ký</div>;

  return (
    <div className="payment-page" style={styles.page}>
      <div style={styles.card}>
        <StepIndicator steps={STEPS} currentStep={currentStep} />
        <h2 style={styles.title}>Thanh toán</h2>

        <div style={styles.section}>
          <h3>Chi tiết workshop</h3>
          <div style={styles.detail}>
            <span style={styles.label}>Workshop:</span>
            <span>{registration.workshop.title}</span>
          </div>
          <div style={styles.detail}>
            <span style={styles.label}>Ngày giờ:</span>
            <span>
              {new Date(registration.workshop.startsAt).toLocaleString('vi-VN', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div style={styles.detail}>
            <span style={styles.label}>Giá:</span>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>
              {registration.workshop.feeType === 'FREE' ? 'Miễn phí' : 'Tính phí (mock)'}
            </span>
          </div>
        </div>

        {msg && (
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center',
            background: msg.startsWith('❌') ? '#fee2e2' : '#dcfce7',
            color: msg.startsWith('❌') ? '#ef4444' : '#166534',
            fontWeight: 600,
          }}>
            {msg}
          </div>
        )}

        {!paymentIntentId ? (
          <button onClick={handlePay} disabled={paying} style={styles.btn}>
            {paying ? 'Đang xử lý...' : 'Tạo yêu cầu thanh toán'}
          </button>
        ) : (
          <div>
            <p style={{ color: '#64748b', marginBottom: 12, fontSize: 14 }}>
              ℹ️ Đây là thanh toán mock. Nhấp "Xác nhận thanh toán" để hoàn tất.
            </p>
            <button onClick={handleMockPayment} disabled={paying} style={styles.btn}>
              {paying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 500, margin: '0 auto', padding: '32px 16px' },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 20, color: '#1e293b' },
  section: { marginBottom: 20 },
  detail: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 },
  label: { color: '#64748b', fontWeight: 500 },
  btn: {
    width: '100%', padding: '12px 16px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 16, fontWeight: 600, cursor: 'pointer',
  },
  loading: { textAlign: 'center', padding: 80, color: '#64748b' },
};
