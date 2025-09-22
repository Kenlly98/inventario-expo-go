async function onGuardar() {
  if (!equipoId) { Alert.alert('Error','Falta ID de equipo'); return; }

  // Validación mínima de requeridos
  const req = ['modelo_id','proveedor_id','ubicacion_id','estado_id'];
  const faltan = req.filter(k => !form[k]);
  if (faltan.length) { Alert.alert('Campos requeridos', `Falta: ${faltan.join(', ')}`); return; }

  try {
    setSaving(true);
    await equiposRepository.update({ equipo_id: equipoId, ...form });
    Alert.alert('Éxito','Equipo actualizado');
    nav.goBack();
  } catch (e) {
    Alert.alert('Error', e?.message || 'No se pudo guardar');
  } finally {
    setSaving(false);
  }
}
