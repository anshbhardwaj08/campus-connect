// Reusable modal/dialog overlay component
export default function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return <div role="dialog">{children}</div>;
}
