import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!form.username || !form.password) { setError('Fill all fields'); return; }
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <LinearGradient colors={['#fe2c55', '#6c3de0', '#20d5ec']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoGrad}>
            <Text style={styles.logoText}>V</Text>
          </LinearGradient>
          <Text style={styles.appName}>Vertext</Text>
          <Text style={styles.tagline}>Where creators earn</Text>
        </View>

        {error ? <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View> : null}

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#555"
          value={form.username}
          onChangeText={v => setForm(f => ({ ...f, username: v }))}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          value={form.password}
          onChangeText={v => setForm(f => ({ ...f, password: v }))}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handle} activeOpacity={0.85} disabled={loading}>
          <LinearGradient colors={['#fe2c55', '#6c3de0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Log In</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? <Text style={{ color: '#fe2c55' }}>Sign Up</Text></Text>
        </TouchableOpacity>

        {/* Demo shortcut */}
        <TouchableOpacity onPress={() => { setForm({ username: 'demo', password: 'demo123' }); handle(); }} style={styles.demoBtn}>
          <Text style={styles.demoText}>Continue as Demo</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoGrad: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { fontSize: 44, fontWeight: '900', color: '#fff' },
  appName: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 14, color: '#555', marginTop: 4 },
  errBox: { backgroundColor: '#1a0808', borderWidth: 1, borderColor: '#4a1010', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText: { color: '#ff6666', fontSize: 14 },
  input: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
    borderRadius: 12, padding: 16, color: '#fff', fontSize: 16,
    marginBottom: 14,
  },
  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  btnGrad: { padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 14 },
  demoBtn: {
    marginTop: 16, borderWidth: 1, borderColor: '#222',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  demoText: { color: '#555', fontSize: 14 },
});
