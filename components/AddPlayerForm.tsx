
import React, { useState } from 'react';
import { Gender, Player } from '../types';

interface AddPlayerFormProps {
  onAdd: (player: Omit<Player, 'id' | 'gamesPlayed'>) => void;
}

const AddPlayerForm: React.FC<AddPlayerFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [level, setLevel] = useState(7);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, gender, level });
    setName('');
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-bold hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 group"
      >
        <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 group-hover:scale-110 transition-all text-xl">＋</span>
        <span>新增球友</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border-4 border-indigo-500 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                新增球友
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">球友名稱</label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
                    placeholder="例如：王小明"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">性別</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: Gender.MALE, label: '👦 男', color: 'bg-blue-50 border-blue-200 text-blue-600' },
                        { val: Gender.FEMALE, label: '👧 女', color: 'bg-pink-50 border-pink-200 text-pink-600' },
                        { val: Gender.OTHER, label: '👽 其它', color: 'bg-slate-50 border-slate-200 text-slate-600' }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setGender(opt.val)}
                          className={`py-2 rounded-xl border-2 font-bold text-sm transition-all ${gender === opt.val ? 'ring-2 ring-offset-1 ring-indigo-500 ' + opt.color.replace('bg-', 'bg-opacity-100 ') : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 ' + opt.color}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">強度 (1-15): <span className="text-indigo-600 font-black text-lg">{level}</span></label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-bold mt-1">
                    <span>新手 (1)</span>
                    <span>中手 (8)</span>
                    <span>高手 (15)</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95 text-lg"
                  >
                    確認加入
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddPlayerForm;
