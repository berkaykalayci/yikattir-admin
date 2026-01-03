import { useEffect, useState } from 'react';
import { 
  MessageSquare, Star, Trash2, Search, MapPin, Building2, Calendar, 
  ChevronRight, User as UserIcon, Filter, X 
} from 'lucide-react';
import { API_URL } from '../config';

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ city: '', district: '', business: '' });
  
  const fetchReviews = () => {
    fetch(`${API_URL}/api/reviews`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(res => res.json())
      .then(data => {
        setReviews(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Yorumlar yüklenemedi:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const deleteReview = async (id) => {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`${API_URL}/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      fetchReviews();
    } catch (err) { alert('Silme hatası'); }
  };

  // Dinamik Filtre Seçeneklerini Oluşturma
  const cities = [...new Set(reviews.map(r => r.city || 'Belirtilmemiş'))].filter(Boolean).sort();
  const districts = [...new Set(reviews
    .filter(r => !filter.city || r.city === filter.city)
    .map(r => r.district || 'Belirtilmemiş'))].filter(Boolean).sort();
  const businesses = [...new Set(reviews
    .filter(r => (!filter.city || r.city === filter.city) && (!filter.district || r.district === filter.district))
    .map(r => r.business_name))].filter(Boolean).sort();

  // Filtreleme Mantığı
  const filteredReviews = reviews.filter(r => {
    const cityMatch = !filter.city || r.city === filter.city;
    const districtMatch = !filter.district || r.district === filter.district;
    const businessMatch = !filter.business || r.business_name === filter.business;
    return cityMatch && districtMatch && businessMatch;
  });

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium italic underline decoration-indigo-200">Yorumlar yükleniyor...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <MessageSquare className="mr-3 text-indigo-600" size={28} />
            Müşteri Yorumları
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Hizmet alan müşterilerin geri bildirimlerini yönetin ve filtreleyin.</p>
        </div>
      </div>

      {/* Filtreleme Paneli */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-indigo-600 mr-2">
          <Filter size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Filtrele:</span>
        </div>
        
        {/* Şehir Seçimi */}
        <div className="relative min-w-[160px]">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
            value={filter.city}
            onChange={(e) => setFilter({ city: e.target.value, district: '', business: '' })}
          >
            <option value="">Tüm Şehirler</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* İlçe Seçimi */}
        <div className="relative min-w-[160px]">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none disabled:opacity-50"
            value={filter.district}
            onChange={(e) => setFilter({ ...filter, district: e.target.value, business: '' })}
            disabled={!filter.city}
          >
            <option value="">Tüm İlçeler</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* İşletme Seçimi */}
        <div className="relative min-w-[200px]">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
            value={filter.business}
            onChange={(e) => setFilter({ ...filter, business: e.target.value })}
          >
            <option value="">Tüm İşletmeler</option>
            {businesses.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {(filter.city || filter.district || filter.business) && (
          <button 
            onClick={() => setFilter({ city: '', district: '', business: '' })}
            className="flex items-center space-x-1 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
          >
            <X size={14} />
            <span>Temizle</span>
          </button>
        )}

        <div className="ml-auto flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Toplam Sonuç</span>
          <span className="text-sm font-bold text-indigo-600">{filteredReviews.length} Yorum</span>
        </div>
      </div>

      {/* Yorum Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.length > 0 ? filteredReviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                  {r.customer_name?.charAt(0).toUpperCase() || 'M'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{r.customer_name}</h3>
                  <p className="text-[10px] text-gray-400 flex items-center">
                    <Calendar size={10} className="mr-1" />
                    {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center bg-orange-50 px-2 py-1 rounded-lg">
                <Star size={12} className="text-orange-500 fill-current mr-1" />
                <span className="text-xs font-bold text-orange-600">{r.rating}</span>
              </div>
            </div>

            <div className="mb-4 flex-1">
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "{r.comment || 'Müşteri yorum bırakmadı.'}"
              </p>
            </div>

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Hizmet Alan Yer</span>
                <span className="text-xs font-bold text-indigo-600 flex items-center">
                  <Building2 size={12} className="mr-1" />
                  {r.business_name}
                </span>
                <span className="text-[9px] text-gray-400 mt-0.5">{r.city} / {r.district}</span>
              </div>
              <button 
                onClick={() => deleteReview(r.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Yorumu Sil"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-400">Yorum bulunamadı.</h3>
            <p className="text-sm text-gray-300">Filtreleri değiştirerek tekrar deneyebilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
