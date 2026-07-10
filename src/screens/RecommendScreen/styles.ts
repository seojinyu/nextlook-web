import { StyleSheet } from 'react-native';
import { H_PAD, BOTTEGA, DATE_CHIP_SIZE, SLOT_GAP } from './constants';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },

  // ─── Header ───
  header: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
  },
  headerInner: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 8 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  dateSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutBtnHeaderText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ─── Date Picker ───
  datePicker: { marginBottom: 16 },
  dateItem: {
    width: DATE_CHIP_SIZE, height: DATE_CHIP_SIZE + 10, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dateItemActive: { backgroundColor: BOTTEGA },
  dateItemWeekday: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  dateItemWeekdayActive: { color: 'rgba(255,255,255,0.8)' },
  dateItemDay: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  dateItemDayActive: { color: '#fff' },

  // ─── Weather Card ───
  weatherCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16, borderRadius: 16, alignItems: 'center',
  },
  weatherLeft: { alignItems: 'center', marginRight: 16 },
  weatherIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  weatherCondition: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  weatherRight: { flex: 1 },
  weatherTempBig: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  weatherDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  // ─── Section Header ───
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  sectionCount: { fontSize: 13, fontWeight: '700', color: BOTTEGA },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F0EDEA', borderRadius: 10, padding: 3 },
  viewToggleBtn: {
    width: 32, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  viewToggleBtnActive: { backgroundColor: BOTTEGA },

  // ─── Magazine flat-lay (web, background-removed) ───
  magazineRoot: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FAFAF8',
    borderRadius: 20,
    gap: 4,
  },
  magazineTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  magazineTopImg: { width: 180, height: 180 },
  magazineJacketImg: { width: 100, height: 100, marginBottom: 10 },
  magazineBottomImg: { width: 180, height: 220, marginTop: -20 },
  magazineEmpty: {
    backgroundColor: '#F5F4F2',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // ─── Mannequin (native / photo-background) ───
  mannequinRoot: { alignItems: 'center', marginVertical: 4 },
  mannequinBg: {
    width: '100%',
    backgroundColor: '#FAFAF8',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  mannequinTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mannequinTop: { borderRadius: 24, backgroundColor: '#fff' },
  mannequinBottomRow: { alignItems: 'center' },
  mannequinBottom: { borderRadius: 24, backgroundColor: '#fff' },
  mannequinEmpty: { alignItems: 'center', justifyContent: 'center' },
  jacketImage: { borderRadius: 20, backgroundColor: '#fff' },

  // ─── Note Modal ───
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  modalDesc: { fontSize: 12, color: '#7A7570', marginBottom: 14, lineHeight: 17 },
  noteInput: {
    backgroundColor: '#F5F4F2', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1A1A1A', minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#A8A4A0', textAlign: 'right', marginTop: 6 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F0EDEA' },
  modalBtnSave: { backgroundColor: BOTTEGA },
  modalBtnCancelText: { color: '#7A7570', fontWeight: '700', fontSize: 14 },
  modalBtnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ─── Loading & Suggestion Cards ───
  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { color: '#7A7570', marginTop: 12, fontSize: 14 },
  suggestion: {
    backgroundColor: '#fff', padding: 16, borderRadius: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  sugTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  comboBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: BOTTEGA,
    alignItems: 'center', justifyContent: 'center',
  },
  comboBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  sugTopRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  colorDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  itemCountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F4F2', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginLeft: 4,
  },
  itemCountText: { fontSize: 11, fontWeight: '700', color: '#7A7570' },
  reasonText: { flex: 1, color: '#7A7570', fontSize: 12, lineHeight: 17 },
  slots: { flexDirection: 'row', gap: SLOT_GAP },
  slotWrap: { alignItems: 'center' },
  slotLabelWrap: {
    backgroundColor: '#E8F0EC', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 8,
  },
  slotLabel: { fontSize: 11, fontWeight: '700', color: BOTTEGA, textAlign: 'center' },
  slotImage: { borderRadius: 22, backgroundColor: '#F5F4F2' },
  slotEmpty: { alignItems: 'center', justifyContent: 'center' },
  wearBtn: {
    backgroundColor: '#1A1A1A', paddingVertical: 13, borderRadius: 14,
    alignItems: 'center', marginTop: 14,
  },
  wearBtnDone: { backgroundColor: '#4A8B5C' },
  wearBtnRow: { flexDirection: 'row', alignItems: 'center' },
  wearBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ─── Empty State ───
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0EDEA',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#7A7570', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
