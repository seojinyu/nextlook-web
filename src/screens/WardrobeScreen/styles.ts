import { StyleSheet } from 'react-native';
import { AMBER, AMBER_LIGHT, AMBER_SELECTED, COLOR_GAP, MODAL_PAD } from './constants';

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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  headerCount: { fontSize: 12, color: '#7A7570', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: AMBER_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  headerAction: { color: AMBER, fontWeight: '700', fontSize: 15 },
  headerDelete: { color: '#FF3B30', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, height: 36, borderRadius: 12,
    backgroundColor: AMBER,
  },
  logoutBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ─── Season Filter ───
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: AMBER_LIGHT,
  },
  filterChipActive: { backgroundColor: AMBER },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7A7570' },
  filterTextActive: { color: '#fff' },

  // ─── Search + Sort ───
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F4F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: AMBER_LIGHT,
  },
  sortBtnText: { fontSize: 12, fontWeight: '700', color: AMBER },

  // ─── Card ───
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12,
  },
  cardImage: { backgroundColor: '#F5F4F2' },
  cardSeasonBadge: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  cardSeasonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBottom: { paddingHorizontal: 10, paddingVertical: 10 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)' },
  cardColor: { color: '#1A1A1A', fontSize: 13, fontWeight: '600', flex: 1 },
  checkCircle: {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: AMBER },

  // ─── Empty ───
  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: AMBER_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#7A7570', marginTop: 6 },

  // ─── FAB ───
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },

  // ─── Edit Modal ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: MODAL_PAD, maxHeight: '85%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 14 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  modalImage: { borderRadius: 14, backgroundColor: '#F5F4F2', marginBottom: 14, resizeMode: 'cover' },
  catRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  catChip: {
    flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F5F4F2',
    alignItems: 'center', justifyContent: 'center',
  },
  catChipActive: { backgroundColor: '#1A1A1A' },
  catChipText: { fontSize: 14, fontWeight: '700', color: '#7A7570' },
  catChipTextActive: { color: '#fff' },
  currentColorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
    backgroundColor: '#FAFAF8', padding: 12, borderRadius: 12,
  },
  currentSwatch: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  currentColorText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLOR_GAP, marginBottom: 20 },
  colorBtn: { alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  colorBtnActive: { borderColor: AMBER, backgroundColor: AMBER_SELECTED },
  colorSwatch: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  colorBtnLabel: { fontSize: 9, color: '#7A7570', marginTop: 3 },
  colorBtnLabelActive: { color: AMBER, fontWeight: '600' },

  modalSave: {
    backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 8,
  },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalCancel: { backgroundColor: AMBER_LIGHT, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCancelText: { color: '#6C6C80', fontSize: 15, fontWeight: '600' },
});
