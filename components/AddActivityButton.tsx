"use client";

import React, { useState } from 'react';
import { Plus, X, Brain, Trophy, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import confetti from 'canvas-confetti';

// Danh sách Tag mặc định
const AVAILABLE_TAGS = [
  'Jump Pointers', 
  'DSU Rollback', 
  'Mo\'s Algorithm', 
  'Aho-Corasick', 
  'DP', 
  'Graph', 
  'Math', 
  'Greedy', 
  'Binary Search',
  'Segment Tree'
];

export default function AddActivityButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'problem' | 'contest'>('problem');
  
  // Trạng thái chung
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  
  // Trạng thái Contest
  const [solvedCount, setSolvedCount] = useState<number | ''>('');
  const [rank, setRank] = useState<string>('');

  // Trạng thái Problem
  const [rating, setRating] = useState<string>('0');
  const [timeTaken, setTimeTaken] = useState<number | ''>(0);
  const [submissions, setSubmissions] = useState<number | ''>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSuccessAnimation = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const resetForm = () => {
    setTitle(''); setLink(''); setNotes('');
    setSolvedCount(''); setRank('');
    setRating('0'); setTimeTaken(0); setSubmissions(0); setSelectedTags([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const baseData = {
        title: title.trim(),
        type,
        link: link.trim() || null,
        notes: notes.trim() || null,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString().split('T')[0]
      };

      const specificData = type === 'problem' ? {
        rating,
        timeTaken: Number(timeTaken) || 0,
        submissions: Number(submissions) || 0,
        tags: selectedTags,
      } : {
        solvedCount: Number(solvedCount) || 0,
        rank: rank.trim() || null,
      };

      await addDoc(collection(db, "cp_activities"), { ...baseData, ...specificData });

      handleSuccessAnimation();
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu: ", error);
      alert("Có lỗi xảy ra trong quá trình lưu dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40 border-4 border-white dark:border-gray-800"
      >
        <Plus className="w-8 h-8" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" /> Thêm hoạt động mới
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Chọn Loại */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <button type="button" onClick={() => setType('problem')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${type === 'problem' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>
                  <Brain className="w-5 h-5" /> Bài tập
                </button>
                <button type="button" onClick={() => setType('contest')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${type === 'contest' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>
                  <Trophy className="w-5 h-5" /> Contest
                </button>
              </div>

              {/* Thông tin chung */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tên {type === 'problem' ? 'bài tập' : 'Contest'} *</label>
                  <input required autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Link URL (Tùy chọn)</label>
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />

              {/* TRƯỜNG NHẬP LIỆU CHO PROBLEM */}
              {type === 'problem' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Rating/Độ khó</label>
                      <input type="text" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="VD: 1800, Hard..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Thời gian làm (phút)</label>
                      <input type="number" min="0" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Số lần submit</label>
                      <input type="number" min="0" value={submissions} onChange={(e) => setSubmissions(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Tags / Dạng bài</label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_TAGS.map(tag => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedTags.includes(tag) ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TRƯỜNG NHẬP LIỆU CHO CONTEST */}
              {type === 'contest' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Số bài làm được *</label>
                      <input required type="number" min="0" value={solvedCount} onChange={(e) => setSolvedCount(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Hạng (Rank)</label>
                      <input type="text" value={rank} onChange={(e) => setRank(e.target.value)} placeholder="VD: 142, Specialist..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú chung (hữu ích để lưu tag gợi ý khi kẹt logic) */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú / Suy ngẫm (Tùy chọn)</label>
                <textarea 
                  rows={3} 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Ghi lại keyword tag, hướng tư duy, hoặc bài học rút ra..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  disabled={loading || !title || (type === 'contest' && solvedCount === '')}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "XÁC NHẬN LƯU"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}