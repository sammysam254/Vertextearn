import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [claimingBadge, setClaimingBadge]   = useState(false);
  const { register, API_URL, getToken } = useAuth();

  const handleRegister = async () => {
    const u = username.trim();
    const e = email.trim();
    const p = password.trim();

    if (!u || !e || !p) { Alert.alert('Fill in all fields'); return; }
    if (p.length < 4)   { Alert.alert('Password must be at least 4 characters'); return; }
    if (!e.includes('@')){ Alert.alert('Enter a valid email'); return; }

    setLoading(true);
    try {
      const result = await register(u, e, p);
      if (result?.can_claim_blue) {
        setShowBadgeModal(true);
      }
      // If no badge modal, AuthContext handles navigation automatically
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const claimBlueBadge = async () => {
    setClaimingBadge(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/auth/claim-blue-badge/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('🎉 Congratulations!', 'You have been verified with a blue badge!');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setClaimingBadge(false);
      setShowBadgeModal(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Logo */}
      <View style={styles.logoWrap}>
        <LinearGradient colors={['#fe2c55', '#ff6b35']} style={styles.logoCircle}>
          <Ionicons name="play" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.logoText}>Vertext</Text>
        <Text style={styles.tagline}>Create. Share. Earn.</Text>
      </View>

      <Text style={styles.title}>Create Account</Text>

      {/* Username */}
      <View style={styles.inputWrap}>
        <Ionicons name="person-outline" size={20} color="#555" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#444"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      {/* Email */}
      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={20} color="#555" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#444"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      {/* Password */}
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#555" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Password (min 4 chars)"
          placeholderTextColor="#444"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPass}
          editable={!loading}
        />
        <TouchableOpacity onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555" />
        </TouchableOpacity>
      </View>

      {/* Register button */}
      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#fe2c55', '#ff6b35']} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={styles.btnGrad}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </LinearGradient>
      </TouchableOpacity>

      {/* Login link */}
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>

      {/* Blue badge claim modal */}
      <Modal visible={showBadgeModal} transparent animationType="fade" onRequestClose={() => setShowBadgeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.badgeCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#1d9bf0" />
            </View>
            <Text style={styles.modalTitle}>You're One of the First 50! 🎉</Text>
            <Text style={styles.modalDesc}>
              As one of Vertext's founding members, you're eligible for a{' '}
              <Text style={{ color: '#1d9bf0', fontWeight: '800' }}>Blue Verification Badge</Text>
              {' '}— completely free. Claim it now!
            </Text>

            <TouchableOpacity style={styles.claimBtn} onPress={claimBlueBadge} disabled={claimingBadge}>
              <LinearGradient colors={['#1d9bf0', '#0d7fd4']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.claimBtnGrad}>
                {claimingBadge
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.claimBtnText}>  Claim Blue Badge</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => setShowBadgeModal(false)}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },

  logoWrap: { alignItems: 'center', marginBottom: 36, gap: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 28, letterSpacing: 1 },
  tagline: { color: '#555', fontSize: 14 },

  title: { color: '#fff', fontWeight: '800', fontSize: 22, marginBottom: 24 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, marginBottom: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 4 },

  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnGrad: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: '#555', fontSize: 14 },
  loginLink: { color: '#fe2c55', fontWeight: '700', fontSize: 14 },

  // Badge modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#111', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#222' },
  badgeCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#0a1a2a', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#1d9bf0' },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 12 },
  modalDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  claimBtn: { borderRadius: 12, overflow: 'hidden', width: '100%', marginBottom: 12 },
  claimBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  claimBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skipBtn: { padding: 10 },
  skipText: { color: '#555', fontSize: 14 },
});
