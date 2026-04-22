import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!form.username || !form.email || !form.password) { setError('Fill all fields'); return; }
    setError(''); setLoading(true);
    try {
      await register(form.username, form.email, form.password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.sub}>Join Vertext and start earning</Text>

        {error ? <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View> : null}

        {[
          { key: 'username', placeholder: 'Username', auto: 'none' },
          { key: 'email', placeholder: 'Email address', auto: 'email-address' },
          { key: 'password', placeholder: 'Password (min 6 chars)', secure: true, auto: 'none' },
        ].map(f => (
          <TextInput
            key={f.key}
            style={styles.input}
            placeholder={f.placeholder}
            placeholderTextColor="#555"
            value={form[f.key]}
            onChangeText={v => setForm(fm => ({ ...fm, [f.key]: v }))}
            secureTextEntry={!!f.secure}
            autoCapitalize={f.auto}
            keyboardType={f.key === 'email' ? 'email-address' : 'default'}
          />
        ))}

        <TouchableOpacity style={styles.btn} onPress={handle} activeOpacity={0.85} disabled={loading}>
          <LinearGradient colors={['#fe2c55', '#6c3de0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By signing up, you agree to Vertext's Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: '#fe2c55', fontSize: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 15, color: '#555', marginBottom: 32 },
  errBox: { backgroundColor: '#1a0808', borderWidth: 1, borderColor: '#4a1010', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText: { color: '#ff6666', fontSize: 14 },
  input: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
    borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, marginBottom: 14,
  },
  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  btnGrad: { padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  terms: { marginTop: 20, color: '#444', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
