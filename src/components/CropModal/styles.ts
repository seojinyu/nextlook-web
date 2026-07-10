import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  loader: {
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  container: {
    width: '94%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EDEAE6',
  },
  headerBtn: { minWidth: 60 },
  cancelText: { color: '#7A7570', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  doneText: { color: '#1B6B4A', fontSize: 15, fontWeight: '700', textAlign: 'right' },

  cropWrap: {
    padding: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 300,
  },
  controls: {
    padding: 16,
    backgroundColor: '#FAFAF8',
  },
  help: { fontSize: 12, color: '#7A7570', textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  resetBtn: {
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F0EDEA', alignItems: 'center',
  },
  resetBtnText: { color: '#1A1A1A', fontSize: 13, fontWeight: '700' },
});
