// app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// Đã xóa ArrowLeft, thêm Calendar, LayoutDashboard, Swords cho hệ thống Tab
import { Loader2, Code2, Trophy, Flame, BrainCircuit, BarChart3, MoveRight, Calendar, LayoutDashboard, Swords } from 'lucide-react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// Bảng trọng số để sort độ khó USACO (chữ)
const USACO_WEIGHT: Record<string, number> = {
  'platinum': 4,
  'hard': 4,
  'gold': 3,
  'medium': 3,
  'normal': 2,
  'silver': 2,
  'easy': 1,
  'bronze': 1,
  'unrated': 0
};

// Bảng màu cho Donut Chart
const COLORS = [
  '#ff9999', '#ffb366', '#ffd966', '#c6e2b3', '#99ccff', 
  '#c299ff', '#ff99e6', '#99ffe6', '#e699ff', '#ffb3b3'
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // Dữ liệu đã xử lý
  const [cfProblems, setCfProblems] = useState<any[]>([]);
  const [usacoProblems, setUsacoProblems] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  
  // Dữ liệu cho Biểu đồ
  const [ratingChartData, setRatingChartData] = useState<any[]>([]);
  const [usacoChartData, setUsacoChartData] = useState<any[]>([]);
  const [tagChartData, setTagChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "cp_activities"));
        const snapshot = await getDocs(q);
        
        const rawProblems: any[] = [];
        const rawContests: any[] = [];

        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() } as any;
          if (data.type === 'problem') rawProblems.push(data);
          else if (data.type === 'contest') rawContests.push(data);
        });

        // 1. XỬ LÝ BÀI TẬP (Phân loại & Sort)
        const cf: any[] = [];
        const usaco: any[] = [];
        const tagCounts: Record<string, number> = {};
        const ratingCounts: Record<string, number> = {};
        const usacoCounts: Record<string, number> = {};

        rawProblems.forEach(p => {
          // Gom Tag cho biểu đồ
          if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }

          const isNumeric = !isNaN(Number(p.rating)) && p.rating?.trim() !== '';

          if (isNumeric && p.rating !== '0') {
            cf.push(p);
            ratingCounts[p.rating] = (ratingCounts[p.rating] || 0) + 1;
          } else {
            usaco.push(p);
            // Gom Rating USACO (chữ) cho biểu đồ, chuẩn hóa về chữ thường
            let r = p.rating ? p.rating.trim().toLowerCase() : 'unrated';
            if (r === '0' || r === '') r = 'unrated';
            usacoCounts[r] = (usacoCounts[r] || 0) + 1;
          }
        });

        cf.sort((a, b) => Number(b.rating) - Number(a.rating));

        usaco.sort((a, b) => {
          const weightA = USACO_WEIGHT[a.rating?.toLowerCase()] ?? 0;
          const weightB = USACO_WEIGHT[b.rating?.toLowerCase()] ?? 0;
          return weightB - weightA;
        });

        // 2. XUẤT DỮ LIỆU BIỂU ĐỒ
        const barData = Object.entries(ratingCounts)
          .map(([rating, count]) => ({ rating, count }))
          .sort((a, b) => Number(a.rating) - Number(b.rating));

        // Format và Sort biểu đồ USACO theo trọng số (Dễ -> Khó)
        const usacoBarData = Object.entries(usacoCounts)
          .map(([rating, count]) => ({ 
            rating: rating.toUpperCase(), 
            count, 
            weight: USACO_WEIGHT[rating] ?? 0 
          }))
          .sort((a, b) => a.weight - b.weight);

        const pieData = Object.entries(tagCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        // 3. XỬ LÝ CONTEST
        rawContests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setCfProblems(cf);
        setUsacoProblems(usaco);
        setContests(rawContests);
        setRatingChartData(barData);
        setUsacoChartData(usacoBarData);
        setTagChartData(pieData);

      } catch (error) {
        console.error("Lỗi tải dữ liệu Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalContests = contests.length;
  const totalContestProblems = contests.reduce((acc, curr) => acc + (curr.solvedCount || 0), 0);
  const avgProblemsPerContest = totalContests > 0 ? (totalContestProblems / totalContests).toFixed(1) : 0;
  
  const numericRanks = contests
    .map(c => parseInt(c.rank))
    .filter(r => !isNaN(r) && r > 0);
  const bestRank = numericRanks.length > 0 ? Math.min(...numericRanks) : 'N/A';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Đang tổng hợp dữ liệu Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* --- TABS HEADER (Đã đồng bộ với trang chủ) --- */}
        <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Thống kê Tổng quan</h1>
              <p className="text-gray-500 mt-1">Phân tích chuyên sâu về phong độ và kỹ năng.</p>
            </div>

            {/* Điều hướng Tabs - Tab Dashboard đang được Active */}
            <nav className="flex items-center p-1.5 bg-gray-200/50 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 w-full lg:w-auto overflow-x-auto">
              <Link 
                href="/" 
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Calendar className="w-4 h-4" /> Tổng quan
              </Link>
              <Link 
                href="/dashboard" 
                className="px-5 py-2.5 text-sm font-bold rounded-lg bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
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

        {/* SECTION 1: RATING CHARTS (CF & USACO) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Biểu đồ CF */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Phân bố Rating (Codeforces)
            </h2>
            <div className="h-64 w-full">
              {ratingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="rating" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số bài" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 italic">Chưa có dữ liệu rating CF.</div>
              )}
            </div>
          </div>

          {/* Biểu đồ USACO */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> Phân bố Độ khó (USACO)
            </h2>
            <div className="h-64 w-full">
              {usacoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usacoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="rating" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Số bài" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 italic">Chưa có dữ liệu độ khó USACO.</div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: TAGS (Trải dài 2 cột) */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-500" /> Tần suất Dạng bài (Tags)
          </h2>
          <div className="h-80 w-full">
            {tagChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tagChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tagChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">Chưa có dữ liệu tags.</div>
            )}
          </div>
        </section>

        {/* SECTION 3: CONTEST STATS */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
            <Trophy className="w-6 h-6 text-yellow-500" /> Thống kê Contest
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 font-medium">Tổng số Contest</p>
              <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">{totalContests}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 font-medium">Tổng bài đã giải</p>
              <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">{totalContestProblems}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 font-medium">Trung bình / Contest</p>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{avgProblemsPerContest}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 font-medium">Rank cao nhất</p>
              <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400 mt-1">{bestRank}</p>
            </div>
          </div>
        </section>

        {/* SECTION 4: DANH SÁCH BÀI TẬP */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CỘT CODEFORCES */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
              <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Codeforces (Hệ số)</h2>
              <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 py-1 px-3 rounded-full text-sm font-bold">{cfProblems.length}</span>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700">
                {cfProblems.length > 0 ? cfProblems.map(p => (
                  <Link 
                    href={`/details/${p.createdAt}`} 
                    key={p.id} 
                    className="block p-4 hover:bg-blue-50 dark:hover:bg-gray-750 transition-colors group cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">Giải ngày: {p.createdAt}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-sm bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                          {p.rating}
                        </span>
                        <MoveRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </Link>
                )) : (
                  <p className="p-6 text-center text-gray-400 italic">Chưa có bài tập Codeforces nào.</p>
                )}
              </div>
            </div>
          </div>

          {/* CỘT USACO */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800/50">
              <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              <h2 className="text-xl font-bold text-orange-900 dark:text-orange-100">USACO & Khác (Hệ chữ)</h2>
              <span className="ml-auto bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 py-1 px-3 rounded-full text-sm font-bold">{usacoProblems.length}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700">
                {usacoProblems.length > 0 ? usacoProblems.map(p => (
                  <Link 
                    href={`/details/${p.createdAt}`} 
                    key={p.id} 
                    className="block p-4 hover:bg-orange-50 dark:hover:bg-gray-750 transition-colors group cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{p.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">Giải ngày: {p.createdAt}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold uppercase bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                          {p.rating || 'N/A'}
                        </span>
                        <MoveRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </div>
                  </Link>
                )) : (
                  <p className="p-6 text-center text-gray-400 italic">Chưa có bài tập USACO nào.</p>
                )}
              </div>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}