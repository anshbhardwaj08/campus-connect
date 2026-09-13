// Modal for entering/displaying the 6-digit meetup verification code
export default function VerifyCodeModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div role="dialog">VerifyCodeModal</div>;
}
