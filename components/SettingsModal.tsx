import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNames: string[];
  onSave: (newNames: string[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentNames, onSave }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(currentNames.join('\n'));
    }
  }, [isOpen, currentNames]);

  if (!isOpen) return null;

  const handleSave = () => {
    const names = text
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    // 去重
    const uniqueNames = Array.from(new Set(names));
    
    if (uniqueNames.length === 0) {
      alert("名单不能为空！");
      return;
    }

    onSave(uniqueNames);
    alert(`成功导入 ${uniqueNames.length} 位名单，系统已自动重置抽奖池。`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-red-950 border-4 border-yellow-600 rounded-3xl p-10 w-full max-w-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
        <h2 className="text-4xl text-yellow-500 font-shufa mb-6 text-center">
          名单配置中心
        </h2>
        
        <p className="text-yellow-700/70 mb-4 text-center">
          请在下方输入或粘贴老师名单，每行一个姓名。<br/>
          <span className="text-red-500/80">注意：保存名单后将自动清空当前中奖记录并重置抽奖池。</span>
        </p>

        <textarea
          className="w-full h-[50vh] bg-black/40 text-yellow-100 p-6 rounded-2xl border-2 border-yellow-900/50 focus:border-yellow-400 outline-none text-xl resize-none font-mono tracking-wider transition-all"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="教师姓名A&#10;教师姓名B&#10;教师姓名C..."
        />

        <div className="flex justify-between items-center mt-8">
            <div className="text-yellow-900">
                当前预览行数: <span className="text-yellow-500 font-bold">{text.split('\n').filter(n=>n.trim()).length}</span>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 text-yellow-700 hover:text-yellow-400 font-bold"
              >
                取消返回
              </button>
              <Button onClick={handleSave} className="px-12 py-3">
                保存并重置全局
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
};