// The trigger. A text button, never a filled one — reporting is a
// secondary action and must not compete with the one crimson thing on the
// screen (Message the seller, on a listing).
//
// Hidden when signed out (the endpoint is authenticated, so an open modal
// would only end in a 401) and hidden on your own listing or profile.
import { useState } from 'react';
import { Flag } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import ReportModal from './ReportModal';

export default function ReportButton({
  targetType,
  targetId,
  targetLabel,
  ownerId,
  label = 'Report this',
  className = '',
}) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;
  if (ownerId && String(ownerId) === String(user?._id)) return null;

  return (
    <>
      <Button variant="link" className={className} onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5" strokeWidth={2.5} />
        {label}
      </Button>

      <ReportModal
        isOpen={open}
        onClose={() => setOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetLabel={targetLabel}
      />
    </>
  );
}
