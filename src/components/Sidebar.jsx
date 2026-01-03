import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Building2, 
  MessageSquare, 
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';
import { API_URL } from '../config';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ShieldCheck, label: 'Onay Bekleyenler', path: '/approvals', badge: true },
  { icon: Users, label: 'Müşteriler', path: '/users' },
  { icon: Building2, label: 'İşletmeler', path: '/businesses' },
  { icon: MessageSquare, label: 'Yorumlar', path: '/reviews' },
  { icon: Calendar, label: 'Randevular', path: '/appointments' },
  { icon: Settings, label: 'Ayarlar', path: '/settings' },
];

export function Sidebar({ onLogout }) {
  const [isOpen, setIsOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
      const fetchStats = async () => {
        try {
          const res = await fetch(`${API_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          });
        const data = await res.json();
        setPendingCount(Number(data.pendingBusinesses) || 0);
      } catch (err) {
        console.error('Stats fetch error:', err);
      }
    };

    fetchStats();
    
    // Değişiklik olduğunda sayıyı anında güncellemek için dinleyici ekle
    window.addEventListener('refreshStats', fetchStats);
    
    const interval = setInterval(fetchStats, 10000); // 10 saniyeye düşürdük
    return () => {
      window.removeEventListener('refreshStats', fetchStats);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 transform lg:translate-x-0",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-16 border-b border-gray-200">
                <h1 className="text-xl font-bold text-primary">Yıkattır Admin Panel</h1>
              </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors relative",
                  location.pathname === item.path
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="mr-3" size={20} />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button 
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3" size={20} />
              Çıkış Yap
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
