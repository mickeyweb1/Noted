export const toast = {
  success: (message) => window.dispatchEvent(new CustomEvent('noted:toast', { detail: { message, type: 'success' } })),
  info: (message) => window.dispatchEvent(new CustomEvent('noted:toast', { detail: { message, type: 'info' } })),
};
