// navigation/RootNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import MainTabs from './MainTabs';
import { ROUTES } from './routes';

// Inventario (detalle SOLO en stack)
import InventarioDetail from '../screens/Inventario/DetailScreen';

// Incidencias
import IncidenciasScreen from '../screens/Incidencias/IncidenciasScreen';
import IncidenciaFormModal from '../screens/Incidencias/IncidenciaFormModal';
import IncidenciaDetailModal from '../screens/Incidencias/IncidenciaDetailModal';

// Órdenes / Documentos / Eventos / Responsables
import OtsScreen from '../screens/OrdenesTrabajo/OtsScreen';
import DocumentosScreen from '../screens/Documentos/DocumentosScreen';
import EventosScreen from '../screens/Eventos/EventosScreen';
import ResponsablesScreen from '../screens/Responsables/ResponsablesScreen';
import ResponsableFormModal from '../screens/Responsables/ResponsableFormModal';
import ResponsableDetailModal from '../screens/Responsables/ResponsableDetailModal';

// Evaluaciones
import EvaluacionesScreen from '../screens/Evaluaciones/EvaluacionesScreen';
import EvaluacionFormModal from '../screens/Evaluaciones/EvaluacionFormModal';
import EvaluacionDetailModal from '../screens/Evaluaciones/EvaluacionDetailModal';

// ➕ Tareas (modales)
import TareaFormModal from '../screens/Tareas/TareaFormModal';
import TareaDetailModal from '../screens/Tareas/TareaDetailModal';

// Session (para pasar user a Documentos)
import { useSession } from '../app/store/session';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { user } = useSession();

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{ headerTitleAlign: 'center', headerBackTitleVisible: false }}
    >
      {/* Tabs de nivel superior */}
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

      {/* Detalles fuera de Tabs */}
      <Stack.Screen
        name={ROUTES.INVENTARIO_DETAIL}
        component={InventarioDetail}
        options={{ title: 'Equipo' }}
      />

      {/* (Opcional) Accesos por stack a pantallas de tabs */}
      <Stack.Screen name={ROUTES.INCIDENCIAS} component={IncidenciasScreen} options={{ title: 'Incidencias' }} />
      <Stack.Screen name={ROUTES.OTS} component={OtsScreen} options={{ title: 'Órdenes de Trabajo' }} />
      <Stack.Screen name={ROUTES.DOCUMENTOS} options={{ title: 'Documentos' }}>
        {(props) => <DocumentosScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name={ROUTES.EVENTOS} component={EventosScreen} options={{ title: 'Eventos' }} />
      <Stack.Screen name={ROUTES.RESPONSABLES} component={ResponsablesScreen} options={{ title: 'Responsables' }} />
      <Stack.Screen name={ROUTES.EVALUACIONES} component={EvaluacionesScreen} options={{ title: 'Evaluaciones' }} />

      {/* Modales */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        {/* Incidencias */}
        <Stack.Screen name={ROUTES.INCIDENCIA_FORM} component={IncidenciaFormModal} options={{ title: 'Nueva incidencia' }} />
        <Stack.Screen name={ROUTES.INCIDENCIA_DETAIL} component={IncidenciaDetailModal} options={{ title: 'Detalle de incidencia' }} />

        {/* Evaluaciones */}
        <Stack.Screen name={ROUTES.EVALUACION_FORM} component={EvaluacionFormModal} options={{ title: 'Nueva evaluación' }} />
        <Stack.Screen name={ROUTES.EVALUACION_DETAIL} component={EvaluacionDetailModal} options={{ title: 'Detalle evaluación' }} />

        {/* Responsables */}
        <Stack.Screen name={ROUTES.RESPONSABLE_FORM} component={ResponsableFormModal} options={{ title: 'Responsable' }} />
        <Stack.Screen name={ROUTES.RESPONSABLE_DETAIL} component={ResponsableDetailModal} options={{ title: 'Detalle de responsable' }} />

        {/* ➕ Tareas */}
        <Stack.Screen name={ROUTES.TAREA_FORM} component={TareaFormModal} options={{ title: 'Tarea' }} />
        <Stack.Screen name={ROUTES.TAREA_DETAIL} component={TareaDetailModal} options={{ title: 'Detalle de tarea' }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
