import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', padding: 24 },

  // ─── Logo Area ───
  logoArea: { alignItems: 'center', marginBottom: 36 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brand: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', letterSpacing: -1 },
  tagline: { fontSize: 14, color: '#7A7570', marginTop: 6 },

  // ─── Form ───
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F4F2', borderRadius: 14,
    marginBottom: 12, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, fontSize: 15, color: '#1A1A1A' },
  primaryBtn: {
    backgroundColor: '#1A1A1A', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#7A7570', fontSize: 14 },
  switchLink: { color: '#1B6B4A', fontWeight: '600' },
  forgotBtn: { marginTop: 12, alignItems: 'center' },
  forgotText: { color: '#9A9590', fontSize: 13, textDecorationLine: 'underline' },

  // ─── OAuth ───
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EDEAE6' },
  dividerText: { marginHorizontal: 10, color: '#9A9590', fontSize: 12, fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8',
    paddingVertical: 14, borderRadius: 12, marginBottom: 10,
  },
  googleBtnText: { color: '#1A1A1A', fontSize: 14, fontWeight: '600' },
  kakaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEE500', paddingVertical: 14, borderRadius: 12,
  },
  kakaoBtnText: { color: '#3C1E1E', fontSize: 14, fontWeight: '600' },

  // ─── Reset Password Modal ───
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  modalDesc: { fontSize: 13, color: '#7A7570', marginBottom: 16, lineHeight: 19 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F0EDEA' },
  modalBtnSend: { backgroundColor: '#1B6B4A' },
  modalBtnCancelText: { color: '#7A7570', fontWeight: '700', fontSize: 14 },
  modalBtnSendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
