// app/notes/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, LayoutDashboard, Swords, StickyNote, 
  Plus, X, Loader2, Trash2, Clock, Tag, Settings 
} from 'lucide-react';
import { format } from 'date-fns';
import { collection, getDocs, query, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NotesPage() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  
  // States cho Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Để phân biệt đang Thêm mới hay Chỉnh sửa
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Form States
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('Lý thuyết');

  const CATEGORIES = ['Lý thuyết', 'Trick Code', 'Bug Checklist', 'Toán học', 'Nhật ký CP', 'Khác'];

  // Lấy dữ liệu Notes từ Firebase
  const fetchNotes = async () => {
    try {
      const q = query(collection(db, "cp_notes"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      
      const notesList: any[] = [];
      snapshot.forEach(doc => {
        notesList.push({ id: doc.id, ...doc.data() });
      });
      
      setNotes(notesList);
    } catch (error) {
      console.error("Lỗi khi tải Notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Mở Modal Thêm Mới
  const handleOpenAddModal = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('Lý thuyết');
    setEditingNoteId(null); // Đặt null để báo hiệu là thêm mới
    setIsModalOpen(true);
  };

  // Mở Modal Chỉnh Sửa
  const handleOpenEditModal = (note: any) => {
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category || 'Lý thuyết');
    setEditingNoteId(note.id); // Lưu lại ID đang sửa
    setIsModalOpen(true);
  };

  // Xử lý Lưu Note (Bao gồm cả Thêm và Sửa)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (editingNoteId) {
        // --- CHẾ ĐỘ SỬA ---
        await updateDoc(doc(db, "cp_notes", editingNoteId), {
          title: noteTitle.trim(),
          content: noteContent.trim(),
          category: noteCategory
          // Không update thời gian để giữ nguyên vị trí trên timeline
        });
      } else {
        // --- CHẾ ĐỘ THÊM MỚI ---
        await addDoc(collection(db, "cp_notes"), {
          title: noteTitle.trim(),
          content: noteContent.trim(),
          category: noteCategory,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
      }
      
      // Đóng modal và reset
      setIsModalOpen(false);
      setEditingNoteId(null);
      fetchNotes();
    } catch (error) {
      alert("Lỗi khi lưu ghi chú!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xóa Note
  const handleDeleteNote = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ghi chú "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "cp_notes", id));
      fetchNotes();
    } catch (error) {
      alert("Lỗi khi xóa ghi chú!");
    }
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'Lý thuyết': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
      case 'Trick Code': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
      case 'Bug Checklist': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
      case 'Toán học': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* --- TABS HEADER --- */}
        <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Nhật ký & Ghi chú</h1>
              <p className="text-gray-500 mt-1">Lưu trữ kiến thức, trick hay và những bài học đắt giá.</p>
            </div>

            {/* Điều hướng Tabs */}
            <nav className="flex items-center p-1.5 bg-gray-200/50 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 w-full lg:w-auto overflow-x-auto">
              <Link 
                href="/" 
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Calendar className="w-4 h-4" /> Tổng quan
              </Link>
              <Link 
                href="/notes" 
                className="px-5 py-2.5 text-sm font-bold rounded-lg bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <StickyNote className="w-4 h-4" /> Notes
              </Link>
              <Link 
                href="/dashboard" 
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link 
                href="/tower" 
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Swords className="w-4 h-4" /> Leo tháp
              </Link>
            </nav>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p>Đang tải dòng thời gian...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            
            {/* --- MUI TIMELINE DESIGN (TAILWIND CSS) --- */}
            {notes.length > 0 ? (
              <div className="relative border-l-[3px] border-blue-100 dark:border-gray-800 ml-4 md:ml-6 space-y-10 pb-10">
                {notes.map((note) => (
                  <div key={note.id} className="relative pl-8 md:pl-10 group">
                    
                    {/* Dấu chấm Timeline */}
                    <div className="absolute w-5 h-5 bg-blue-500 rounded-full -left-[11px] top-1.5 border-4 border-gray-50 dark:border-gray-900 shadow-sm transition-transform group-hover:scale-125 group-hover:bg-blue-600" />
                    
                    {/* Content Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 relative">
                      
                      {/* Khu vực nút Sửa/Xóa (ẩn hiện khi hover) */}
                      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenEditModal(note)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Sửa Note"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          title="Xóa Note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-3 pr-16">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" /> 
                          {note.createdAt ? format(new Date(note.createdAt), 'dd/MM/yyyy - HH:mm') : 'N/A'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getCategoryColor(note.category)}`}>
                          <Tag className="w-3 h-3" /> {note.category}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 pr-16">{note.title}</h3>
                      
                      <div className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-[15px]">
                        {note.content}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                <StickyNote className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Dòng thời gian đang trống</p>
                <p className="text-sm mt-1">Hãy bấm nút (+) bên dưới để lưu lại những kiến thức đầu tiên.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- NÚT FAB (FLOATING ACTION BUTTON) --- */}
      <button
        onClick={handleOpenAddModal}
        className="fixed bottom-10 right-10 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_8px_30px_rgb(37,99,235,0.3)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40 border-4 border-white dark:border-gray-900"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* --- MODAL FORM (Dùng chung cho THÊM và SỬA) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingNoteId ? (
                  <><Settings className="w-5 h-5 text-blue-500" /> Chỉnh sửa Ghi chú</>
                ) : (
                  <><StickyNote className="w-5 h-5 text-blue-500" /> Thêm Ghi chú mới</>
                )}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tiêu đề Ghi chú *</label>
                <input 
                  required 
                  autoFocus 
                  type="text" 
                  value={noteTitle} 
                  onChange={(e) => setNoteTitle(e.target.value)} 
                  placeholder="VD: Nhắc nhở khi xài Segment Tree..." 
                  className="w-full px-5 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phân loại (Category)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setNoteCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        noteCategory === cat 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nội dung Ghi chú *</label>
                <textarea 
                  required
                  rows={8} 
                  value={noteContent} 
                  onChange={(e) => setNoteContent(e.target.value)} 
                  placeholder="- Điểm cần lưu ý 1...&#10;- Công thức: dp[i] = max(...)&#10;- Lỗi thường gặp: Quên khởi tạo mảng..."
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all font-mono text-sm leading-relaxed" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="submit"
                  disabled={isSubmitting || !noteTitle || !noteContent} 
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingNoteId ? "CẬP NHẬT GHI CHÚ" : "LƯU VÀO TIMELINE")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}