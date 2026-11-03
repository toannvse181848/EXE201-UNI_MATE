// Thông báo của app, thay cho alert / confirm của trình duyệt. Giao diện nằm ở components/AppNotifications.jsx.
// Gọi được ở bất kỳ đâu, không cần hook: notify.success('...'), await confirmDialog('...').

let nextId = 1;
let toasts = [];
let dialog = null;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener({ toasts, dialog }));

export const subscribeNotifications = (listener) => {
  listeners.add(listener);
  listener({ toasts, dialog });
  return () => listeners.delete(listener);
};

export const dismissToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

const show = (type, text) => {
  const id = nextId;
  nextId += 1;
  toasts = [...toasts, { id, type, text: String(text ?? '') }].slice(-4);
  emit();
  // Câu dài thì để lâu hơn cho kịp đọc, báo lỗi để lâu hơn báo thành công
  const duration = Math.max(type === 'error' ? 6000 : 4000, String(text ?? '').length * 60);
  setTimeout(() => dismissToast(id), duration);
};

export const notify = {
  success: (text) => show('success', text),
  error: (text) => show('error', text),
  info: (text) => show('info', text),
};

/**
 * Hộp xác nhận của app. @returns Promise<boolean>: true khi người dùng đồng ý.
 * options: { title, confirmText, cancelText, danger } (danger: thao tác khó hoàn tác, nút đỏ)
 */
export const confirmDialog = (message, options = {}) =>
  new Promise((resolve) => {
    // Hộp cũ còn mở thì coi như người dùng không đồng ý
    dialog?.resolve(false);
    dialog = { message, ...options, resolve };
    emit();
  });

export const closeDialog = (answer) => {
  const current = dialog;
  dialog = null;
  emit();
  current?.resolve(answer);
};
