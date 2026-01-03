const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
// Başındaki/sonundaki boşlukları ve sondaki slash işaretini temizleyelim
export const API_URL = rawUrl.trim().replace(/\/$/, '');
