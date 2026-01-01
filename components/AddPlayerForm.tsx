
import React, { useState } from 'react';
import { Gender, Player } from '../types';

interface AddPlayerFormProps {
  onAdd: (player: Omit<Player, 'id' | 'gamesPlayed'>) => void;
}

const AddPlayerForm: React.FC<AddPlayerFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [level, setLevel] = useState(7);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, gender, level });
    setName('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
      <div 
        className="p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </span>
          新增球友
        </h2>
        <button className="text-slate-400 hover:text-indigo-600 transition-transform duration-300" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      
      <div className={`px-6 pb-6 space-y-4 transition-all duration-300 origin-top ${isCollapsed ? 'max-h-0 opacity-0 pointer-events-none scale-y-0 overflow-hidden' : 'max-h-[500px] opacity-100 scale-y-100'}`}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">球友名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="例如：王小明"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">性別</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value={Gender.MALE}>男生</option>
                <option value={Gender.FEMALE}>女生</option>
                <option value={Gender.OTHER}>其他</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">強度 (1-15)</label>
              <input
                type="number"
                min="1"
                max="15"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-200 active:scale-95"
          >
            加入名單
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPlayerForm;
