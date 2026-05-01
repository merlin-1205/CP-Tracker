// app/page.tsx
// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import 'react-tooltip/dist/react-tooltip.css';
import Link from 'next/link';
import { 
  Brain, Trophy, MoveRight, Loader2, Timer, Calendar, 
  Trash2, Plus, X, Globe, Star, Clock, LayoutDashboard, Swords, StickyNote, Hash
} from 'lucide-react';
import { format, subYears, eachDayOfInterval } from 'date-fns';
import AddActivityButton from '@/components/AddActivityButton';

// Firebase imports
import { collection, getDocs, query, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- HELPER FUNCTIONS CHO HEATMAP ---
const getProblemClass = (count: number) => {
  if (count === 0) return 'color-empty';
  if (count <= 3) return 'color-problem-1';
  if (count <= 7) return 'color-problem-2';
  if (count <= 11) return 'color-problem-3';
  return 'color-problem-4';
};

const getContestClass = (count: number) => {
  if (count === 0) return 'color-empty';
  if (count === 1) return 'color-contest-1';
  return 'color-contest-2';
};

// --- COMPONENT HEATMAP BOX ---
const HeatmapBox = ({ title, icon: Icon, data, getTooltip, getColorClass }: any) => {
  const today = new Date();
  const oneYearAgo = subYears(today, 1);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-gray-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <span className="text-sm text-gray-400">Năm 2026</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <CalendarHeatmap
          startDate={oneYearAgo}
          endDate={today}
          values={data}
          classForValue={(value) => {
            if (!value) return 'color-empty';
            return getColorClass(value.count);
          }}
          tooltipDataAttrs={(value) => {
            if (!value || !value.date) return null;
            return {
              'data-tooltip-id': `heatmap-tooltip-${title}`,
              'data-tooltip-content': getTooltip(value),
            };
          }}
          onClick={(value) => {
            if (value && value.date && value.count > 0) {
              // Sử dụng window.location.href để chuyển trang an toàn và không bị chặn
              window.location.href = `/details/${value.date}`;
            }
          }}
        />
        <ReactTooltip id={`heatmap-tooltip-${title}`} />
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function Home() {
  const [loading, setLoading] = useState(true);
  
  // State Heatmap
  const [problemsData, setProblemsData] = useState<any[]>([]);
  const [contestsData, setContestsData] = useState<any[]>([]);

  // State Upcoming Contests
  const [upcomingContests, setUpcomingContests] = useState<any[]>([]);
  const [isAddingUpcoming, setIsAddingUpcoming] = useState(false);
  const [isSubmittingUpcoming, setIsSubmittingUpcoming] = useState(false);
  
  // State Countdown
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  // Form State cho Upcoming Contest
  const [upcTitle, setUpcTitle] = useState('');
  const [upcPlatform, setUpcPlatform] = useState('Codeforces');
  const [upcStartDate, setUpcStartDate] = useState('');
  const [upcStartTimeValue, setUpcStartTimeValue] = useState('');
  const [upcDuration, setUpcDuration] = useState<number | ''>(120);
  const [upcProblemCount, setUpcProblemCount] = useState<number | ''>(''); 
  const [upcIsRated, setUpcIsRated] = useState(true);

  const fetchActivities = async () => {
    try {
      // 1. Fetch Heatmap Data
      const q = query(collection(db, "cp_activities"));
      const snapshot = await getDocs(q);
      
      const problemCounts: Record<string, number> = {};
      const contestCounts: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const dateStr = data.createdAt; 
        
        if (data.type === 'problem') {
          problemCounts[dateStr] = (problemCounts[dateStr] || 0) + 1;
        } else if (data.type === 'contest') {
          contestCounts[dateStr] = (contestCounts[dateStr] || 0) + 1;
        }
      });

      const today = new Date();
      const oneYearAgo = subYears(today, 1);
      const allDaysInYear = eachDayOfInterval({ start: oneYearAgo, end: today });

      const fullProblemsArray = allDaysInYear.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return { date: dateStr, count: problemCounts[dateStr] || 0 };
      });

      const fullContestsArray = allDaysInYear.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return { date: dateStr, count: contestCounts[dateStr] || 0 };
      });

      setProblemsData(fullProblemsArray);
      setContestsData(fullContestsArray);

      // 2. Fetch Upcoming Contests
      const upcQ = query(collection(db, "upcoming_contests"));
      const upcSnapshot = await getDocs(upcQ);
      const upcList: any[] = [];
      upcSnapshot.forEach(doc => {
        upcList.push({ id: doc.id, ...doc.data() });
      });

      const now = new Date().getTime();
      const validUpcoming = upcList
        .filter(c => new Date(c.startTime).getTime() > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      setUpcomingContests(validUpcoming);

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu từ Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // --- LOGIC COUNTDOWN ---
  useEffect(() => {
    if (upcomingContests.length === 0) {
      setTimeLeft(null);
      return;
    }

    const nearestContest = upcomingContests[0];
    const targetDate = new Date(nearestContest.startTime).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft(null);
        fetchActivities(); 
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingContests]);

  // --- HANDLERS CHO UPCOMING CONTEST ---
  const handleAddUpcoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upcTitle || !upcStartDate || !upcStartTimeValue || !upcDuration) return;
    setIsSubmittingUpcoming(true);

    const combinedDateTime = `${upcStartDate}T${upcStartTimeValue}`;

    try {
      await addDoc(collection(db, "upcoming_contests"), {
        title: upcTitle.trim(),
        platform: upcPlatform,
        startTime: combinedDateTime, 
        duration: Number(upcDuration),
        problemCount: Number(upcProblemCount) || 0,
        isRated: upcIsRated,
        timestamp: serverTimestamp()
      });
      
      setIsAddingUpcoming(false);
      resetUpcForm();
      fetchActivities(); 
    } catch (error) {
      alert("Lỗi khi thêm Contest!");
    } finally {
      setIsSubmittingUpcoming(false);
    }
  };

  const resetUpcForm = () => {
    setUpcTitle(''); 
    setUpcPlatform('Codeforces'); 
    setUpcStartDate(''); 
    setUpcStartTimeValue(''); 
    setUpcDuration(120); 
    setUpcProblemCount('');
    setUpcIsRated(true);
  };

  const handleDeleteUpcoming = async (id: string, title: string) => {
    if(!window.confirm(`Xóa contest "${title}" khỏi hàng đợi?`)) return;
    try {
      await deleteDoc(doc(db, "upcoming_contests", id));
      fetchActivities();
    } catch (error) {
      alert("Lỗi khi xóa!");
    }
  };

  const getPlatformColors = (platform: string) => {
    switch(platform) {
      case 'Codeforces': return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'AtCoder': return 'bg-gray-800 text-white border-gray-700 dark:bg-black dark:border-gray-800';
      case 'VNOI': return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* --- TABS HEADER MỚI --- */}
        <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">CP Contribution</h1>
              <p className="text-gray-500 mt-1">Những nỗ lực thầm lặng hôm nay sẽ được thời gian trả lời vào ngày mai.</p>
            </div>

            {/* Điều hướng Tabs */}
            <nav className="flex items-center p-1.5 bg-gray-200/50 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 w-full lg:w-auto overflow-x-auto">
              <Link 
                href="/" 
                className="px-5 py-2.5 text-sm font-bold rounded-lg bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Calendar className="w-4 h-4" /> Tổng quan
              </Link>
              <Link 
                href="/notes" 
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2 whitespace-nowrap"
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
            <p>Đang đồng bộ dữ liệu từ vệ tinh Firebase...</p>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            
            {/* --- BANNER COUNTDOWN --- */}
            {upcomingContests.length > 0 && timeLeft && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-400/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Timer className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-0.5 bg-white/20 text-[10px] font-bold uppercase rounded backdrop-blur-sm">
                        {upcomingContests[0].platform}
                      </span>
                      {upcomingContests[0].problemCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-500/30 px-2 py-0.5 rounded border border-green-400/30">
                          <Hash className="w-3 h-3" /> {upcomingContests[0].problemCount} bài
                        </span>
                      )}
                      {upcomingContests[0].isRated && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/30">
                          <Star className="w-3 h-3 fill-yellow-300" /> Rated
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold">{upcomingContests[0].title}</h2>
                    <p className="text-blue-100 text-sm mt-0.5">
                      {format(new Date(upcomingContests[0].startTime), 'HH:mm - dd/MM/yyyy')} 
                      <span className="mx-2">•</span> 
                      {upcomingContests[0].duration} phút
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm min-w-[70px]">
                    <span className="text-2xl font-black">{String(timeLeft.d).padStart(2, '0')}</span>
                    <span className="text-[10px] font-medium text-blue-100 uppercase">Ngày</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-200">:</span>
                  <div className="flex flex-col items-center bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm min-w-[70px]">
                    <span className="text-2xl font-black">{String(timeLeft.h).padStart(2, '0')}</span>
                    <span className="text-[10px] font-medium text-blue-100 uppercase">Giờ</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-200">:</span>
                  <div className="flex flex-col items-center bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm min-w-[70px]">
                    <span className="text-2xl font-black">{String(timeLeft.m).padStart(2, '0')}</span>
                    <span className="text-[10px] font-medium text-blue-100 uppercase">Phút</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-200">:</span>
                  <div className="flex flex-col items-center bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm min-w-[70px]">
                    <span className="text-2xl font-black">{String(timeLeft.s).padStart(2, '0')}</span>
                    <span className="text-[10px] font-medium text-blue-100 uppercase">Giây</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- KHU VỰC HEATMAPS --- */}
            <section className="grid grid-cols-1 gap-10">
              <HeatmapBox 
                title="PROBLEMS" icon={Brain} data={problemsData} getColorClass={getProblemClass}
                getTooltip={(value: any) => {
                  if (!value || !value.date) return '';
                  const displayDate = format(new Date(value.date), 'dd/MM/yyyy');
                  if (value.count === 0) return `${displayDate}: Không có bài tập nào.`;
                  return `${displayDate}: ${value.count} bài tập đã giải. Click để xem chi tiết.`;
                }}
              />
              <HeatmapBox 
                title="CONTESTS" icon={Trophy} data={contestsData} getColorClass={getContestClass}
                getTooltip={(value: any) => {
                  if (!value || !value.date) return '';
                  const displayDate = format(new Date(value.date), 'dd/MM/yyyy');
                  if (value.count === 0) return `${displayDate}: Không tham gia contest.`;
                  return `${displayDate}: Đã tham gia ${value.count} contest. Click để xem chi tiết.`;
                }}
              />
            </section>

            {/* --- KHU VỰC UPCOMING CONTEST (HÀNG ĐỢI) --- */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-indigo-500" />
                  <h2 className="text-xl font-bold">Hàng đợi Contest sắp tới</h2>
                </div>
                <button 
                  onClick={() => setIsAddingUpcoming(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-lg text-sm font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Thêm Lịch
                </button>
              </div>

              {upcomingContests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingContests.map((c) => (
                    <div key={c.id} className={`p-5 rounded-xl border relative group transition-all bg-gray-50 dark:bg-gray-900/50 ${getPlatformColors(c.platform)}`}>
                      <button 
                        onClick={() => handleDeleteUpcoming(c.id, c.title)}
                        className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded transition-all"
                        title="Xóa khỏi hàng đợi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="pr-8">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold opacity-70">
                          <span className="uppercase flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {c.platform}
                          </span>
                          {c.problemCount > 0 && (
                            <span className="bg-gray-200 dark:bg-gray-700 px-1.5 rounded text-gray-800 dark:text-gray-200">
                              {c.problemCount} bài
                            </span>
                          )}
                          {c.isRated && (
                            <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" /> Rated
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-4 line-clamp-2">{c.title}</h3>
                        
                        <div className="space-y-1.5">
                          <p className="text-sm flex items-center gap-2 font-medium opacity-90">
                            <Calendar className="w-4 h-4" /> 
                            {format(new Date(c.startTime), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm flex items-center gap-2 font-medium opacity-90">
                            <Clock className="w-4 h-4" /> 
                            {format(new Date(c.startTime), 'HH:mm')} 
                            <span className="opacity-50">|</span> 
                            {c.duration} phút
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Calendar className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
                  <p>Bạn chưa đăng ký tham gia contest nào sắp tới.</p>
                </div>
              )}
            </section>

          </div>
        )}
      </div>

      <AddActivityButton />

      {/* --- MODAL THÊM UPCOMING CONTEST --- */}
      {isAddingUpcoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" /> Lên lịch Contest
              </h2>
              <button onClick={() => setIsAddingUpcoming(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUpcoming} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tên Contest *</label>
                <input required autoFocus type="text" value={upcTitle} onChange={(e) => setUpcTitle(e.target.value)} placeholder="VD: Codeforces Round 999 (Div. 2)" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nền tảng (Platform) *</label>
                <select value={upcPlatform} onChange={(e) => setUpcPlatform(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                  <option value="Codeforces">Codeforces</option>
                  <option value="AtCoder">AtCoder</option>
                  <option value="VNOI">VNOI</option>
                  <option value="LeetCode">LeetCode</option>
                  <option value="Khác">Nền tảng khác</option>
                </select>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ngày *</label>
                  <input required type="date" value={upcStartDate} onChange={(e) => setUpcStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Giờ *</label>
                  <input required type="time" value={upcStartTimeValue} onChange={(e) => setUpcStartTimeValue(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Số bài</label>
                  <input type="number" min="1" value={upcProblemCount} onChange={(e) => setUpcProblemCount(e.target.value ? Number(e.target.value) : '')} placeholder="VD: 6" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Thời lượng (Phút) *</label>
                <input required type="number" min="1" value={upcDuration} onChange={(e) => setUpcDuration(e.target.value ? Number(e.target.value) : '')} placeholder="120" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input type="checkbox" checked={upcIsRated} onChange={(e) => setUpcIsRated(e.target.checked)} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Contest này có tính điểm (Rated)</span>
              </label>

              <button disabled={isSubmittingUpcoming || !upcTitle || !upcStartDate || !upcStartTimeValue || !upcDuration} className="w-full py-3.5 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2">
                {isSubmittingUpcoming ? <Loader2 className="w-5 h-5 animate-spin" /> : "ĐƯA VÀO HÀNG ĐỢI"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}