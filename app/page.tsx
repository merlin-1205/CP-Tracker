// app/page.tsx
// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import 'react-tooltip/dist/react-tooltip.css';
import Link from 'next/link';
import { Brain, Trophy, MoveRight, Loader2 } from 'lucide-react';
import { format, subYears, eachDayOfInterval } from 'date-fns';
import AddActivityButton from '@/components/AddActivityButton';

// Firebase imports
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function để phân cấp màu sắc cho Problems
const getProblemClass = (count: number) => {
  if (count === 0) return 'color-empty';
  if (count <= 3) return 'color-problem-1';
  if (count <= 7) return 'color-problem-2';
  if (count <= 11) return 'color-problem-3';
  return 'color-problem-4';
};

// Helper function để phân cấp màu sắc cho Contests
const getContestClass = (count: number) => {
  if (count === 0) return 'color-empty';
  if (count === 1) return 'color-contest-1';
  return 'color-contest-2';
};

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
            // Chỉ mở tab mới xem chi tiết nếu ngày đó THỰC SỰ có hoạt động (count > 0)
            if (value && value.date && value.count > 0) {
              window.open(`/details/${value.date}`, '_blank');
            }
          }}
        />
        <ReactTooltip id={`heatmap-tooltip-${title}`} />
      </div>
    </div>
  );
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [problemsData, setProblemsData] = useState<any[]>([]);
  const [contestsData, setContestsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const q = query(collection(db, "cp_activities"));
        const snapshot = await getDocs(q);
        
        // Obects để gom nhóm dữ liệu theo ngày
        const problemCounts: Record<string, number> = {};
        const contestCounts: Record<string, number> = {};

        snapshot.forEach((doc) => {
          const data = doc.data();
          const dateStr = data.createdAt; // Format: YYYY-MM-DD
          
          if (data.type === 'problem') {
            problemCounts[dateStr] = (problemCounts[dateStr] || 0) + 1;
          } else if (data.type === 'contest') {
            contestCounts[dateStr] = (contestCounts[dateStr] || 0) + 1;
          }
        });

        // TẠO MẢNG CHỨA ĐẦY ĐỦ 365 NGÀY (Để Tooltip luôn có dữ liệu)
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
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">CP Contribution</h1>
            <p className="text-gray-500 mt-1">Những nỗ lực thầm lặng hôm nay sẽ được thời gian trả lời vào ngày mai.</p>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm shadow-sm">
            Vào Dashboard <MoveRight className="w-4 h-4" />
          </Link>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p>Đang đồng bộ dữ liệu từ vệ tinh Firebase...</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-10 animate-in fade-in duration-500">
            {/* PROBLEMS Heatmap */}
            <HeatmapBox 
              title="PROBLEMS" 
              icon={Brain}
              data={problemsData}
              getColorClass={getProblemClass}
              getTooltip={(value: any) => {
                if (!value || !value.date) return '';
                const displayDate = format(new Date(value.date), 'dd/MM/yyyy');
                // Thay đổi nội dung tooltip tùy thuộc vào việc có bài làm hay không
                if (value.count === 0) return `${displayDate}: Không có bài tập nào.`;
                return `${displayDate}: ${value.count} bài tập đã giải. Click để xem chi tiết.`;
              }}
            />

            {/* CONTESTS Heatmap */}
            <HeatmapBox 
              title="CONTESTS" 
              icon={Trophy}
              data={contestsData}
              getColorClass={getContestClass}
              getTooltip={(value: any) => {
                if (!value || !value.date) return '';
                const displayDate = format(new Date(value.date), 'dd/MM/yyyy');
                // Thay đổi nội dung tooltip tùy thuộc vào việc có tham gia contest hay không
                if (value.count === 0) return `${displayDate}: Không tham gia contest.`;
                return `${displayDate}: Đã tham gia ${value.count} contest. Click để xem chi tiết.`;
              }}
            />
          </section>
        )}
      </div>

      <AddActivityButton />
    </main>
  );
}