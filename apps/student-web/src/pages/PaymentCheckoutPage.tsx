import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, MyRegistration } from '../api/client';
import StepIndicator from '../components/StepIndicator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faTimesCircle, faInfoCircle, faCreditCard, faLock, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

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
        setMsg(`error:Không thể tải thông tin: ${e.message}`);
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
      setMsg('success:Thanh toán được khởi tạo. Vui lòng xác nhận thanh toán dưới đây.');
    } catch (e: any) {
      setMsg(`error:${e.message}`);
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
      setMsg('success:Thanh toán thành công!');
      setCurrentStep(2);
      setTimeout(() => navigate('/my-registrations'), 1500);
    } catch (e: any) {
      setMsg(`error:${e.message}`);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div style={styles.loading}><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Đang tải...</div>;
  if (!registration) return <div style={styles.loading}>Không tìm thấy đơn đăng ký</div>;

  const isError = msg.startsWith('error:');
  const isSuccess = msg.startsWith('success:');
  const msgText = msg.replace(/^(success|error):/, '');

  return (
    <div className="payment-page" style={styles.page}>
      <button onClick={() => navigate('/my-registrations')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FontAwesomeIcon icon={faArrowLeft} />Quay lại đăng ký của tôi
      </button>

      <div style={styles.card}>
        <StepIndicator steps={STEPS} currentStep={currentStep} />
        <h2 style={styles.title}>
          <FontAwesomeIcon icon={faCreditCard} style={{ marginRight: 10, color: '#6366f1' }} />
          Thanh toán
        </h2>

        {/* Workshop summary box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Workshop</p>
          <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{registration.workshop.title}</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            <div style={styles.detail}>
              <span style={styles.label}>Ngày giờ</span>
              <span style={{ fontWeight: 500 }}>
                {new Date(registration.workshop.startsAt).toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' })}
              </span>
            </div>
            <div style={{ height: 1, background: '#e2e8f0' }} />
            <div style={styles.detail}>
              <span style={styles.label}>Học phí</span>
              <span style={{ fontWeight: 700, color: registration.workshop.feeType === 'FREE' ? '#16a34a' : '#dc2626', fontSize: 15 }}>
                {registration.workshop.feeType === 'FREE' ? 'Miễn phí' : 'Có phí (mock)'}
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 8, marginBottom: 16,
            background: isError ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${isError ? '#fca5a5' : '#86efac'}`,
            color: isError ? '#dc2626' : '#16a34a',
            fontWeight: 600, fontSize: 14,
          }}>
            <FontAwesomeIcon icon={isError ? faTimesCircle : faCheckCircle} />
            {msgText}
          </div>
        )}

        {!paymentIntentId ? (
          <button onClick={handlePay} disabled={paying} style={{ ...styles.btn, opacity: paying ? 0.7 : 1 }}>
            {paying
              ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Đang xử lý...</>
              : <><FontAwesomeIcon icon={faCreditCard} style={{ marginRight: 8 }} />Tạo yêu cầu thanh toán</>}
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
              <FontAwesomeIcon icon={faInfoCircle} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Đây là thanh toán mock để demo. Nhấn "Xác nhận thanh toán" để hoàn tất.</span>
            </div>
            <button onClick={handleMockPayment} disabled={paying} style={{ ...styles.btn, background: 'linear-gradient(135deg, #059669, #047857)', opacity: paying ? 0.7 : 1 }}>
              {paying
                ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Đang xử lý...</>
                : <><FontAwesomeIcon icon={faLock} style={{ marginRight: 8 }} />Xác nhận thanh toán</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 500, margin: '0 auto', padding: '32px 16px' },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#1e293b', display: 'flex', alignItems: 'center' },
  detail: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 14 },
  label: { color: '#64748b', fontWeight: 500 },
  btn: {
    width: '100%', padding: '14px 16px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  loading: { textAlign: 'center', padding: 80, color: '#64748b' },
};
