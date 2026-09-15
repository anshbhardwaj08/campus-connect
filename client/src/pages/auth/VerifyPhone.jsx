// Phone OTP verification. Two steps in one screen: send the code, then
// enter it. The OTP field is six single-character boxes rather than one
// text input, because that is what the code physically looks like.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// Narration advances along the bottom of the splash, four seconds a beat.
const NARRATION_SEND = [
  'A deal is agreed on a page. It closes at a gate.',
  'For that, somebody has to be able to ring you.',
  'The number never appears on a listing.',
];

const NARRATION_CODE = [
  'Six digits, ten minutes.',
  'After that the code is dead and he asks for another.',
];

export default function VerifyPhone() {
  const navigate = useNavigate();

  const [step, setStep] = useState('send'); // 'send' | 'code'
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Set only when the server mocked the SMS (no Twilio configured). Shown
  // on screen so the flow can be completed in development.
  const [devOtp, setDevOtp] = useState('');

  const boxes = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOTP = async () => {
    if (phone.trim().length < 8) {
      setError('Enter a phone number we can reach you on');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone: phone.trim() });
      const mocked = res.data.data?.devOtp;
      setDevOtp(mocked || '');
      toast.success(
        mocked ? `No SMS configured — your code is ${mocked}.` : 'Code sent. It is good for ten minutes.'
      );
      setStep('code');
      setCooldown(RESEND_SECONDS);
      setTimeout(() => boxes.current[0]?.focus(), 60);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the code. Check the number.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { phone: phone.trim(), otp: code });
      toast.success('Phone verified. You are on the page.');
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'That code is wrong or spent. Ask for another.'));
      setDigits(Array(OTP_LENGTH).fill(''));
      boxes.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (i, value) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);

    if (char && i < OTP_LENGTH - 1) boxes.current[i + 1]?.focus();

    const code = next.join('');
    if (code.length === OTP_LENGTH && !next.includes('')) verifyOTP(code);
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) boxes.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((c, i) => (next[i] = c));
    setDigits(next);
    if (pasted.length === OTP_LENGTH) verifyOTP(pasted);
    else boxes.current[pasted.length]?.focus();
  };

  return (
    <AuthLayout
      caption={step === 'send' ? 'A number that rings' : 'Six digits, ten minutes'}
      headline={
        step === 'send'
          ? ['Somewhere to', <em key="hit">reach you</em>]
          : ['Type the', <em key="hit">six digits</em>]
      }
      narration={step === 'send' ? NARRATION_SEND : NARRATION_CODE}
      blurb={
        step === 'send'
          ? 'Buyers meet you at the gate. A working number is how that gets arranged.'
          : 'The code is good for ten minutes. After that it is dead and you ask for another.'
      }
    >
      <div className="js-head">
        <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
          {step === 'send' ? 'Verify your phone' : 'Enter the code'}
        </h2>
        <p className="meta mb-7">
          {step === 'send' ? 'One text, one code, done.' : `Sent to ${phone}.`}
        </p>
      </div>

      {step === 'send' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendOTP();
          }}
          className="space-y-4"
          noValidate
        >
          <Input
            containerClassName="js-field"
            label="Phone"
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error}
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} className="js-field !mt-7 w-full">
            Send the code
          </Button>
        </form>
      ) : (
        <div>
          <span className="js-field label-xs mb-1.5 block">Six-digit code</span>

          <div className="js-field flex gap-[9px]" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (boxes.current[i] = el)}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                aria-invalid={error ? 'true' : undefined}
                className={`h-[54px] w-full border-2 bg-paper-3 text-center font-display text-[26px] leading-none text-ink outline-none transition-shadow focus:shadow-hard-crimson focus:outline-none ${
                  error ? 'border-crimson' : 'border-ink'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="mt-1.5 text-[11.5px] font-bold leading-snug text-crimson">{error}</p>
          )}

          {devOtp && (
            <p className="mt-2 border-2 border-ink bg-paper-2 px-2.5 py-2 text-[11px] font-extrabold uppercase leading-snug tracking-[.06em] text-ink">
              No SMS service configured. Your code is {devOtp}.
            </p>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={digits.includes('')}
            onClick={() => verifyOTP(digits.join(''))}
            className="js-field !mt-7 w-full"
          >
            Verify
          </Button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4">
            <Button variant="link" onClick={() => setStep('send')}>
              Change number
            </Button>
            <Button variant="link" disabled={cooldown > 0} onClick={sendOTP}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Button>
          </div>
        </div>
      )}

      <p className="js-field meta mt-8 border-l-[3px] border-crimson pl-3 leading-relaxed">
        Your number is never shown on a listing. It is only used to reach you about a deal you
        agreed to.
      </p>
    </AuthLayout>
  );
}
