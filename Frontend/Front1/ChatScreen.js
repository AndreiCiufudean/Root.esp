import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';

// Replace this with a call to your backend, which in turn calls the AI API.
// Never put an API key inside the app itself.
async function askAssistant(question) {
  await new Promise((r) => setTimeout(r, 600));
  return `(Demo reply) You asked: "${question}". Connect askAssistant() in ChatScreen.js to your backend to get real answers.`;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { id: '0', from: 'bot', text: 'Hi! Ask me anything about caring for your plants.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: String(Date.now()), from: 'me', text }]);
    setBusy(true);
    try {
      const reply = await askAssistant(text);
      setMessages((m) => [...m, { id: String(Date.now() + 1), from: 'bot', text: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { id: String(Date.now() + 1), from: 'bot', text: 'Could not reach the assistant. Check your connection and try again.' }]);
    } finally {
      setBusy(false);
    }
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
      />
      <View style={s.inputRow}>
        <TextInput style={s.input} placeholder="Ask about your plants" value={input} onChangeText={setInput} onSubmitEditing={send} />
        <Pressable style={[s.send, busy && { opacity: 0.5 }]} onPress={send}>
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
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.line },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  send: { backgroundColor: colors.fern, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 },
});
