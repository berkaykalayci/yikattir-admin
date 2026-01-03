import { useEffect, useState } from 'react';
import { 
  Users, Building2, DollarSign, Calendar, ShieldCheck, 
  Eye, X, User, Briefcase, Tag, Clock, MapPin, Phone, Mail, Info
} from 'lucide-react';
import { API_URL } from '../config';

export function Dashboard() {
  const [stats, setStats] = useState([
    { label: 'Toplam Müşteri', value: '...', icon: Users, color: 'bg-blue-500', key: 'totalCustomers' },
    { label: 'Toplam İşletme', value: '...', icon: Building2, color: 'bg-indigo-500', key: 'totalBusinesses' },
    { label: 'Aylık Gelir', value: '...', icon: () => <span className="font-bold text-xl">₺</span>, color: 'bg-green-500', key: 'monthlyRevenue' },
    { label: 'Randevular (Ay)', value: '...', icon: Calendar, color: 'bg-orange-500', key: 'monthlyAppointments' },
    { label: 'Onay Bekleyenler', value: '...', icon: ShieldCheck, color: 'bg-red-500', key: 'pendingBusinesses' },
  ]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, transRes] = await Promise.all([
          fetch(`${API_URL}/api/stats`, { headers: { "Authorization": `Bearer ${localStorage.getItem("adminToken")}` } }),
          fetch(`${API_URL}/api/transactions`, { headers: { "Authorization": `Bearer ${localStorage.getItem("adminToken")}` } })
        ]);
        
        const statsData = await statsRes.json();
        const transData = await transRes.json();

        setStats(prev => prev.map(stat => ({
          ...stat,
          value: statsData[stat.key] || '0'
        })));
        
        setRecentTransactions(transData);
      } catch (err) {
        console.error('Veri çekme hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8 relative">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Hoş geldiniz, işte bugünkü verileriniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {stat.key === 'monthlyRevenue' ? `₺${Number(stat.value).toLocaleString('tr-TR')}` : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Son Randevular</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
                <tr className="text-sm font-medium text-gray-400 border-b border-gray-50">
                <th className="pb-4">Müşteri</th>
                  <th className="pb-4 text-center">Durum</th>
                <th className="pb-4">Tutar</th>
                <th className="pb-4">Tarih</th>
                  <th className="pb-4 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.length > 0 ? recentTransactions.map((item) => (
                  <tr key={item.id} className="text-sm text-gray-600 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-gray-800">{item.customer_name}</div>
                      <div className="text-[10px] text-gray-400">{item.business_name}</div>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : 
                        item.status === 'PENDING' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-gray-700">₺{item.totalPrice}</td>
                    <td className="py-4">
                      <div>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</div>
                      <div className="text-[10px] text-gray-400">{item.time}</div>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => setSelectedAppointment(item)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400 italic">Henüz randevu bulunmuyor.</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Randevu Detay Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <ShieldCheck className="mr-2 text-indigo-600" size={20} />
                Randevu Detayı
              </h3>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Müşteri Bilgisi */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Müşteri Bilgileri</h4>
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem icon={User} label="Ad Soyad" value={selectedAppointment.customer_name} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailItem icon={Mail} label="E-posta" value={selectedAppointment.customer_email} />
                    <DetailItem icon={Phone} label="Telefon" value={selectedAppointment.customer_phone || '-'} />
                  </div>
                </div>
              </section>

              {/* İşletme & Hizmet */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hizmet Detayları</h4>
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem icon={Building2} label="İşletme" value={selectedAppointment.business_name} />
                  <DetailItem icon={Tag} label="Alınan Hizmet" value={selectedAppointment.service_name} />
                </div>
              </section>

              {/* Tarih & Tutar */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zaman ve Ödeme</h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={Calendar} label="Tarih" value={new Date(selectedAppointment.date).toLocaleDateString('tr-TR')} />
                  <DetailItem icon={Clock} label="Saat" value={selectedAppointment.time} />
                  <DetailItem icon={() => <span className="font-bold">₺</span>} label="Toplam Tutar" value={`₺${selectedAppointment.totalPrice}`} highlight />
                  <DetailItem icon={Info} label="Durum" value={selectedAppointment.status} status={selectedAppointment.status} />
                </div>
              </section>

              {/* Notlar */}
              {selectedAppointment.notes && (
                <section className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notlar</h4>
                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 italic">
                    "{selectedAppointment.notes}"
                  </div>
                </section>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, highlight, status }) {
  return (
    <div className="flex items-start p-3 bg-gray-50/50 border border-gray-100 rounded-2xl">
      <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500 mr-3">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-bold truncate ${
          highlight ? 'text-green-600 text-sm' : 
          status === 'COMPLETED' ? 'text-green-600' :
          status === 'PENDING' ? 'text-orange-600' :
          status === 'CANCELLED' ? 'text-red-600' :
          'text-gray-700'
        }`}>
          {value}
        </p>
      </div>
    </div>
  );
}
