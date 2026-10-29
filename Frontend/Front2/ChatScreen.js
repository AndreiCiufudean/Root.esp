import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../auth';
import { api, USE_MOCK } from '../api';
import { colors } from '../theme';
import { soilStatus } from '../logic';

// Sends the question plus a short snapshot of the user's plants.
// Real version: POST it to your backend, which calls the AI API (keep the API key on the server).
async function askAssistant(question, plants) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    const dry = plants.filter((p) => p.latest && soilStatus(p.latest.SoilMoisture, p.settings?.SoilMoistureThreshold).label === 'Dry').map((p) => p.PlantName);
    return dry.length
      ? `(Demo reply) These plants have dry soil right now: ${dry.join(', ')}. Connect askAssistant() to your backend for real answers.`
      : `(Demo reply) All your plants look fine. You asked: "${question}". Connect askAssistant() to your backend for real answers.`;
  }
  const snapshot = plants.map((p) => ({ name: p.PlantName, species: p.species?.CommonName, latest: p.latest, settings: p.settings }));
  const res = await fetch('http://192.168.0.10:3000/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, plants: snapshot }),
  });
  if (!res.ok) throw new Error('Assistant unavailable');
  return (await res.json()).answer;
}

const SUGGESTIONS = ['Which plant needs water?', 'Why are the leaves yellow?', 'How much light does basil need?'];

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ id: '0', from: 'bot', text: 'Hi! Ask me anything about caring for your plants.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: String(Date.now()), from: 'me', text }]);
    setBusy(true);
    try {
      const plants = await api.getPlants(user.UserID);
      const reply = await askAssistant(text, plants);
      setMessages((m) => [...m, { id: String(Date.now() + 1), from: 'bot', text: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { id: String(Date.now() + 1), from: 'bot', text: 'Could not reach the assistant. Check your connection and try again.' }]);
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.from === 'me' ? s.me : s.bot]}>
            <Text style={{ color: item.from === 'me' ? '#fff' : colors.soil }}>{item.text}</Text>
          </View>
        )}
        ListFooterComponent={
          messages.length === 1 ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              {SUGGESTIONS.map((q) => (
                <Pressable key={q} style={s.suggestion} onPress={() => send(q)}>
                  <Text style={{ color: colors.water }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />
      <View style={s.inputRow}>
        <TextInput style={s.input} placeholder="Ask about your plants" value={input} onChangeText={setInput} onSubmitEditing={() => send()} />
        <Pressable style={[s.send, busy && { opacity: 0.5 }]} onPress={() => send()}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 14 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.fern },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  suggestion: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.water, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.line },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  send: { backgroundColor: colors.fern, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 },
});
