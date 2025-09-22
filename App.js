// App.js
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from './app/store/session';
import { ThemeProvider, useAppTheme, getNavTheme } from './theme/ThemeProvider';
import RootNavigator from './navigation/RootNavigator';

// ✅ NUEVO: Provider del escáner
import { ScannerProvider } from './features/scanner/ScannerProvider';

function AppInner() {
  const { mode } = useAppTheme();
  return (
    <NavigationContainer theme={getNavTheme(mode)}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <ThemeProvider defaultMode="elite" followSystem={true}>
        {/* ⬇️ SafeAreaProvider arriba de TODO, para que cubra también a ScanSheet */}
        <SafeAreaProvider>
          {/* ⬇️ ScanSheet se monta aquí dentro, ya con safe-area disponible */}
          <ScannerProvider>
            <AppInner />
          </ScannerProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
