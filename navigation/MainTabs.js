// navigation/MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/Home/HomeScreen';
import InventarioList from '../screens/Inventario/ListScreen';
// ❌ NUNCA detalles en Tabs
// import InventarioDetail from '../screens/Inventario/DetailScreen';

import IncidenciasScreen from '../screens/Incidencias/IncidenciasScreen';
import OtsScreen from '../screens/OrdenesTrabajo/OtsScreen';
import DocumentosScreen from '../screens/Documentos/DocumentosScreen';
import EventosScreen from '../screens/Eventos/EventosScreen';
import ResponsablesScreen from '../screens/Responsables/ResponsablesScreen';
import EvaluacionesScreen from '../screens/Evaluaciones/EvaluacionesScreen';
import ScannerScreen from '../screens/Scanner/ScannerScreen';
import TareasScreen from '../screens/Tareas/TareasScreen';
import AjustesScreen from '../screens/Ajustes/AjustesScreen';

import { ROUTES, assertRoutesDefined } from './routes';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  // Si alguna clave no existe, lo verás en la consola
  assertRoutesDefined([
    'HOME','INVENTARIO_LIST','INCIDENCIAS','OTS','DOCUMENTOS',
    'EVENTOS','RESPONSABLES','EVALUACIONES','SCANNER','TAREAS','AJUSTES'
  ]);

  return (
    <Tab.Navigator initialRouteName={ROUTES.HOME} screenOptions={{ headerShown: false }}>
      <Tab.Screen name={ROUTES.HOME} component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name={ROUTES.INVENTARIO_LIST} component={InventarioList} options={{ title: 'Inventario' }} />
      {/* ❌ fuera de Tabs: <Tab.Screen name={ROUTES.INVENTARIO_DETAIL} … /> */}
      <Tab.Screen name={ROUTES.INCIDENCIAS} component={IncidenciasScreen} options={{ title: 'Incidencias' }} />
      <Tab.Screen name={ROUTES.OTS} component={OtsScreen} options={{ title: 'Órdenes' }} />
      <Tab.Screen name={ROUTES.DOCUMENTOS} component={DocumentosScreen} options={{ title: 'Documentos' }} />
      <Tab.Screen name={ROUTES.EVENTOS} component={EventosScreen} options={{ title: 'Eventos' }} />
      <Tab.Screen name={ROUTES.RESPONSABLES} component={ResponsablesScreen} options={{ title: 'Responsables' }} />
      <Tab.Screen name={ROUTES.EVALUACIONES} component={EvaluacionesScreen} options={{ title: 'Evaluaciones' }} />
      <Tab.Screen name={ROUTES.SCANNER} component={ScannerScreen} options={{ title: 'Scanner' }} />
      <Tab.Screen name={ROUTES.TAREAS} component={TareasScreen} options={{ title: 'Tareas' }} />
      <Tab.Screen name={ROUTES.AJUSTES} component={AjustesScreen} options={{ title: 'Ajustes' }} />
    </Tab.Navigator>
  );
}
