// components/EditActivityModal.tsx
"use client";

import React, { useState } from 'react';
import { Settings, X, Loader2, Trash2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const AVAILABLE_TAGS = [
  'Jump Pointers', 'DSU Rollback', 'Mo\'s Algorithm', 'Aho-Corasick', 
  'DP', 'Graph', 'Math', 'Greedy', 'Binary Search', 'Segment Tree'
];

export default function EditActivityModal({ activity }: { activity: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Khởi tạo state bằng dữ liệu cũ của activity
  const [title, setTitle] = useState(activity.title || '');
  const [link, setLink] = useState(activity.link || '');
  const [notes, setNotes] = useState(activity.notes || '');

  // Dành riêng cho Problem
  const [rating, setRating] = useState(activity.rating || '0');
  const [timeTaken, setTimeTaken] = useState<number | ''>(activity.timeTaken || 0);
  const [submissions, setSubmissions] = useState<number | ''>(activity.submissions || 0);
  const [selectedTags, setSelectedTags] = useState<string[]>(activity.tags || []);

  // Dành riêng cho Contest
  const [solvedCount, setSolvedCount] = useState<number | ''>(activity.solvedCount || 0);
  const [rank, setRank] = useState(activity.rank || '');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // HÀM CẬP NHẬT
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const activityRef = doc(db, "cp_activities", activity.id);
      
      const baseData = {
        title: title.trim(),
        link: link.trim() || null,
        notes: notes.trim() || null,
      };

      const specificData = activity.type === 'problem' ? {
        rating,
        timeTaken: Number(timeTaken) || 0,
        submissions: Number(submissions) || 0,
        tags: selectedTags,
      } : {
        solvedCount: Number(solvedCount) || 0,
        rank: rank.trim() || null,
      };

      await updateDoc(activityRef, { ...baseData, ...specificData });
      
      setIsOpen(false);
      router.refresh(); // Tải lại dữ liệu Server Component ngay lập tức
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      alert("Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  // HÀM XÓA
  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${activity.title}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, "cp_activities", activity.id));
      setIsOpen(false);
      router.refresh(); // Tải lại dữ liệu Server Component
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Xóa thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Nút Setting (Bánh răng) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="Chỉnh sửa hoặc Xóa"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Modal Chỉnh Sửa */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> 
                Config {activity.type === 'problem' ? 'Bài tập' : 'Contest'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              {/* Thông tin chung */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tên *</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Link URL</label>
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />

              {/* TRƯỜNG NHẬP LIỆU CHO PROBLEM */}
              {activity.type === 'problem' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Rating</label>
                      <input type="text" value={rating} onChange={(e) => setRating(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Thời gian (phút)</label>
                      <input type="number" min="0" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Submits</label>
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
              {activity.type === 'contest' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Số bài làm được *</label>
                    <input required type="number" min="0" value={solvedCount} onChange={(e) => setSolvedCount(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Hạng (Rank)</label>
                    <input type="text" value={rank} onChange={(e) => setRank(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent" />
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>

              {/* Khu vực nút bấm */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={loading || !title}
                  className="flex-1 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 text-white dark:text-gray-900 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "LƯU THAY ĐỔI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}