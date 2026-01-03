import { useEffect, useState } from 'react';
import { 
  Calendar, User as UserIcon, Building2, MapPin, Search, 
  Filter, X, Tag, Clock, DollarSign, ChevronRight, Eye 
} from 'lucide-react';
import { API_URL } from '../config';

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ city: '', district: '', business: '', status: '' });
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAppointments = () => {
    fetch(`${API_URL}/api/appointments`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        setAppointments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Randevular yüklenemedi:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await fetch(`${API_URL}/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchAppointments();
    } catch (err) { alert('Güncelleme hatası'); }
  };

  // Dinamik Filtre Seçenekleri
  const cities = [...new Set(appointments.map(a => a.city))].filter(Boolean).sort();
  const districts = [...new Set(appointments
    .filter(a => !filter.city || a.city === filter.city)
    .map(a => a.district))].filter(Boolean).sort();
  const businesses = [...new Set(appointments
    .filter(a => (!filter.city || a.city === filter.city) && (!filter.district || a.district === filter.district))
    .map(a => a.business_name))].filter(Boolean).sort();

  // Filtreleme Mantığı
  const filteredAppointments = appointments.filter(a => {
    const cityMatch = !filter.city || a.city === filter.city;
    const districtMatch = !filter.district || a.district === filter.district;
    const businessMatch = !filter.business || a.business_name === filter.business;
    const statusMatch = !filter.status || a.status === filter.status;
    return cityMatch && districtMatch && businessMatch && statusMatch;
  });

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Randevular yükleniyor...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="mr-3 text-indigo-600" size={28} />
            Tüm Randevular
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Sistemdeki tüm randevu trafiklerini izleyin ve yönetin.</p>
        </div>
      </div>

      {/* Filtreleme Paneli */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-indigo-600 mr-2">
          <Filter size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Filtrele:</span>
        </div>
        
        <select 
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[140px]"
          value={filter.city}
          onChange={(e) => setFilter({ ...filter, city: e.target.value, district: '', business: '' })}
        >
          <option value="">Şehir Seçin</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[140px] disabled:opacity-50"
          value={filter.district}
          onChange={(e) => setFilter({ ...filter, district: e.target.value, business: '' })}
          disabled={!filter.city}
        >
          <option value="">İlçe Seçin</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select 
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[180px]"
          value={filter.business}
          onChange={(e) => setFilter({ ...filter, business: e.target.value })}
        >
          <option value="">İşletme Seçin</option>
          {businesses.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select 
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[140px]"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">Tüm Durumlar</option>
          <option value="PENDING">BEKLEMEDE</option>
          <option value="COMPLETED">TAMAMLANDI</option>
          <option value="CANCELLED">İPTAL EDİLDİ</option>
        </select>

        {(filter.city || filter.district || filter.business || filter.status) && (
          <button 
            onClick={() => setFilter({ city: '', district: '', business: '', status: '' })}
            className="flex items-center space-x-1 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl"
          >
            <X size={14} />
            <span>Temizle</span>
          </button>
        )}

        <div className="ml-auto text-xs font-bold text-gray-400">
          {filteredAppointments.length} Randevu Listeleniyor
        </div>
      </div>

      {/* Randevu Tablosu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-sm font-bold text-gray-500 uppercase tracking-tight">
                <th className="px-6 py-4">Müşteri / Araç</th>
                <th className="px-6 py-4">İşletme / Hizmet</th>
                <th className="px-6 py-4 text-center">Tarih / Saat</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4 text-center">Durum</th>
                <th className="px-6 py-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAppointments.length > 0 ? filteredAppointments.map((a) => (
                <tr key={a.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold mr-3 border border-blue-100">
                        {a.customer_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{a.customer_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{a.vehicleType || 'Binek'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Building2 size={14} className="mr-2 text-indigo-400" />
                      <div>
                        <p className="font-bold text-gray-700">{a.business_name}</p>
                        <p className="text-[10px] text-indigo-500 font-bold">{a.service_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="font-bold text-gray-700">{new Date(a.date).toLocaleDateString('tr-TR')}</p>
                    <div className="flex items-center justify-center text-[10px] text-gray-400 font-bold">
                      <Clock size={10} className="mr-1" /> {a.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center font-bold text-gray-800">
                      <span className="text-green-600 mr-1">₺</span>
                      {a.totalPrice}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      a.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 
                      a.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <select 
                        className="text-[10px] font-bold border border-gray-100 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-sm"
                        value={a.status}
                        onChange={(e) => updateStatus(a.id, e.target.value)}
                      >
                        <option value="PENDING">Beklemede</option>
                        <option value="COMPLETED">Tamamlandı</option>
                        <option value="CANCELLED">İptal Et</option>
                      </select>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-gray-400 italic bg-white">
                    Aranan kriterlere uygun randevu bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
