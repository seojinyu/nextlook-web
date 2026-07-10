import { StyleSheet } from 'react-native';
import { BOTTEGA } from './constants';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8', paddingHorizontal: 24 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8F0EC', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 26, fontWeight: '800', color: '#1A1A1A',
    textAlign: 'center', letterSpacing: -0.5,
  },
  desc: { fontSize: 14, color: '#7A7570', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A',
    marginTop: 28, marginBottom: 12,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDEAE6',
  },
  optionActive: { backgroundColor: BOTTEGA, borderColor: BOTTEGA },
  optionText: { fontSize: 14, fontWeight: '600', color: '#7A7570' },
  optionTextActive: { color: '#fff' },

  primaryBtn: {
    backgroundColor: BOTTEGA, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 36,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  skipBtn: { marginTop: 12, alignItems: 'center' },
  skipText: { color: '#9A9590', fontSize: 14, textDecorationLine: 'underline' },

  privacyText: {
    fontSize: 11, color: '#A8A4A0',
    textAlign: 'center', marginTop: 24, lineHeight: 16,
  },
});
