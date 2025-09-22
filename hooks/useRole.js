import { useMemo } from 'react';

// placeholder simple hasta que conectes auth real
export default function useRole() {
  // 'Dueño' | 'Administrador' | 'Técnico'
  return useMemo(() => 'Administrador', []);
}
