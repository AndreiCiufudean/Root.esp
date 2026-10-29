import React, { useCallback, useState } from 'react';
import { FlatList, View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth';
import { api } from '../api';
import { colors } from '../theme';
import { Card, Loading, Empty, Btn } from '../ui';
import { timeAgo } from '../logic';

export default function NotificationsScreen({ navigation }) {
  const { user, setUnread } = useAuth();
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    const n = await api.getNotifications(user.UserID);
    setItems(n);
    setUnread(n.filter((x) => !x.IsRead).length);
  }, [user.UserID, setUnread]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!items) return <Loading />;

  const open = async (n) => {
    if (!n.IsRead) await api.markRead(n.NotificationID);
    await load();
    if (n.PlantID) navigation.navigate('PlantDetail', { plantId: n.PlantID });
  };

  const readAll = async () => {
    await api.markAllRead(user.UserID);
    await load();
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.mist }}
      contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      data={items}
      keyExtractor={(n) => String(n.NotificationID)}
      ListHeaderComponent={items.some((n) => !n.IsRead) ? <Btn title="Mark all as read" tone="soil" onPress={readAll} /> : null}
      ListEmptyComponent={<Empty text="No alerts. We'll tell you when a plant needs attention." />}
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)}>
          <Card style={[{ gap: 4 }, !item.IsRead && { borderColor: colors.fern }]}>
            <View style={s.between}>
              <Text style={[s.title, !item.IsRead && { color: colors.fern }]}>{item.Title}</Text>
              {!item.IsRead && <View style={s.dot} />}
            </View>
            <Text style={{ color: colors.soil }}>{item.Message}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{timeAgo(item.CreatedAt)}</Text>
          </Card>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 15, color: colors.soil },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.bloom },
});
