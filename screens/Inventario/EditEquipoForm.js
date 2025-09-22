// screens/Inventario/EditEquipoForm.js
import React, { useMemo, useEffect } from 'react';
import { View } from 'react-native';
import SelectCatalogo from '../../components/ui/SelectCatalogo';
import { useCatalogs } from '../../hooks/useCatalogs';

export default function EditEquipoForm({ value = {}, onChange = () => {} }) {
  const { loading, catalogs, maps } = useCatalogs(); // maps: { marcas, modelos, ... }
  const form = value;

  // 1) Inferir marca_id desde modelo_id (cuando editas un equipo existente)
  useEffect(() => {
    if (!form.marca_id && form.modelo_id) {
      const mod = maps?.modelos?.[form.modelo_id];
      if (mod?.marca_id) onChange({ ...form, marca_id: mod.marca_id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.modelo_id, maps?.modelos]);

  // 2) Modelos filtrados por marca_id (cascada)
  const modelosFiltrados = useMemo(() => {
    const all = catalogs?.modelos ?? [];
    if (!form.marca_id) return all; // permite buscar modelo si aún no eliges marca
    return all.filter(m => m.marca_id === form.marca_id);
  }, [catalogs?.modelos, form.marca_id]);

  // 3) onChange helper
  function setField(k, v) {
    // Si cambia la marca y el modelo actual no pertenece a esa marca, resetear modelo_id
    if (k === 'marca_id') {
      if (v && form.modelo_id) {
        const mod = maps?.modelos?.[form.modelo_id];
        if (!mod || mod.marca_id !== v) {
          onChange({ ...form, marca_id: v, modelo_id: null });
          return;
        }
      }
    }
    onChange({ ...form, [k]: v });
  }

  if (loading) return null;

  return (
    <View style={{ gap: 12 }}>
      {/* Marca (opcional si infieres desde modelo) */}
      <SelectCatalogo
        label="Marca"
        items={catalogs?.marcas ?? []}
        value={form.marca_id ?? null}
        onChange={(id) => setField('marca_id', id)}
        // getLabel default usa .nombre
        searchable
        clearable
      />

      {/* Modelo — filtrado por marca si existe marca_id */}
      <SelectCatalogo
        label="Modelo"
        items={modelosFiltrados}
        value={form.modelo_id ?? null}
        onChange={(id) => setField('modelo_id', id)}
        getLabel={(it) => it?.modelo ?? '-'}
        searchable
      />

      {/* Proveedor */}
      <SelectCatalogo
        label="Proveedor"
        items={catalogs?.proveedores ?? []}
        value={form.proveedor_id ?? null}
        onChange={(id) => setField('proveedor_id', id)}
        searchable
      />

      {/* Ubicación */}
      <SelectCatalogo
        label="Ubicación"
        items={catalogs?.ubicaciones ?? []}
        value={form.ubicacion_id ?? null}
        onChange={(id) => setField('ubicacion_id', id)}
        searchable
      />

      {/* Estado (solo tabla 'equipos') */}
      <SelectCatalogo
        label="Estado"
        items={(catalogs?.estados ?? []).filter(e => (e.tabla ?? 'equipos') === 'equipos')}
        value={form.estado_id ?? null}
        onChange={(id) => setField('estado_id', id)}
        getLabel={(it) => it?.estado ?? '-'}
        searchable
      />
    </View>
  );
}
