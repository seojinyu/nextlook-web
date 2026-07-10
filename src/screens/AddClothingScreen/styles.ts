import { StyleSheet } from 'react-native';
import { AMBER, BOTTEGA, COLOR_GAP, H_PAD } from './constants';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },

  // ─── Step Dots ───
  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0DDD8' },
  stepDotActive: { width: 24, backgroundColor: BOTTEGA },
  stepDotDone: { backgroundColor: '#C0BDB8' },

  // ─── Pick Step ───
  pickArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: H_PAD },
  pickIconCircle: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  pickTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  pickDesc: {
    fontSize: 13, color: '#7A7570', textAlign: 'center',
    marginTop: 6, lineHeight: 20, marginBottom: 28,
  },

  // ─── Buttons ───
  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  btnGradient: {
    flexDirection: 'row', paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', backgroundColor: '#F5F4F2', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  secondaryBtnText: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },

  // ─── Analyze Step ───
  analyzeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: H_PAD },
  analyzeImage: { width: 200, height: 200, borderRadius: 20, backgroundColor: '#F5F4F2' },
  analyzeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  analyzeText: { color: '#7A7570', fontSize: 14, fontWeight: '500' },

  // ─── Confirm Step ───
  confirmImage: { borderRadius: 18, backgroundColor: '#F5F4F2', marginBottom: 16 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },

  detectedBox: {
    backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  detectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  detectedHeaderText: { fontSize: 13, fontWeight: '700', color: BOTTEGA },
  detectedTags: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  seasonBadge: { backgroundColor: '#F0E8D6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  seasonBadgeText: { color: AMBER, fontSize: 12, fontWeight: '700' },
  colorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detectedSwatch: {
    width: 18, height: 18, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  detectedName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  editedBadge: {
    backgroundColor: BOTTEGA, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, marginLeft: 'auto',
  },
  editedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // ─── Category / Season Chips ───
  catRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  catChip: {
    flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F5F4F2',
    alignItems: 'center', justifyContent: 'center',
  },
  catChipActive: { backgroundColor: '#1A1A1A' },
  catChipText: { fontSize: 14, fontWeight: '700', color: '#7A7570' },
  catChipTextActive: { color: '#fff' },

  // ─── Color Grid ───
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLOR_GAP, marginBottom: 20 },
  colorBtn: { alignItems: 'center', paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  colorBtnActive: { borderColor: '#1A1A1A', backgroundColor: '#F0EDEA' },
  colorSwatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  colorLabel: { fontSize: 9, color: '#7A7570', marginTop: 3 },
  colorLabelActive: { color: '#1A1A1A', fontWeight: '600' },

  // ─── Bottom Bar ───
  bottomBar: {
    paddingHorizontal: H_PAD, paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#EDEAE6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  saveBtnWrap: { borderRadius: 14, overflow: 'hidden' },
});
