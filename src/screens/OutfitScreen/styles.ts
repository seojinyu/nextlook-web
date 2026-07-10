import { StyleSheet } from 'react-native';
import { H_PAD, NAVY, NAVY_LIGHT } from './constants';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' },

  // ─── Header ───
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD,
    paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
    flexShrink: 0,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#7A7570', marginTop: 2 },
  countBadge: {
    backgroundColor: NAVY, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  logoutBtnHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 32, borderRadius: 10,
    backgroundColor: NAVY, marginLeft: 8,
  },
  logoutBtnHeaderText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ─── Period Filter ───
  periodScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
    height: 64, flexGrow: 0, flexShrink: 0,
  },
  periodScrollContent: {
    paddingHorizontal: H_PAD, gap: 8, alignItems: 'center', height: 64,
  },
  periodChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: NAVY_LIGHT, gap: 4,
  },
  periodChipActive: { backgroundColor: NAVY },
  periodChipText: { fontSize: 13, fontWeight: '700', color: NAVY },
  periodChipTextActive: { color: '#fff' },
  periodChipYear: { fontSize: 11, fontWeight: '700', color: NAVY, opacity: 0.8 },
  periodChipMonth: { fontSize: 13, fontWeight: '800', color: NAVY, marginLeft: 4 },
  periodCountBadge: {
    backgroundColor: '#fff', minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6, paddingHorizontal: 6,
  },
  periodCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  periodCountText: { fontSize: 11, fontWeight: '800', color: NAVY },
  periodCountTextActive: { color: '#fff' },

  // ─── Empty ───
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: NAVY_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#7A7570', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // ─── Outfit Card ───
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY_LIGHT, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  dateText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5F4F2',
    alignItems: 'center', justifyContent: 'center',
  },
  weatherRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FAFAF8', padding: 10, borderRadius: 12, marginBottom: 12,
  },
  weatherIconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: NAVY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  weatherTemp: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  weatherCondition: { fontSize: 12, color: '#7A7570', fontWeight: '500' },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: NAVY_LIGHT, padding: 10, borderRadius: 10, marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 12, color: '#1A1A1A', lineHeight: 18 },
  notePlaceholder: { color: '#A8A4A0', fontStyle: 'italic' },

  // ─── Stats Card ───
  statsCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statsTitle: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statsItem: { flex: 1, alignItems: 'center', position: 'relative' },
  statsRankBadge: {
    position: 'absolute', top: -4, left: -4, zIndex: 2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRankText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  statsImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F5F4F2' },
  statsCount: { marginTop: 6, fontSize: 12, fontWeight: '700', color: NAVY },

  // ─── Note Edit Modal ───
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  noteInput: {
    backgroundColor: '#F5F4F2', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1A1A1A', minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#A8A4A0', textAlign: 'right', marginTop: 6 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F0EDEA' },
  modalBtnSave: { backgroundColor: NAVY },
  modalBtnCancelText: { color: '#7A7570', fontWeight: '700', fontSize: 14 },
  modalBtnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export const mannequinStyles = StyleSheet.create({
  root: { alignItems: 'center', marginVertical: 4 },
  bg: {
    width: '100%', backgroundColor: '#FAFAF8', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', gap: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  top: { borderRadius: 24, backgroundColor: '#fff' },
  bottomRow: { alignItems: 'center' },
  bottom: { borderRadius: 24, backgroundColor: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  jacket: { borderRadius: 20, backgroundColor: '#fff' },
});
