// The handshake at the gate, in two halves.
//
//   mode="show"  — the seller's half: display the code for the buyer to read
//   mode="enter" — the buyer's half: type what the seller is showing
//
// Same modal, because it is the same moment; which half you get depends on
// which side of the deal you are on.
import { useState } from 'react';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const CODE_LENGTH = 6;

export default function VerifyCodeModal({ isOpen, onClose, deal, mode = 'enter', onVerified }) {
  const [code, setCode] = useState('');
  const [revealed, setRevealed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setCode('');
    setRevealed('');
    setError('');
    onClose?.();
  };

  const showCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/deals/${deal._id}/generate-code`);
      setRevealed(res.data.data.verifyCode);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not get the code.'));
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    const value = code.trim().toUpperCase();
    if (value.length < CODE_LENGTH) {
      setError(`The code is ${CODE_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post(`/deals/${deal._id}/verify-code`, { code: value });
      toast.success('Code checked. Now both of you confirm the handover.');
      onVerified?.();
      close();
    } catch (err) {
      setError(apiErrorMessage(err, 'That code did not match.'));
    } finally {
      setLoading(false);
    }
  };

  if (!deal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      caption={mode === 'show' ? 'Show this at the gate' : 'Read it off their screen'}
      title={mode === 'show' ? 'Your deal code' : 'Enter the deal code'}
    >
      {mode === 'show' ? (
        <>
          <p className="meta leading-relaxed">
            Generate the code, show your screen to the buyer, and let them type it in. Only do
            this once you are face to face and they have looked the item over.
          </p>

          {revealed ? (
            <p className="select-all border-2 border-ink bg-paper-2 py-4 text-center font-display text-[42px] leading-none tracking-[.14em] text-ink">
              {revealed}
            </p>
          ) : (
            <Button variant="primary" size="lg" loading={loading} onClick={showCode} className="w-full">
              Generate the code
            </Button>
          )}

          {revealed && (
            <p className="meta leading-relaxed">
              Generating again replaces this one — the old code stops working.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="meta leading-relaxed">
            Ask the seller to show their code, then type it here. Do this at the meetup, after
            you have looked the item over — not before.
          </p>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, CODE_LENGTH))}
            onKeyDown={(e) => e.key === 'Enter' && submitCode()}
            placeholder="XXXXXX"
            aria-label="Deal code"
            autoFocus
            className={`w-full border-2 bg-paper-3 py-3 text-center font-display text-[32px] uppercase leading-none tracking-[.18em] text-ink outline-none focus:shadow-hard-crimson ${
              error ? 'border-crimson' : 'border-ink'
            }`}
          />

          <Button variant="primary" size="lg" loading={loading} onClick={submitCode} className="w-full">
            Check the code
          </Button>
        </>
      )}

      {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}
    </Modal>
  );
}
