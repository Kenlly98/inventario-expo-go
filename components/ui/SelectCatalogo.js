// components/ui/SelectCatalogo.js
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, Modal, FlatList, Pressable, StyleSheet, TextInput, TouchableWithoutFeedback
} from 'react-native';

export default function SelectCatalogo({
  label = 'Selecciona',
  items = [],                   // [{ id, nombre }], [{ id, estado }], [{ id, modelo }]
  value,                        // ID seleccionado
  onChange,                     // (id|null) => void
  placeholder = '—',
  getLabel = (it) => it?.nombre ?? it?.estado ?? it?.modelo ?? '-',
  searchable = true,            // input de búsqueda local
  disabled = false,             // deshabilitar apertura
  clearable = false,            // muestra botón "Limpiar"
  onOpen,                       // callback al abrir
  onClose,                      // callback al cerrar
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = useMemo(
    () => items.find(it => it.id === value),
    [items, value]
  );

  const filtered = useMemo(() => {
    if (!searchable || !q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter(it => String(getLabel(it)).toLowerCase().includes(needle));
  }, [items, q, searchable, getLabel]);

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    onClose?.();
  }, [onClose]);

  const openModal = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    onOpen?.();
  }, [disabled, onOpen]);

  const handlePick = useCallback((id) => {
    onChange?.(id);
    close();
  }, [onChange, close]);

  const renderItem = useCallback(({ item }) => {
    const active = item.id === value;
    return (
      <Pressable
        style={[sc.option, active && sc.optionActive]}
        onPress={() => handlePick(item.id)}
        accessibilityRole="button"
        accessibilityLabel={getLabel(item)}
      >
        <Text style={[sc.optionTxt, active && sc.optionTxtActive]} numberOfLines={1}>
          {getLabel(item)}
        </Text>
      </Pressable>
    );
  }, [value, handlePick, getLabel]);

  return (
    <View style={sc.container}>
      {!!label && <Text style={sc.label}>{label}</Text>}

      <Pressable
        style={[sc.input, disabled && sc.inputDisabled]}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Toca para seleccionar una opción"
      >
        <Text style={[sc.value, !selected && sc.placeholder]}>
          {selected ? getLabel(selected) : placeholder}
        </Text>
      </Pressable>

      <Modal
        transparent
        animationType="slide"
        visible={open}
        onRequestClose={close}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={sc.backdrop} />
        </TouchableWithoutFeedback>

        <View style={sc.sheet}>
          <View style={sc.sheetHeader}>
            <Text style={sc.sheetTitle} numberOfLines={1}>{label}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {clearable && (
                <Pressable onPress={() => handlePick(null)}>
                  <Text style={sc.clear}>Limpiar</Text>
                </Pressable>
              )}
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar">
                <Text style={sc.close}>Cerrar</Text>
              </Pressable>
            </View>
          </View>

          {searchable && (
            <View style={sc.searchRow}>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Buscar…"
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
                style={sc.search}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(it, ix) => String(it?.id ?? ix)}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={sc.empty}>Sin opciones</Text>}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={20}
            windowSize={8}
            getItemLayout={(data, index) => ({ length: 52, offset: 52 * index, index })}
          />
        </View>
      </Modal>
    </View>
  );
}

const sc = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 12, color: '#6b7280' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12,
    backgroundColor: '#fff'
  },
  inputDisabled: { opacity: 0.5 },
  value: { fontWeight: '700' },
  placeholder: { color: '#9ca3af', fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '75%', paddingBottom: 8,
    position: 'absolute', bottom: 0, left: 0, right: 0
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderColor: '#eee'
  },
  sheetTitle: { fontWeight: '800', maxWidth: '70%' },

  clear: { color: '#6b7280', fontWeight: '700' },
  close: { color: '#111827', fontWeight: '700' },

  searchRow: { paddingHorizontal: 12, paddingVertical: 8 },
  search: {
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#f9fafb'
  },

  option: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  optionActive: { backgroundColor: '#f3f4f6' },
  optionTxt: { fontWeight: '600' },
  optionTxtActive: { textDecorationLine: 'underline' },

  empty: { textAlign: 'center', padding: 20, color: '#6b7280' },
});
