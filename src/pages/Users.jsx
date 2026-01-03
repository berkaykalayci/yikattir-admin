import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Calendar, Shield, User as UserIcon, Key, Edit2, X as XIcon } from 'lucide-react';
import { API_URL } from '../config';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = () => {
    fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Kullanıcılar yüklenemedi:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (id, currentRole) => {
    const newRole = currentRole === 'SUSPENDED' ? 'CUSTOMER' : 'SUSPENDED';
    try {
      await fetch(`${API_URL}/api/users/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers();
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (err) { alert('Hata oluştu'); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          password: editingUser.newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Güncelleme hatası');

      alert('Kullanıcı bilgileri güncellendi.');
      setEditingUser(null);
      fetchUsers();
      // Detay panelini güncelle
      if (selectedUser?.id === editingUser.id) {
        setSelectedUser({ ...selectedUser, name: editingUser.name, email: editingUser.email });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Müşteriler</h1>
          <p className="text-gray-500">Sistemdeki tüm kayıtlı müşterileri ve detaylarını yönetin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kullanıcı Listesi */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-sm font-medium text-gray-500">
                  <th className="px-6 py-4">Müşteri Bilgisi</th>
                  <th className="px-6 py-4">Konum</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length > 0 ? users.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`text-sm hover:bg-gray-50 transition-colors cursor-pointer ${selectedUser?.id === user.id ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.name || 'İsimsiz'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.city ? `${user.city}, ${user.district || ''}` : 'Belirtilmemiş'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        user.role === 'SUSPENDED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {user.role === 'SUSPENDED' ? 'ASKIDA' : 'AKTİF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateRole(user.id, user.role);
                        }}
                        className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                          user.role === 'SUSPENDED' ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {user.role === 'SUSPENDED' ? 'Aktifleştir' : 'Askıya Al'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">
                      Henüz müşteri bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detay Paneli */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-2xl mx-auto mb-3 border-4 border-white shadow-sm">
                  {(selectedUser.name || 'U').charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-800">{selectedUser.name || 'İsimsiz'}</h3>
                <p className="text-sm text-gray-500 uppercase font-semibold mt-1 tracking-wider">{selectedUser.role}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <Mail className="mr-3 text-gray-400" size={18} />
                  <span className="truncate">{selectedUser.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <Phone className="mr-3 text-gray-400" size={18} />
                  <span>{selectedUser.phone || 'Telefon Yok'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="mr-3 text-gray-400" size={18} />
                  <span>{selectedUser.city ? `${selectedUser.city} / ${selectedUser.district || ''}` : 'Adres Yok'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="mr-3 text-gray-400" size={18} />
                  <span>Kayıt: {new Date(selectedUser.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <Shield className="mr-3 text-gray-400" size={18} />
                  <span>ID: {selectedUser.id}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setEditingUser(selectedUser)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <Edit2 size={16} className="mr-2" />
                  Bilgileri & Şifreyi Güncelle
                </button>
                <button 
                  onClick={() => updateRole(selectedUser.id, selectedUser.role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    selectedUser.role === 'SUSPENDED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {selectedUser.role === 'SUSPENDED' ? 'Aktifleştir' : 'Askıya Al'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400 flex flex-col items-center sticky top-24">
              <UserIcon size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Detayları görmek için listeden bir kullanıcı seçin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Güncelleme Modalı */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Edit2 className="mr-2 text-indigo-600" size={20} />
                Müşteri Bilgilerini Güncelle
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Soyad</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
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
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Telefon</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Yeni Şifre (Opsiyonel)</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="password"
                      placeholder="Değiştirmek için şifre girin"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingUser.newPassword || ''}
                      onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
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
