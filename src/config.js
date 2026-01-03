const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
// Tüm boşlukları temizle ve sondaki tüm slashları kaldır
export const API_URL = rawUrl.trim().replace(/\/+$/, '');
