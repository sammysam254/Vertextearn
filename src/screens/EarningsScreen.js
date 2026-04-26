import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MOCK_EARNINGS = {
  total_earnings: 48.60, balance: 23.40, this_week: 38.10, today: 2.40,
  ad_views_count: 97, rate: 0.40,
  daily_breakdown: [
    { date: 'Today', amount: 2.40, ads: 6 },
    { date: 'Yesterday', amount: 5.20, ads: 13 },
    { date: 'Mon', amount: 3.80, ads: 9 },
    { date: 'Sun', amount: 7.10, ads: 18 },
    { date: 'Sat', amount: 9.40, ads: 24 },
    { date: 'Fri', amount: 6.30, ads: 15 },
    { date: 'Thu', amount: 4.90, ads: 12 },
  ],
};

const KES = (usd) => (usd * 130).toFixed(2);

export default function EarningsScreen() {
  const { apiFetch, user } = useAuth();
  const [data, setData] = useState(MOCK_EARNINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const real = await apiFetch('/earnings/');
        if (real && real.total_earnings !== undefined) setData(real);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const withdraw = () => {
    Alert.alert(
      'Withdraw Earnings',
      `Available: KES ${KES(data.balance)}\n\nEnter M-Pesa number below:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Withdrawal', onPress: () => Alert.alert('✅ Request submitted', 'Your withdrawal will be processed within 24hrs') },
      ]
    );
  };

  const maxAmount = Math.max(...data.daily_breakdown.map(d => d.amount));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💰 Earnings</Text>
      <Text style={styles.sub}>40% of ad revenue • Paid to you</Text>

      {/* Balance card */}
      <LinearGradient colors={['#1a0a14', '#0d1a0a']} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>KES {KES(data.balance)}</Text>
        <Text style={styles.balanceUsd}>≈ ${data.balance.toFixed(2)} USD</Text>
        <TouchableOpacity style={styles.withdrawBtn} onPress={withdraw}>
          <Text style={styles.withdrawText}>Withdraw via M-Pesa</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'This Week', value: `KES ${KES(data.this_week)}`, color: '#fe2c55' },
          { label: 'All Time', value: `KES ${KES(data.total_earnings)}`, color: '#ffd700' },
          { label: 'Ads Seen', value: String(data.ad_views_count), color: '#20d5ec' },
          { label: 'Your Rate', value: '40%', color: '#a78bfa' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Bar chart */}
      <Text style={styles.sectionTitle}>Last 7 Days</Text>
      <View style={styles.chartWrap}>
        {data.daily_breakdown.map((d, i) => (
          <View key={i} style={styles.barItem}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, {
                height: `${Math.max(6, (d.amount / maxAmount) * 100)}%`,
                backgroundColor: i === 0 ? '#fe2c55' : '#333',
              }]} />
            </View>
            <Text style={styles.barLabel}>{d.date.slice(0, 3)}</Text>
            <Text style={styles.barVal}>KES {KES(d.amount)}</Text>
          </View>
        ))}
      </View>

      {/* Daily list */}
      <Text style={styles.sectionTitle}>Daily Breakdown</Text>
      {data.daily_breakdown.map((d, i) => (
        <View key={i} style={styles.dayRow}>
          <View>
            <Text style={styles.dayDate}>{d.date}</Text>
            <Text style={styles.dayAds}>{d.ads} ads shown</Text>
          </View>
          <Text style={styles.dayEarn}>+KES {KES(d.amount)}</Text>
        </View>
      ))}

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#ffd700" />
        <Text style={styles.infoText}>
          Every ad shown in your feed earns revenue. You receive{' '}
          <Text style={{ color: '#fff', fontWeight: '700' }}>40%</Text> of the ad revenue from
          Monetag and other ad networks. Minimum payout: KES 1,000.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: '#555', marginBottom: 24 },
  balanceCard: {
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#2a1a0a', marginBottom: 20,
  },
  balanceLabel: { color: '#888', fontSize: 13, marginBottom: 4 },
  balanceAmount: { fontSize: 38, fontWeight: '900', color: '#fff' },
  balanceUsd: { color: '#888', fontSize: 13, marginBottom: 20 },
  withdrawBtn: {
    backgroundColor: '#ffd700', borderRadius: 25,
    paddingVertical: 12, paddingHorizontal: 28, alignSelf: 'flex-start',
  },
  withdrawText: { color: '#000', fontWeight: '800', fontSize: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    width: '48%', backgroundColor: '#111', borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#1a1a1a',
  },
  statValue: { fontSize: 19, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#777', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  chartWrap: { flexDirection: 'row', gap: 6, height: 120, marginBottom: 28, alignItems: 'flex-end' },
  barItem: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '80%', backgroundColor: '#1a1a1a', borderRadius: 4, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: '#666', fontSize: 9 },
  barVal: { color: '#888', fontSize: 8 },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
  },
  dayDate: { color: '#fff', fontWeight: '600', fontSize: 15 },
  dayAds: { color: '#555', fontSize: 12, marginTop: 2 },
  dayEarn: { color: '#ffd700', fontWeight: '700', fontSize: 16 },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#111',
    borderRadius: 14, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#2a2000',
  },
  infoText: { color: '#888', fontSize: 13, lineHeight: 20, flex: 1 },
});
