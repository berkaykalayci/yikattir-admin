import { useState, useEffect } from 'react';
import { UserPlus, Shield, Key, Mail, User, Settings, Lock, Users, Trash2, ShieldCheck, Calendar, Edit2, X as XIcon } from 'lucide-react';
import { API_URL } from '../config';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'security', 'admin', 'admin_list'
  const [settings, setSettings] = useState({
    contactEmail: '',
    theme: 'Açık'
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);

  useEffect(() => {
    // Mevcut kullanıcıyı al
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await res.json();
        setSettings({
          contactEmail: data.contactEmail || '',
          theme: data.theme || 'Açık'
        });
        setLoading(false);
      } catch (err) {
        console.error('Ayarlar yüklenemedi:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/list`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      console.error('Admin listesi yüklenemedi');
    }
  };

  useEffect(() => {
    if (activeTab === 'admin_list') {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Güncelleme hatası');

      setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('Yeni şifreler eşleşmiyor!');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Şifre değiştirilemedi');

      setMessage({ type: 'success', text: 'Şifre başarıyla güncellendi!' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (newAdmin.password !== newAdmin.confirmPassword) {
      alert('Şifreler eşleşmiyor!');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: newAdmin.name,
          email: newAdmin.email,
          password: newAdmin.password
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yönetici eklenemedi');

      setMessage({ type: 'success', text: 'Yeni yönetici başarıyla eklendi!' });
      setNewAdmin({ name: '', email: '', password: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setActiveTab('admin_list'); // Otomatik olarak listeye yönlendir
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAdmin = async (id) => {
    if (!window.confirm('Bu yöneticiyi silmek istediğinize emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Silme hatası');
      
      setMessage({ type: 'success', text: 'Yönetici silindi.' });
      fetchAdmins();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: editingAdmin.name,
          email: editingAdmin.email,
          password: editingAdmin.newPassword // Eğer boşsa backend'de güncellenmeyecek
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Güncelleme hatası');

      setMessage({ type: 'success', text: 'Yönetici bilgileri güncellendi.' });
      setEditingAdmin(null);
      fetchAdmins();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Ayarlar yükleniyor...</div>;

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sistem Ayarları</h1>
          <p className="text-gray-500 text-sm mt-1">Uygulama tercihlerini, güvenliği ve yönetici hesaplarını buradan yönetin.</p>
        </div>
      </div>

      {/* Menü / Sekmeler */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === 'general' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings size={18} />
          <span>Genel Ayarlar</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === 'security' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Lock size={18} />
          <span>Şifre İşlemleri</span>
        </button>
        <button
          onClick={() => setActiveTab('admin_list')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === 'admin_list' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users size={18} />
          <span>Yöneticiler</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === 'admin' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <UserPlus size={18} />
          <span>Yeni Yönetici</span>
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl border text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {message.text}
        </div>
      )}

      {/* Sekme İçerikleri */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* GENEL AYARLAR */}
        {activeTab === 'general' && (
          <div className="p-8 max-w-2xl animate-in fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800">Genel Ayarlar</h2>
              <p className="text-gray-400 text-xs mt-1 font-medium italic uppercase tracking-wider">Temel uygulama tercihleriniz</p>
            </div>
            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <Mail size={16} className="mr-2 text-indigo-500" />
                    İletişim E-postası
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium text-gray-600"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <Shield size={16} className="mr-2 text-indigo-500" />
                    Tema Tercihi
                  </label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium text-gray-600"
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  >
                    <option>Açık</option>
                    <option>Koyu</option>
                    <option>Sistem</option>
                  </select>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-50 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ŞİFRE İŞLEMLERİ */}
        {activeTab === 'security' && (
          <div className="p-8 max-w-2xl animate-in fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800">Şifre Değiştir</h2>
              <p className="text-gray-400 text-xs mt-1 font-medium italic uppercase tracking-wider">Hesabınızın güvenliğini sağlayın</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <Key size={16} className="mr-2 text-red-500" />
                    Mevcut Şifre
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <Lock size={16} className="mr-2 text-green-500" />
                      Yeni Şifre
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <Lock size={16} className="mr-2 text-green-500" />
                      Yeni Şifre (Tekrar)
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-50 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                >
                  {saving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* YÖNETİCİ LİSTESİ */}
        {activeTab === 'admin_list' && (
          <div className="p-8 animate-in fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800">Mevcut Yöneticiler</h2>
              <p className="text-gray-400 text-xs mt-1 font-medium italic uppercase tracking-wider">Sisteme erişimi olan yetkili hesaplar</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {admins.map((admin) => (
                <div key={admin.id} className="p-5 border border-gray-100 rounded-3xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-100">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{admin.name}</h3>
                        <div className="flex items-center text-[10px] text-green-600 font-bold uppercase tracking-wider mt-0.5">
                          <ShieldCheck size={12} className="mr-1" />
                          Yönetici
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setEditingAdmin(admin)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Bilgileri Güncelle"
                      >
                        <Edit2 size={16} />
                      </button>
                      {admin.email !== currentUser?.email && (
                        <button 
                          onClick={() => deleteAdmin(admin.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Yöneticiyi Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-500 font-medium">
                      <Mail size={14} className="mr-2 text-gray-400" />
                      {admin.email}
                    </div>
                    <div className="flex items-center text-[10px] text-gray-400 font-medium">
                      <Calendar size={14} className="mr-2 text-gray-400" />
                      Kayıt: {new Date(admin.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YENİ YÖNETİCİ EKLE */}
        {activeTab === 'admin' && (
          <div className="p-8 max-w-2xl animate-in fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800">Yeni Yönetici Ekle</h2>
              <p className="text-gray-400 text-xs mt-1 font-medium italic uppercase tracking-wider">Paneli yönetecek yeni çalışma arkadaşları ekleyin</p>
            </div>
            <form onSubmit={handleAdminSubmit} className="space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <User size={16} className="mr-2 text-indigo-500" />
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                    placeholder="Yönetici Adı"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <Mail size={16} className="mr-2 text-indigo-500" />
                    E-posta
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                    placeholder="admin@yikattir.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <Key size={16} className="mr-2 text-indigo-500" />
                      Şifre
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      placeholder="••••••••"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <Key size={16} className="mr-2 text-indigo-500" />
                      Şifre (Tekrar)
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      placeholder="••••••••"
                      value={newAdmin.confirmPassword}
                      onChange={(e) => setNewAdmin({ ...newAdmin, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-50 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Shield size={18} />
                  <span>Yöneticiyi Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Güncelleme Modalı */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Edit2 className="mr-2 text-indigo-600" size={20} />
                Yönetici Bilgilerini Güncelle
              </h3>
              <button 
                onClick={() => setEditingAdmin(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAdmin} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Soyad</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingAdmin.name}
                      onChange={(e) => setEditingAdmin({...editingAdmin, name: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">E-posta</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingAdmin.email}
                      onChange={(e) => setEditingAdmin({...editingAdmin, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Yeni Şifre (İsteğe Bağlı)</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="password"
                      placeholder="Değiştirmek istemiyorsanız boş bırakın"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium text-sm"
                      value={editingAdmin.newPassword || ''}
                      onChange={(e) => setEditingAdmin({...editingAdmin, newPassword: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 px-6 py-3 border border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
