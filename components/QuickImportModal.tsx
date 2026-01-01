
import React, { useState } from 'react';
import { Player, Gender } from '../types';
import { geminiService } from '../services/geminiService';

interface QuickImportModalProps {
  onClose: () => void;
  onImport: (players: Omit<Player, 'id' | 'gamesPlayed' | 'status'>[]) => void;
}

const QuickImportModal: React.FC<QuickImportModalProps> = ({ onClose, onImport }) => {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<Omit<Player, 'id' | 'gamesPlayed' | 'status'>[]>([]);

  // AI 智慧解析
  const handleSmartParse = async () => {
    if (!text.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await geminiService.parsePlayers(text);
      const formatted = parsed.map(p => ({
        name: p.name || '未命名',
        gender: (p.gender as Gender) || Gender.MALE,
        level: p.level || 7
      }));
      setPreview(formatted);
    } catch (error) {
      alert("AI 解析失敗，請嘗試使用普通解析或手動輸入。");
    } finally {
      setIsParsing(false);
    }
  };

  // 普通格式解析 (Regex)
  const handleNormalParse = () => {
    if (!text.trim()) return;
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const results: Omit<Player, 'id' | 'gamesPlayed' | 'status'>[] = [];

    lines.forEach(line => {
      // 1. 移除行首數字 (例如 1. 2) [3])
      let cleanLine = line.replace(/^[\d\s.\])-]+/, '').trim();
      if (!cleanLine) return;

      // 2. 以空白、斜線、逗號切割
      const parts = cleanLine.split(/[\s/、,]+/).filter(p => p);
      
      let name = parts[0] || '未命名';
      let gender = Gender.MALE;
      let level = 7;

      // 3. 遍歷零件尋找性別與強度
      parts.forEach(part => {
        if (part.includes('女')) gender = Gender.FEMALE;
        if (part.includes('男')) gender = Gender.MALE;
        
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= 15) {
          level = num;
        }
      });

      results.push({ name, gender, level });
    });

    if (results.length === 0) {
      alert("無法辨識格式，請確認文字內容。");
      return;
    }
    setPreview(results);
  };

  const updatePreviewLevel = (index: number, newLevel: number) => {
    const nextPreview = [...preview];
    nextPreview[index] = { ...nextPreview[index], level: Math.max(1, Math.min(15, newLevel)) };
    setPreview(nextPreview);
  };

  const togglePreviewGender = (index: number) => {
    const nextPreview = [...preview];
    const currentGender = nextPreview[index].gender;
    let nextGender: Gender;
    
    if (currentGender === Gender.MALE) nextGender = Gender.FEMALE;
    else if (currentGender === Gender.FEMALE) nextGender = Gender.OTHER;
    else nextGender = Gender.MALE;

    nextPreview[index] = { ...nextPreview[index], gender: nextGender };
    setPreview(nextPreview);
  };

  const handleConfirm = () => {
    onImport(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </span>
            球友名單匯入
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {!preview.length ? (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">貼上名單內容</label>
                <span className="text-[10px] text-slate-400">支援：1. 姓名 性別 強度</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="直接貼上 Line 群組名單，例如：
1. 王大明 男 10
2. 陳小美 女 5
小李/男/8..."
                className="w-full h-64 p-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all resize-none font-mono text-sm bg-slate-50"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">預覽並調整 ({preview.length} 位)</label>
                <button 
                  onClick={() => setPreview([])} 
                  className="text-indigo-600 text-sm font-bold hover:underline"
                >
                  ← 重新輸入文字
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {preview.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-300 transition-colors group">
                    <button 
                      onClick={() => togglePreviewGender(i)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 transition-all shadow-sm active:scale-90 ${
                        p.gender === Gender.FEMALE ? 'bg-pink-400' : 
                        p.gender === Gender.MALE ? 'bg-blue-400' : 'bg-slate-400'
                      }`}
                    >
                      {p.name.charAt(0)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 truncate text-sm flex items-center justify-between">
                        {p.name}
                        <button 
                          onClick={() => togglePreviewGender(i)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter text-white transition-all active:scale-95 ${
                            p.gender === Gender.FEMALE ? 'bg-pink-400' : 
                            p.gender === Gender.MALE ? 'bg-blue-400' : 'bg-slate-400'
                          } shadow-sm`}
                        >
                          {p.gender}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-0.5 shadow-sm">
                          <span className="text-[9px] font-black text-slate-400 uppercase mr-1">LV</span>
                          <button onClick={() => updatePreviewLevel(i, p.level - 1)} className="text-slate-400 hover:text-indigo-600 font-bold px-1.5">-</button>
                          <span className="text-[11px] font-black w-4 text-center text-slate-700">{p.level}</span>
                          <button onClick={() => updatePreviewLevel(i, p.level + 1)} className="text-slate-400 hover:text-indigo-600 font-bold px-1.5">+</button>
                        </div>
                        <button onClick={() => setPreview(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t">
          {!preview.length ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleNormalParse}
                disabled={!text.trim()}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-lg hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-50"
              >
                普通解析 (條列式)
              </button>
              <button
                onClick={handleSmartParse}
                disabled={isParsing || !text.trim()}
                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3"
              >
                {isParsing && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isParsing ? "AI 解析中..." : "AI 智慧解析"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-100 transition-all active:scale-95"
            >
              確認匯入 ({preview.length} 位)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickImportModal;
