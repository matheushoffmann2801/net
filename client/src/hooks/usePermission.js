// client/src/hooks/usePermission.js
import { useAuth } from '../contexts/AuthContext';

export const usePermission = (permissions) => {
  const { user } = useAuth();
  
  if (!user || !user.role) return false;

  // Normaliza para array e minúsculo para comparação segura
  const allowedRoles = Array.isArray(permissions) 
    ? permissions.map(p => p.toLowerCase()) 
    : [permissions.toLowerCase()];

  return allowedRoles.includes(user.role.toLowerCase());
};
