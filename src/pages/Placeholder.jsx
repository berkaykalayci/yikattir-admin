export function PlaceholderPage({ title }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-500">Bu sayfa yakında eklenecek.</p>
      </div>
      <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-400 italic">Henüz veri bulunmuyor.</p>
      </div>
    </div>
  );
}

