// app/admin/sync/page.tsx
"use client";

import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Database, Code2, Globe } from 'lucide-react';

export default function SyncProblems() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  // ĐỒNG BỘ CODEFORCES
  const syncCodeforces = async () => {
    setLoading(true);
    addLog("Đang kéo dữ liệu từ Codeforces API...");
    try {
      const res = await fetch("https://codeforces.com/api/problemset.problems");
      const data = await res.json();
      if (data.status !== "OK") throw new Error("CF API failed");

      const problems = data.result.problems;
      const buckets: Record<string, any[]> = {};

      // Phân loại vào các Bucket theo Rating
      problems.forEach((p: any) => {
        if (!p.rating) return;
        const rating = p.rating;
        if (!buckets[rating]) buckets[rating] = [];
        
        buckets[rating].push({
          id: `${p.contestId}${p.index}`,
          contestId: p.contestId,
          index: p.index,
          title: p.name,
          tags: p.tags || [],
          rating: rating,
          platform: "Codeforces",
          link: `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`
        });
      });

      addLog(`Đã gom thành ${Object.keys(buckets).length} buckets CF. Bắt đầu đẩy lên Firebase...`);

      // Ghi lên Firebase (Mỗi rating là 1 Document)
      for (const rating of Object.keys(buckets)) {
        await setDoc(doc(db, "problem_buckets", `cf_${rating}`), {
          platform: "Codeforces",
          rating: Number(rating),
          problems: buckets[rating]
        });
        addLog(`Đã lưu Bucket CF Rating ${rating} (${buckets[rating].length} bài)`);
      }

      addLog("✅ HOÀN TẤT ĐỒNG BỘ CODEFORCES!");
    } catch (err) {
      addLog(`❌ Lỗi CF: ${(err as Error).message}`);
    }
    setLoading(false);
  };

  // ĐỒNG BỘ ATCODER (Qua Kenkoooo)
  const syncAtCoder = async () => {
    setLoading(true);
    addLog("Đang kéo danh sách bài AtCoder từ Kenkoooo...");
    try {
      // Lấy danh sách bài
      const resProb = await fetch("https://kenkoooo.com/atcoder/resources/problems.json");
      const acProblems = await resProb.json();

      addLog("Đang kéo mô hình Rating AtCoder...");
      // Lấy rating của từng bài
      const resDiff = await fetch("https://kenkoooo.com/atcoder/resources/problem-models.json");
      const acDiff = await resDiff.json();

      const buckets: Record<string, any[]> = {};

      acProblems.forEach((p: any) => {
        const model = acDiff[p.id];
        if (!model || model.difficulty === undefined) return;
        
        // Chuẩn hóa rating AtCoder cho giống mốc Codeforces (Bội số của 100, min 800)
        let rawRating = model.difficulty;
        if (rawRating < 800) rawRating = 800;
        const snappedRating = Math.round(rawRating / 100) * 100;

        if (!buckets[snappedRating]) buckets[snappedRating] = [];

        buckets[snappedRating].push({
          id: p.id,
          contestId: p.contest_id, // AtCoder lưu dạng abc086
          index: p.id.split('_').pop()?.toUpperCase() || "",
          title: p.title,
          tags: [], // AtCoder không có tags chính thức
          rating: snappedRating,
          platform: "AtCoder",
          link: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`
        });
      });

      addLog(`Đã gom thành ${Object.keys(buckets).length} buckets AtCoder. Bắt đầu đẩy lên Firebase...`);

      for (const rating of Object.keys(buckets)) {
        await setDoc(doc(db, "problem_buckets", `ac_${rating}`), {
          platform: "AtCoder",
          rating: Number(rating),
          problems: buckets[rating]
        });
        addLog(`Đã lưu Bucket AC Rating ${rating} (${buckets[rating].length} bài)`);
      }

      addLog("✅ HOÀN TẤT ĐỒNG BỘ ATCODER!");
    } catch (err) {
      addLog(`❌ Lỗi AC: ${(err as Error).message}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Database className="w-6 h-6" /> Data Synchronizer
      </h1>
      
      <div className="flex gap-4">
        <button onClick={syncCodeforces} disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Code2 className="w-5 h-5" />} Sync Codeforces
        </button>
        <button onClick={syncAtCoder} disabled={loading} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />} Sync AtCoder
        </button>
      </div>

      <div className="bg-black p-4 rounded-xl font-mono text-sm h-96 overflow-y-auto border border-gray-800">
        {log.map((l, i) => (
          <div key={i} className="mb-1 text-green-400">{'>'} {l}</div>
        ))}
        {log.length === 0 && <div className="text-gray-600">Chưa có tiến trình nào chạy...</div>}
      </div>
    </div>
  );
}