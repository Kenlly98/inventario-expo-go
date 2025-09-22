// hooks/useThemeColors.js
import { useThemeCtx } from '../store/theme';

export default function useThemeColors() {
  const { resolved } = useThemeCtx();
  return resolved;
}
