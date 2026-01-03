import { useEffect, useState } from 'react';
import { Building2, User, MapPin, CheckCircle, XCircle, Info, Clock } from 'lucide-react';
import { API_URL } from '../config';

export function ApprovalsPage() {
  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPending = () => {
    fetch(`${API_URL}/api/businesses`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        // Sadece onay bekleyenleri (isActive: false) filtrele
        const pending = data.filter(b => !b.isActive);
        setPendingBusinesses(pending);
        setLoading(false);
      })
      .catch(err => {
        console.error('Veri çekme hatası:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id, status) => {
    setActionLoading(id);
    try {
      await fetch(`${API_URL}/api/businesses/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ isActive: status })
      });
      
      // Sidebar'daki sayıyı anında güncellemek için sinyal gönder
      window.dispatchEvent(new Event('refreshStats'));
      
      fetchPending();
    } catch (err) {
      alert('Hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Onay bekleyenler yükleniyor...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Onay Bekleyen İşletmeler</h1>
          <p className="text-gray-500">Sisteme yeni kayıt olan ve onay bekleyen işletmeleri buradan yönetin.</p>
        </div>
        <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg border border-orange-100 flex items-center space-x-2">
          <Clock size={18} />
          <span className="font-bold">{pendingBusinesses.length} Bekleyen Kayıt</span>
        </div>
      </div>

      {pendingBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingBusinesses.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-2xl border border-indigo-100">
                      {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : b.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{b.name}</h3>
                      <p className="text-xs text-indigo-600 font-semibold uppercase">{b.type}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center">
                        <MapPin size={12} className="mr-1" /> {b.city}, {b.district}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-xl">
                    <User size={16} className="mr-3 text-gray-400" />
                    <span className="font-medium text-gray-700">{b.owner_name || 'Bilinmiyor'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 p-3 bg-gray-50 rounded-xl">
                    <Info size={16} className="mr-3 text-gray-400" />
                    <span className="font-medium text-gray-700">Vergi No: {b.vergiNo || '-'}</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button 
                    disabled={actionLoading === b.id}
                    onClick={() => handleAction(b.id, true)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 shadow-sm shadow-green-100 disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    <span>Onayla</span>
                  </button>
                  <button 
                    disabled={actionLoading === b.id}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    <span>Reddet</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 p-20 text-center">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Harika!</h3>
          <p className="text-gray-500 mt-2">Şu an onay bekleyen herhangi bir işletme kaydı bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}

