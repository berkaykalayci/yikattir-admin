import { useEffect, useState } from 'react';
import { 
  Building2, User, MapPin, Star, Calendar, ShieldCheck, 
  ShieldAlert, Phone, Clock, Image as ImageIcon, 
  ChevronRight, MessageSquare, ClipboardList, Info, Search, Key, Edit2, X as XIcon, Mail, Plus, Trash2, Save, Tag, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { API_URL } from '../config';

export function BusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailedData, setDetailedData] = useState({ appointments: [], reviews: [], services: [] });
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'appointments', 'reviews', 'services'
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [revenueData, setRevenueData] = useState({ weekly: [], monthly: [], yearly: [] });
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [filter, setFilter] = useState({ city: '', district: '' });
  const [editingOwner, setEditingOwner] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Düzenleme state'leri
  const [editingService, setEditingUser] = useState(null); // Service edit modal
  const [editingAppointment, setEditingAppointment] = useState(null); // Appointment edit modal

  const fetchBusinesses = () => {
    fetch(`${API_URL}/api/businesses`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        setBusinesses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('İşletmeler yüklenemedi:', err);
        setLoading(false);
      });
  };

  const fetchBusinessDetails = (id) => {
    setDetailsLoading(true);
    fetch(`${API_URL}/api/businesses/${id}/details`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        setDetailedData({
          appointments: data.appointments || [],
          reviews: data.reviews || [],
          services: data.services || []
        });
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error('Detaylar yüklenemedi:', err);
        setDetailsLoading(false);
      });
  };

  const fetchRevenueData = (id) => {
    setRevenueLoading(true);
    fetch(`${API_URL}/api/businesses/${id}/revenue`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        setRevenueData(data);
        setRevenueLoading(false);
      })
      .catch(err => {
        console.error('Gelir verileri yüklenemedi:', err);
        setRevenueLoading(false);
      });
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleSelectBusiness = (business) => {
    setSelectedBusiness(business);
    setActiveTab('info');
    fetchBusinessDetails(business.id);
    fetchRevenueData(business.id);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await fetch(`${API_URL}/api/businesses/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchBusinesses();
      if (selectedBusiness && selectedBusiness.id === id) {
        setSelectedBusiness({ ...selectedBusiness, isActive: !currentStatus });
      }
    } catch (err) {
      alert('Hata oluştu');
    }
  };

  const handleUpdateOwner = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${editingOwner.ownerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: editingOwner.name,
          email: editingOwner.email,
          phone: editingOwner.phone,
          password: editingOwner.newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Güncelleme hatası');

      alert('İşletme sahibi bilgileri güncellendi.');
      setEditingOwner(null);
      fetchBusinesses();
      if (selectedBusiness) {
        setSelectedBusiness({
          ...selectedBusiness,
          owner: {
            ...selectedBusiness.owner,
            name: editingOwner.name,
            email: editingOwner.email,
            phone: editingOwner.phone
          }
        });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- HİZMET YÖNETİMİ ---
  const handleUpdateService = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isNew = !editingService.id;
    const url = isNew ? `${API_URL}/api/services` : `${API_URL}/api/services/${editingService.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          name: editingService.name,
          price: parseFloat(editingService.price),
          duration: parseInt(editingService.duration)
        })
      });

      if (!response.ok) throw new Error('Hizmet güncellenemedi');
      setEditingUser(null);
      fetchBusinessDetails(selectedBusiness.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`${API_URL}/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      fetchBusinessDetails(selectedBusiness.id);
    } catch (err) { alert('Silme hatası'); }
  };

  // --- RANDEVU GÜNCELLEME ---
  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/appointments/${editingAppointment.id}/datetime`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          date: editingAppointment.date,
          time: editingAppointment.time
        })
      });

      if (!response.ok) throw new Error('Randevu güncellenemedi');
      setEditingAppointment(null);
      fetchBusinessDetails(selectedBusiness.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredBusinesses = businesses.filter(b => {
    const cityMatch = !filter.city || b.city === filter.city;
    const districtMatch = !filter.district || b.district === filter.district;
    return cityMatch && districtMatch;
  });

  const cities = [...new Set(businesses.map(b => b.city))].filter(Boolean).sort();
  const districts = [...new Set(businesses.filter(b => !filter.city || b.city === filter.city).map(b => b.district))].filter(Boolean).sort();

  if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">İşletme Yönetimi</h1>
          <p className="text-gray-500">İşletme detayları, randevular ve müşteri geri bildirimleri.</p>
        </div>
      </div>

      {/* Filtreleme Alanı */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-gray-400">
          <Search size={18} />
          <span className="text-sm font-bold uppercase tracking-wider">Filtrele:</span>
        </div>
        
        <select 
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all min-w-[150px]"
          value={filter.city}
          onChange={(e) => setFilter({ city: e.target.value, district: '' })}
        >
          <option value="">Tüm Şehirler</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select 
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all min-w-[150px] disabled:opacity-50"
          value={filter.district}
          onChange={(e) => setFilter({ ...filter, district: e.target.value })}
          disabled={!filter.city}
        >
          <option value="">Tüm İlçeler</option>
          {districts.map(dist => (
            <option key={dist} value={dist}>{dist}</option>
          ))}
        </select>

        {(filter.city || filter.district) && (
          <button 
            onClick={() => setFilter({ city: '', district: '' })}
            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            Filtreleri Temizle
          </button>
        )}

        <div className="ml-auto text-xs font-bold text-gray-400">
          {filteredBusinesses.length} İşletme Listeleniyor
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* İşletme Listesi (Sol Kolon) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-280px)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">İşletme Listesi</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredBusinesses.length > 0 ? filteredBusinesses.map((b) => (
              <div 
                key={b.id} 
                onClick={() => handleSelectBusiness(b)}
                className={`p-4 cursor-pointer transition-all hover:bg-gray-50 flex items-center justify-between group ${selectedBusiness?.id === b.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold overflow-hidden shrink-0">
                    {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-full h-full object-cover" /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{b.name}</h3>
                    <p className="text-xs text-gray-500">Sahibi: {b.owner?.name || 'Bilinmiyor'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!b.isActive && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>}
                  <ChevronRight size={16} className={`text-gray-300 transition-transform ${selectedBusiness?.id === b.id ? 'translate-x-1 text-indigo-500' : 'group-hover:translate-x-1'}`} />
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-gray-400 text-sm italic">Aranan konumda işletme bulunamadı.</div>
            )}
          </div>
        </div>

        {/* Detay Alanı (Sağ Kolon) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedBusiness ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-280px)]">
              {/* Üst Bilgi Alanı */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-gray-100 p-1">
                    {selectedBusiness.logoUrl ? <img src={selectedBusiness.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl font-bold italic text-xl">{selectedBusiness.name.charAt(0)}</div>}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedBusiness.name}</h2>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedBusiness.isActive ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {selectedBusiness.isActive ? 'AKTİF' : 'ONAY BEKLİYOR'}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center">
                        <Star size={12} className="text-orange-400 mr-1 fill-current" /> {selectedBusiness.rating}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setEditingOwner({
                      ownerId: selectedBusiness.ownerId,
                      name: selectedBusiness.owner?.name,
                      email: selectedBusiness.owner?.email,
                      phone: selectedBusiness.owner?.phone
                    })}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center space-x-2"
                  >
                    <Edit2 size={14} />
                    <span>Profil & Şifre</span>
                  </button>
                  <button 
                    onClick={() => toggleStatus(selectedBusiness.id, selectedBusiness.isActive)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedBusiness.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedBusiness.isActive ? 'İşletmeyi Askıya Al' : 'İşletmeyi Onayla'}
                  </button>
                </div>
              </div>

              {/* Sekmeler */}
              <div className="flex px-6 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'info', label: 'Genel Bilgiler', icon: Info },
                  { id: 'revenue', label: 'Gelir Analizi', icon: BarChart3 },
                  { id: 'services', label: 'Hizmetler', icon: Tag, count: detailedData.services.length },
                  { id: 'appointments', label: 'Randevular', icon: ClipboardList, count: detailedData.appointments.length },
                  { id: 'reviews', label: 'Yorumlar', icon: MessageSquare, count: detailedData.reviews.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-4 text-sm font-bold border-b-2 transition-all mr-6 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Sekme İçerikleri */}
              <div className="flex-1 overflow-y-auto p-6">
                {detailsLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 italic">Bilgiler yükleniyor...</div>
                ) : (
                  <>
                    {/* GENEL BİLGİLER */}
                    {activeTab === 'info' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Temel Bilgiler</h3>
                          <div className="space-y-3">
                            <InfoCard label="İşletme Sahibi" value={selectedBusiness.owner?.name} icon={User} />
                            <InfoCard label="Telefon" value={selectedBusiness.owner?.phone || 'Belirtilmemiş'} icon={Phone} />
                            <InfoCard label="E-posta" value={selectedBusiness.owner?.email || 'Belirtilmemiş'} icon={Mail} />
                            <InfoCard label="Vergi Numarası" value={selectedBusiness.vergiNo || 'Belirtilmemiş'} icon={ShieldCheck} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">İletişim & Konum</h3>
                          <div className="space-y-3">
                            <InfoCard label="Adres" value={selectedBusiness.address} subValue={`${selectedBusiness.city} / ${selectedBusiness.district}`} icon={MapPin} />
                            <InfoCard label="Kapasite" value={`${selectedBusiness.capacity} Araç`} icon={Clock} />
                            <InfoCard label="Koordinatlar" value={`${selectedBusiness.lat || '-'}, ${selectedBusiness.lng || '-'}`} icon={MapPin} />
                            <InfoCard label="Kayıt Tarihi" value={new Date(selectedBusiness.createdAt).toLocaleDateString('tr-TR')} icon={Calendar} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HİZMETLER SEKMESİ */}
                    {activeTab === 'services' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold text-gray-800">İşletme Hizmetleri</h3>
                          <button 
                            onClick={() => setEditingUser({ name: '', price: '', duration: '' })}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all"
                          >
                            <Plus size={14} />
                            <span>Yeni Hizmet Ekle</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {detailedData.services.map(service => (
                            <div key={service.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-gray-800">{service.name}</h4>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center text-xs text-green-600 font-bold">
                                      <span className="mr-1">₺</span>{service.price}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-400 font-medium">
                                      <Clock size={12} className="mr-1" /> {service.duration} Dakika
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => setEditingUser(service)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => deleteService(service.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {detailedData.services.length === 0 && (
                          <div className="py-10 text-center text-gray-400 italic bg-gray-50 rounded-2xl">Bu işletmeye ait hizmet bulunmuyor.                          </div>
                        )}
                      </div>
                    )}

                    {/* GELİR ANALİZİ SEKMESİ */}
                    {activeTab === 'revenue' && (
                      <div className="space-y-8">
                        {revenueLoading ? (
                          <div className="py-20 text-center text-gray-400 italic">Gelir verileri analiz ediliyor...</div>
                        ) : (
                          <>
                            {/* Özet Kartları */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <RevenueStatCard 
                                label="Haftalık Toplam" 
                                value={revenueData.weekly.reduce((acc, curr) => acc + curr.value, 0)} 
                                color="bg-indigo-50 text-indigo-600"
                              />
                              <RevenueStatCard 
                                label="Aylık Toplam" 
                                value={revenueData.monthly.reduce((acc, curr) => acc + curr.value, 0)} 
                                color="bg-emerald-50 text-emerald-600"
                              />
                              <RevenueStatCard 
                                label="Yıllık Toplam" 
                                value={revenueData.yearly.reduce((acc, curr) => acc + curr.value, 0)} 
                                color="bg-blue-50 text-blue-600"
                              />
                            </div>

                            {/* Haftalık Grafik */}
                            <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
                              <h4 className="text-sm font-bold text-gray-700 mb-6 flex items-center">
                                <Clock size={16} className="mr-2 text-indigo-500" /> Haftalık Performans (Son 7 Gün)
                              </h4>
                              <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={revenueData.weekly}>
                                    <defs>
                                      <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(value) => `₺${value}`} />
                                    <Tooltip 
                                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                      formatter={(value) => [`₺${value.toLocaleString()}`, 'Gelir']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorWeekly)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Aylık Grafik */}
                              <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
                                <h4 className="text-sm font-bold text-gray-700 mb-6 flex items-center">
                                  <Calendar size={16} className="mr-2 text-emerald-500" /> Aylık Performans (Son 30 Gün)
                                </h4>
                                <div className="h-64 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={revenueData.monthly}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                      <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        formatter={(value) => [`₺${value.toLocaleString()}`, 'Gelir']}
                                      />
                                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* Yıllık Grafik */}
                              <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
                                <h4 className="text-sm font-bold text-gray-700 mb-6 flex items-center">
                                  <Star size={16} className="mr-2 text-blue-500" /> Yıllık Performans (Ay Bazlı)
                                </h4>
                                <div className="h-64 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={revenueData.yearly}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                      <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        formatter={(value) => [`₺${value.toLocaleString()}`, 'Gelir']}
                                      />
                                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* RANDEVULAR */}
                    {activeTab === 'appointments' && (
                      <div className="space-y-4">
                        {detailedData.appointments.length > 0 ? (
                          <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-gray-500 font-bold">
                                <tr>
                                  <th className="px-4 py-3">Müşteri</th>
                                  <th className="px-4 py-3">Hizmet</th>
                                  <th className="px-4 py-3">Tarih / Saat</th>
                                  <th className="px-4 py-3">Durum</th>
                                  <th className="px-4 py-3 text-right">Aksiyon</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {detailedData.appointments.map(app => (
                                  <tr key={app.id} className="hover:bg-gray-50/50 group">
                                    <td className="px-4 py-3 font-medium text-gray-700">{app.customer_name}</td>
                                    <td className="px-4 py-3 text-gray-500">{app.service_name}</td>
                                    <td className="px-4 py-3 text-gray-500">
                                      <p>{new Date(app.date).toLocaleDateString('tr-TR')}</p>
                                      <p className="text-[10px] font-bold text-indigo-500 uppercase">{app.time}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${app.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {app.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button 
                                        onClick={() => setEditingAppointment({ 
                                          id: app.id, 
                                          date: new Date(app.date).toISOString().split('T')[0], 
                                          time: app.time 
                                        })}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <Calendar size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-10 text-center text-gray-400 italic bg-gray-50 rounded-2xl">Bu işletmeye ait randevu bulunmuyor.</div>
                        )}
                      </div>
                    )}

                    {/* YORUMLAR */}
                    {activeTab === 'reviews' && (
                      <div className="space-y-4">
                        {detailedData.reviews.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {detailedData.reviews.map(review => (
                              <div key={review.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/30">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                      {review.customer_name?.charAt(0) || 'M'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-gray-700">{review.customer_name}</p>
                                      <p className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center text-orange-500 font-bold text-xs">
                                    <Star size={12} className="fill-current mr-1" /> {review.rating}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-10 text-center text-gray-400 italic bg-gray-50 rounded-2xl">Bu işletmeye ait yorum bulunmuyor.</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-280px)] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                <Building2 size={40} className="text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-600">Detayları Görün</h3>
              <p className="text-sm max-w-xs mt-2">İşletmenin genel bilgilerini, randevularını ve müşteri yorumlarını incelemek için soldaki listeden bir seçim yapın.</p>
            </div>
          )}
        </div>
      </div>

      {/* İşletme Sahibi Güncelleme Modalı */}
      {editingOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Edit2 className="mr-2 text-indigo-600" size={20} />
                İşletme Sahibi Bilgilerini Güncelle
              </h3>
              <button 
                onClick={() => setEditingOwner(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateOwner} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Sahibi Ad Soyad</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingOwner.name}
                      onChange={(e) => setEditingOwner({...editingOwner, name: e.target.value})}
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
                      value={editingOwner.email}
                      onChange={(e) => setEditingOwner({...editingOwner, email: e.target.value})}
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
                      value={editingOwner.phone || ''}
                      onChange={(e) => setEditingOwner({...editingOwner, phone: e.target.value})}
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
                      value={editingOwner.newPassword || ''}
                      onChange={(e) => setEditingOwner({...editingOwner, newPassword: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setEditingOwner(null)}
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

      {/* Hizmet Ekleme/Güncelleme Modalı */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Tag className="mr-2 text-indigo-600" size={20} />
                {editingService.id ? 'Hizmeti Güncelle' : 'Yeni Hizmet Ekle'}
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateService} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hizmet Adı</label>
                  <input 
                    type="text"
                    required
                    placeholder="Örn: İç-Dış Yıkama"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                    value={editingService.name}
                    onChange={(e) => setEditingUser({...editingService, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Fiyat (₺)</label>
                    <input 
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingService.price}
                      onChange={(e) => setEditingUser({...editingService, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Süre (Dakika)</label>
                    <input 
                      type="number"
                      required
                      placeholder="45"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                      value={editingService.duration}
                      onChange={(e) => setEditingUser({...editingService, duration: e.target.value})}
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
                  {saving ? 'Kaydediliyor...' : (editingService.id ? 'Güncelle' : 'Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Randevu Tarih/Saat Güncelleme Modalı */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Calendar className="mr-2 text-indigo-600" size={20} />
                Randevu Zamanını Güncelle
              </h3>
              <button 
                onClick={() => setEditingAppointment(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAppointment} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Yeni Tarih</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                    value={editingAppointment.date}
                    onChange={(e) => setEditingAppointment({...editingAppointment, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Yeni Saat</label>
                  <input 
                    type="time"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                    value={editingAppointment.time}
                    onChange={(e) => setEditingAppointment({...editingAppointment, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="flex-1 px-6 py-3 border border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Zamanı Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueStatCard({ label, value, color }) {
  return (
    <div className={`p-4 rounded-2xl border border-gray-100 ${color.split(' ')[0]} bg-opacity-50`}>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-black mt-1 ${color.split(' ')[1]}`}>₺{value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
    </div>
  );
}

function InfoCard({ label, value, subValue, icon: Icon }) {
  return (
    <div className="flex items-start p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors">
      <div className="p-2 bg-white rounded-lg shadow-sm mr-3 text-indigo-500 shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-gray-700 truncate">{value || '-'}</p>
        {subValue && <p className="text-[11px] text-gray-500 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}
