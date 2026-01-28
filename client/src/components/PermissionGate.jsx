// client/src/components/PermissionGate.jsx
import { usePermission } from '../hooks/usePermission';
import { Lock } from 'lucide-react';

export default function PermissionGate({ permissions, children, renderFallback = null, showLock = false }) {
  const hasPermission = usePermission(permissions);

  if (!hasPermission) {
    if (showLock) {
      return <div className="opacity-50 cursor-not-allowed flex items-center gap-1" title="Sem permissão"><Lock className="w-4 h-4"/> Bloqueado</div>;
    }
    return renderFallback;
  }

  return children;
}
