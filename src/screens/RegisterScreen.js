import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [canClaimBlue, setCanClaimBlue] = useState(false);

  const handle = async () => {
    if (!form.username || !form.email || !form.password) { setError('Fill all fields'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const result = await register(form.username, form.email, form.password);
      if (result?.can_claim_blue) {
        setCanClaimBlue(true);
        setShowBadge(true);
      }
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

      {/* Blue Badge Modal */}
      <Modal visible={showBadge} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>You qualify for a Blue Badge!</Text>
            <Text style={styles.modalSub}>
              As an early Vertext creator, you can get a verified blue badge on your profile.
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.blueBadge}><Text style={styles.badgeTick}>✓</Text></View>
              <Text style={styles.badgeLabel}>Blue Verified</Text>
            </View>
            <TouchableOpacity style={styles.claimBtn} onPress={() => setShowBadge(false)}>
              <LinearGradient colors={['#1d9bf0', '#0a6fc2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                <Text style={styles.btnText}>Claim Blue Badge</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBadge(false)} style={styles.skipBtn}>
              <Text style={styles.skipTxt}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, marginBottom: 14 },
  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  btnGrad: { padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  terms: { marginTop: 20, color: '#444', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#111', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  modalSub: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  blueBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1d9bf0', justifyContent: 'center', alignItems: 'center' },
  badgeTick: { color: '#fff', fontWeight: '900', fontSize: 16 },
  badgeLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  claimBtn: { borderRadius: 12, overflow: 'hidden', width: '100%', marginBottom: 12 },
  skipBtn: { padding: 10 },
  skipTxt: { color: '#555', fontSize: 14 },
});
