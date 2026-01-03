import { Bell, User } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const [adminName, setAdminName] = useState('Yönetici');

  useEffect(() => {
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setAdminName(user.name || 'Yönetici');
      } catch (e) {
        console.error('Kullanıcı bilgisi okunamadı');
      }
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 lg:ml-64">
      <div className="flex items-center justify-end h-full px-8">
        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={20} />
          </button>
          <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{adminName}</p>
              <p className="text-xs text-gray-500">Yönetici</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {adminName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

