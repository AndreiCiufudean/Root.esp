import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { users as seed } from '../data';
import { colors, card } from '../theme';

export default function AdminScreen() {
  const [users, setUsers] = useState(seed);
  const remove = (id) => setUsers((u) => u.filter((x) => x.id !== id));

  return (
    <View style={s.screen}>
      <Text style={s.h}>Users ({users.length})</Text>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<Text style={{ color: colors.muted }}>No users left.</Text>}
        renderItem={({ item }) => (
          <View style={[card, s.row]}>
            <View>
              <Text style={s.name}>{item.name}</Text>
              <Text style={{ color: colors.muted }}>{item.role}</Text>
            </View>
            {item.role !== 'admin' && (
              <Pressable onPress={() => remove(item.id)}>
                <Text style={{ color: colors.bloom, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: colors.mist },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.soil },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.soil },
});
