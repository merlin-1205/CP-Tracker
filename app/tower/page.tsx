// app/tower/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Swords, Calendar, LayoutDashboard, Settings, Play, 
  Timer, Target, Skull, RefreshCw, Trophy, ExternalLink,
  BrainCircuit, ShieldAlert, CheckCircle2, XCircle, Loader2,
  Medal, Crown, Code2, Globe, EyeOff, Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Cấu hình firebase
import { collection, addDoc, serverTimestamp, doc, getDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- TYPES & INTERFACES ---
type GameMode = 'training' | 'contest';
type GameState = 'setup' | 'playing' | 'gameover';
type Track = 'codeforces' | 'atcoder' | 'mixed';

interface RunState {
  handle: string; 
  atcoderHandle?: string; 
  mode: GameMode;
  track: Track;
  showTags: boolean; 
  currentFloor: number;
  currentRating: number;
  score: number;
  missionsCompleted: number;
  startTime: number;
}

interface ActiveMission {
  contestId?: number; 
  index?: string;     
  id: string;         
  title: string;
  rating: number;
  link: string;
  tags: string[];
  platform: string;
  isStarted: boolean; 
  assignedAt?: number; 
  deadline?: number;
}

interface LeaderboardEntry {
  handle: string;
  atcoderHandle?: string;
  track: Track;
  maxFloor: number;
  maxRating: number;
  score: number;
  endTime: number;
}

// Generate mốc rating từ 800 đến 3500
const RATING_OPTIONS = Array.from({ length: 28 }, (_, i) => 800 + i * 100);

export default function TowerPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [gameState, setGameState] = useState<GameState>('setup');
  
  // Setup Config
  const [handle, setHandle] = useState('Ayanee');
  const [acHandle, setAcHandle] = useState('Fexin1205'); 
  const [startRating, setStartRating] = useState(800);
  const [selectedMode, setSelectedMode] = useState<GameMode>('training');
  const [selectedTrack, setSelectedTrack] = useState<Track>('codeforces');
  const [showTags, setShowTags] = useState(true);
  
  // Active Run State
  const [runData, setRunData] = useState<RunState | null>(null);
  const [mission, setMission] = useState<ActiveMission | null>(null);
  
  // Timer & UI State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false); 
  
  // History & Leaderboard
  const [history, setHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // --- 1. LOCAL STORAGE & LEADERBOARD FETCH ---
  useEffect(() => {
    const savedState = localStorage.getItem('tower_save_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setGameState(parsed.gameState);
        setRunData(parsed.runData);
        setMission(parsed.mission);
        setHistory(parsed.history);
        
        if (parsed.mission && parsed.mission.isStarted === undefined) {
           setMission({ ...parsed.mission, isStarted: true });
        }
      } catch (e) {
        console.error("Lỗi đọc file save:", e);
      }
    }
    fetchLeaderboard();
    setIsInitializing(false);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "tower_history"), orderBy("score", "desc"), limit(20));
      const snap = await getDocs(q);
      const data: LeaderboardEntry[] = [];
      snap.forEach(doc => data.push(doc.data() as LeaderboardEntry));
      setLeaderboard(data);
    } catch (error) {
      console.error("Lỗi tải Leaderboard:", error);
    }
  };

  useEffect(() => {
    if (!isInitializing) {
      if (gameState === 'setup') {
        localStorage.removeItem('tower_save_state');
        fetchLeaderboard();
      } else {
        localStorage.setItem('tower_save_state', JSON.stringify({
          gameState, runData, mission, history
        }));
      }
    }
  }, [gameState, runData, mission, history, isInitializing]);

  // --- 2. LOGIC THỜI GIAN ĐỘNG ---
  const calculateTimeLimit = (rating: number, mode: GameMode) => {
    const baseMinutes = 15 + Math.max(0, (rating - 800) / 100) * 10;
    const multiplier = mode === 'training' ? 1.2 : 0.8;
    return Math.floor(baseMinutes * multiplier * 60 * 1000);
  };

  // --- 3. ĐẾM NGƯỢC TIMER ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && mission && mission.isStarted && !isCelebrating && mission.deadline) {
      interval = setInterval(() => {
        const remaining = mission.deadline! - Date.now();
        if (remaining <= 0) {
          clearInterval(interval);
          handleGameOver("Đã hết thời gian quy định!");
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, mission, isCelebrating]);

  // --- 4. GỌI BÀI TỪ FIREBASE BUCKETS (Phòng chờ) ---
  const generateNextMission = async (currentRun: RunState) => {
    setIsGenerating(true);
    try {
      let prefix = 'cf';
      if (currentRun.track === 'atcoder') prefix = 'ac';
      if (currentRun.track === 'mixed') prefix = Math.random() > 0.5 ? 'cf' : 'ac';

      const bucketRef = doc(db, "problem_buckets", `${prefix}_${currentRun.currentRating}`);
      const bucketSnap = await getDoc(bucketRef);

      if (!bucketSnap.exists()) throw new Error(`Không có dữ liệu mốc Rating ${currentRun.currentRating}`);

      const problemList = bucketSnap.data().problems;
      const randomIdx = Math.floor(Math.random() * problemList.length);
      const problemData = problemList[randomIdx];

      const estimatedTimeLimitMs = calculateTimeLimit(currentRun.currentRating, currentRun.mode);
      
      setMission({
        ...problemData,
        isStarted: false
      });
      setTimeLeft(estimatedTimeLimitMs);

    } catch (error) {
      console.error(error);
      handleGameOver("Hệ thống cạn kiệt đề bài hoặc lỗi mạng.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- HÀNH ĐỘNG: BẮT ĐẦU LÀM BÀI ---
  const handleStartMission = () => {
    if (!mission || !runData) return;
    const timeLimitMs = calculateTimeLimit(runData.currentRating, runData.mode);
    const now = Date.now();
    
    setMission({
      ...mission,
      isStarted: true,
      assignedAt: now,
      deadline: now + timeLimitMs
    });
    setTimeLeft(timeLimitMs);
  };

  // --- 5. HIỆU ỨNG PHÁO HOA ---
  const triggerGrandConfetti = () => {
    setIsCelebrating(true);
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  // --- 6. KIỂM TRA SUBMISSION VÀ TỰ ĐỘNG THÊM VÀO ACTIVITY ---
  const handleVerifyAC = async () => {
    if (!mission || !runData || !mission.assignedAt || !mission.deadline) return;
    setIsVerifying(true);
    
    try {
      let foundAC = false;

      // KIỂM TRA CODEFORCES (Vẫn giữ kiểm tra API chặt chẽ)
      if (mission.platform === 'Codeforces') {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${runData.handle}&from=1&count=20`);
        const data = await res.json();
        if (data.status === "OK") {
          foundAC = data.result.some((sub: any) => 
            sub.verdict === "OK" && 
            sub.problem.contestId === mission.contestId &&
            sub.problem.index === mission.index &&
            (sub.creationTimeSeconds * 1000) >= (mission.assignedAt! - 60000)
          );
        }
      } 
      // ATCODER: HONOR SYSTEM (TỰ GIÁC XÁC NHẬN)
      else if (mission.platform === 'AtCoder') {
        // Không dùng fetch nữa, tin tưởng 100% vào user
        foundAC = true;
      }

      if (foundAC) {
        triggerGrandConfetti();

        const currentFloorTime = mission.deadline - Date.now();
        setHistory(prev => [...prev, { ...mission, status: 'AC', timeRemaining: currentFloorTime }]);

        // TỰ ĐỘNG ĐẨY LÊN FIREBASE HOẠT ĐỘNG (cp_activities)
        try {
          const timeTakenMinutes = Math.max(1, Math.round((Date.now() - mission.assignedAt) / 60000));
          
          await addDoc(collection(db, "cp_activities"), {
            title: `[Tower] ${mission.title}`, 
            type: 'problem',
            link: mission.link,
            notes: `AC tại Tháp (Tầng ${runData.currentFloor} - Rating ${mission.rating})`,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString().split('T')[0],
            rating: mission.rating.toString(),
            timeTaken: timeTakenMinutes,
            submissions: 1,
            tags: mission.tags || []
          });
        } catch (activityError) {
          console.error("Lỗi tự động lưu Activity Dashboard:", activityError);
        }
        
        setTimeout(() => {
          setRunData(prev => {
            if(!prev) return prev;
            const nextRun = {
              ...prev,
              currentFloor: prev.currentFloor + 1,
              currentRating: prev.currentRating + 100,
              score: prev.score + (prev.currentRating * 10) + Math.floor(currentFloorTime / 1000),
              missionsCompleted: prev.missionsCompleted + 1
            };
            generateNextMission(nextRun);
            setIsCelebrating(false);
            setIsVerifying(false);
            return nextRun;
          });
        }, 3500); 

      } else {
        alert(`Chưa tìm thấy submission 'Accepted' hợp lệ cho bài này trên ${mission.platform}. Vui lòng thử lại!`);
        setIsVerifying(false);
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi mạng khi kiểm tra!");
      setIsVerifying(false);
    }
  };

  const handleStartRun = async () => {
    if (!handle.trim() || !acHandle.trim()) {
      alert("Vui lòng nhập đầy đủ Handle Codeforces và AtCoder!");
      return;
    }
    const newRun: RunState = {
      handle: handle.trim(), 
      atcoderHandle: acHandle.trim(),
      mode: selectedMode, 
      track: selectedTrack,
      showTags: showTags,
      currentFloor: 1, currentRating: startRating,
      score: 0, missionsCompleted: 0, startTime: Date.now()
    };
    setRunData(newRun);
    setHistory([]);
    setGameState('playing');
    await generateNextMission(newRun);
  };

  const handleGameOver = async (reason: string) => {
    setGameState('gameover');
    if (mission && mission.isStarted) {
        setHistory(prev => [...prev, { ...mission, status: 'FAILED', reason }]);
    }
    
    if (runData) {
      try {
        await addDoc(collection(db, "tower_history"), {
          handle: runData.handle,
          atcoderHandle: runData.atcoderHandle,
          mode: runData.mode,
          track: runData.track,
          startRating: startRating,
          maxRating: runData.currentRating,
          maxFloor: runData.currentFloor,
          score: runData.score,
          missionsCompleted: runData.missionsCompleted,
          endTime: Date.now(),
          finalReason: reason,
          historyLog: history,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Lỗi lưu lịch sử tháp Firebase:", error);
      }
    }
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isInitializing) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-900"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;
  }

  const isTimeCritical = timeLeft > 0 && timeLeft < 300000;
  
  const cfLeaderboard = leaderboard.filter(l => l.track === 'codeforces' || l.track === 'mixed').slice(0, 5);
  const acLeaderboard = leaderboard.filter(l => l.track === 'atcoder' || l.track === 'mixed').slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- HEADER CHUNG --- */}
        <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                Tháp Tu Luyện (The Tower)
              </h1>
              <p className="text-gray-500 mt-1">Đấu trí sinh tử. Sai một ly, đi lại từ đầu.</p>
            </div>
            <nav className="flex items-center p-1.5 bg-gray-200/50 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 w-full lg:w-auto overflow-x-auto">
              <Link href="/" className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-white/50 dark:text-gray-400 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Tổng quan
              </Link>
              <Link href="/dashboard" className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-white/50 dark:text-gray-400 dark:hover:bg-gray-700/50 transition-all flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/tower" className="px-5 py-2.5 text-sm font-bold rounded-lg bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm transition-all flex items-center gap-2">
                <Swords className="w-4 h-4" /> Leo tháp
              </Link>
            </nav>
          </div>
        </header>

        {/* --- SETUP STATE & LEADERBOARD --- */}
        {gameState === 'setup' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            
            {/* LEADERBOARD ZONE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* CF Leaderboard */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Code2 className="w-5 h-5" /> Hall of Fame (Codeforces)
                </h3>
                <div className="space-y-3">
                  {cfLeaderboard.length === 0 ? <p className="text-gray-400 text-sm">Chưa có kỷ lục nào.</p> : cfLeaderboard.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        {idx === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> : <span className="w-5 text-center font-bold text-gray-400">{idx + 1}</span>}
                        <div>
                          <p className="font-bold">{entry.handle}</p>
                          <p className="text-xs text-gray-500">Tầng {entry.maxFloor} • {entry.maxRating} Rating</p>
                        </div>
                      </div>
                      <span className="font-black text-blue-600 dark:text-blue-400">{entry.score.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AtCoder Leaderboard */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <Globe className="w-5 h-5" /> Hall of Fame (AtCoder)
                </h3>
                <div className="space-y-3">
                  {acLeaderboard.length === 0 ? <p className="text-gray-400 text-sm">Chưa có kỷ lục nào.</p> : acLeaderboard.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        {idx === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> : <span className="w-5 text-center font-bold text-gray-400">{idx + 1}</span>}
                        <div>
                          <p className="font-bold">{entry.atcoderHandle || entry.handle}</p>
                          <p className="text-xs text-gray-500">Tầng {entry.maxFloor} • {entry.maxRating} Rating</p>
                        </div>
                      </div>
                      <span className="font-black text-gray-800 dark:text-gray-200">{entry.score.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SETUP FORM */}
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-8">
                <Settings className="w-8 h-8 text-orange-500" />
                <h2 className="text-2xl font-bold">Cấu hình Tòa Tháp</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">CF Handle</label>
                    <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-mono focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">AtCoder Handle</label>
                    <input type="text" value={acHandle} onChange={(e) => setAcHandle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-mono focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rating Khởi điểm</label>
                    <div className="relative">
                      <select value={startRating} onChange={(e) => setStartRating(Number(e.target.value))} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none appearance-none max-h-48 overflow-y-auto">
                        {RATING_OPTIONS.map(rating => (
                          <option key={rating} value={rating}>{rating} {rating === 800 ? '(Khởi động)' : rating >= 2000 ? '(Địa ngục)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Track (Nền tảng)</label>
                    <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value as Track)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                      <option value="codeforces">Codeforces</option>
                      <option value="atcoder">AtCoder</option>
                      <option value="mixed">Hỗn hợp (Mixed)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500" />
                  <div>
                    <p className="font-bold text-gray-700 dark:text-gray-300">Hiển thị Tags bài tập</p>
                    <p className="text-xs text-gray-500">Tắt đi để tăng độ khó, ép bản thân tự suy luận dạng bài mà không bị gợi ý trước.</p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Game Mode (Chế độ thời gian)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setSelectedMode('training')} className={`p-4 rounded-xl border-2 text-left transition-all ${selectedMode === 'training' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                      <BrainCircuit className={`w-6 h-6 mb-2 ${selectedMode === 'training' ? 'text-blue-500' : 'text-gray-400'}`} />
                      <h3 className="font-bold">Training Mode</h3>
                      <p className="text-xs text-gray-500 mt-1">Thời gian x1.2.</p>
                    </button>
                    <button onClick={() => setSelectedMode('contest')} className={`p-4 rounded-xl border-2 text-left transition-all ${selectedMode === 'contest' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                      <Timer className={`w-6 h-6 mb-2 ${selectedMode === 'contest' ? 'text-red-500' : 'text-gray-400'}`} />
                      <h3 className="font-bold">Contest Mode</h3>
                      <p className="text-xs text-gray-500 mt-1">Thời gian x0.8.</p>
                    </button>
                  </div>
                </div>
                <button onClick={handleStartRun} disabled={isGenerating} className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-lg py-4 rounded-xl shadow-lg hover:shadow-red-500/25 transition-all flex justify-center items-center gap-2">
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />} TIẾN VÀO THÁP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PLAYING STATE --- */}
        {gameState === 'playing' && runData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Cột trái (Timer & Stats) */}
            <div className="lg:col-span-1 space-y-6">
              <div className={`p-6 rounded-3xl border-2 shadow-2xl transition-all duration-1000 ${isTimeCritical && mission?.isStarted && !isCelebrating ? 'bg-red-50 dark:bg-red-950 border-red-500 animate-pulse' : 'bg-gray-900 dark:bg-black border-gray-800 text-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase tracking-widest opacity-70">
                    {mission?.isStarted ? "Thời gian còn lại" : "Dự kiến Thời gian"}
                  </span>
                  <Timer className={`w-5 h-5 ${isTimeCritical && mission?.isStarted && !isCelebrating ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
                <div className={`text-5xl font-black font-mono tracking-tight ${isTimeCritical && mission?.isStarted && !isCelebrating ? 'text-red-600 dark:text-red-500' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </div>
                {!mission?.isStarted && (
                  <p className="text-xs text-orange-400 mt-2 font-bold flex items-center gap-1">
                    Đồng hồ sẽ chạy khi bạn Bắt đầu
                  </p>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">Trạng thái Tháp</h3>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                  <span className="flex items-center gap-2 font-medium"><Trophy className="w-5 h-5 text-yellow-500" /> Tầng hiện tại</span>
                  <span className="text-2xl font-black">{runData.currentFloor}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                  <span className="flex items-center gap-2 font-medium"><Target className="w-5 h-5 text-blue-500" /> Độ khó (Rating)</span>
                  <span className="text-xl font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">{runData.currentRating}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Điểm tích lũy</span>
                  <span className="text-xl font-black text-green-600 dark:text-green-400">{runData.score.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cột phải (Mission Details) */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl relative overflow-hidden min-h-[500px]">
                {isGenerating || !mission ? (
                  <div className="py-32 flex flex-col items-center justify-center text-orange-500">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="font-bold text-gray-500">Đang khởi tạo ải tiếp theo...</p>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-bold mb-4">
                      Nhiệm vụ Tầng {runData.currentFloor}
                    </span>
                    
                    {/* TRẠNG THÁI: PHÒNG CHỜ (CHƯA BẮT ĐẦU) */}
                    {!mission.isStarted ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center animate-in zoom-in-95 duration-300">
                        <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-2" />
                        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-200">
                          Đề bài đang bị khóa
                        </h2>
                        <p className="text-gray-500 max-w-md">
                          Bạn có thể nghỉ ngơi, uống nước. Bấm nút dưới đây khi bạn đã sẵn sàng giải quyết bài tập Rating {mission.rating} trên nền tảng {mission.platform}. Đồng hồ sẽ lập tức chạy.
                        </p>
                        <button onClick={handleStartMission} className="px-10 py-5 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xl shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-1 flex items-center gap-3">
                          <Play className="w-6 h-6 fill-white" /> BẮT ĐẦU MISSION
                        </button>
                      </div>
                    ) : (
                      /* TRẠNG THÁI: ĐANG LÀM BÀI */
                      <div className="animate-in fade-in duration-500">
                        <h2 className="text-3xl font-extrabold mb-2">{mission.title}</h2>
                        <div className="flex items-center gap-3 mb-8">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-bold text-gray-600 dark:text-gray-300">
                            Bài: {mission.id}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-sm font-bold">
                            Rating: {mission.rating}
                          </span>
                          <span className={`px-2 py-1 rounded text-sm font-bold ${mission.platform === 'Codeforces' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-800 text-white dark:bg-black dark:text-gray-300'}`}>
                            {mission.platform}
                          </span>
                        </div>

                        <div className="space-y-6">
                          {/* TAGS RENDER LOGIC */}
                          <div className="flex flex-wrap gap-2">
                            {!runData.showTags ? (
                              <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium border border-dashed border-gray-300 dark:border-gray-700">
                                <EyeOff className="w-4 h-4" /> Tags đã bị ẩn để rèn tư duy
                              </span>
                            ) : mission.tags.length > 0 ? (
                              mission.tags.map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg text-sm font-medium">
                                  #{tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm italic">Bài tập không có Tags</span>
                            )}
                          </div>

                          <a href={mission.link} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-md">
                            MỞ ĐỀ BÀI TRÊN {mission.platform.toUpperCase()} <ExternalLink className="w-4 h-4" />
                          </a>

                          <div className="my-8 flex items-center gap-4">
                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Khu vực kiểm định</span>
                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                          </div>

                          {isCelebrating ? (
                            <div className="w-full py-5 bg-green-500 text-white rounded-xl font-black text-lg text-center shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-pulse border-2 border-white">
                              🎉 CHÚC MỪNG VƯỢT ẢI! ĐANG CHUYỂN TẦNG... 🎉
                            </div>
                          ) : (
                            <button onClick={handleVerifyAC} disabled={isVerifying} className="w-full flex justify-center items-center gap-2 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-black text-lg shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                              {isVerifying ? (
                                <><RefreshCw className="w-6 h-6 animate-spin" /> ĐANG XỬ LÝ...</>
                              ) : (
                                <><CheckCircle2 className="w-6 h-6" /> TÔI ĐÃ AC{mission.platform === 'AtCoder' ? ' (TỰ XÁC NHẬN)' : ' - KIỂM TRA NGAY'}</>
                              )}
                            </button>
                          )}
                          
                          <p className="text-center text-sm text-gray-500">
                            {mission.platform === 'Codeforces'
                              ? `Quét 20 submissions gần nhất của tài khoản ${runData.handle}.`
                              : `Chế độ tự giác (Honor System): Hệ thống tin tưởng vào sự trung thực của bạn.`
                            }
                          </p>
                          
                          <button onClick={() => { if(window.confirm("Bỏ cuộc sẽ rớt tháp lập tức. Bạn chắc chưa?")) handleGameOver("Bỏ cuộc"); }} disabled={isCelebrating} className="w-full text-center text-sm font-medium text-red-500 hover:text-red-700 mt-4 disabled:opacity-50">
                            Tôi bỏ cuộc (Thoát khỏi tháp)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- GAME OVER STATE --- */}
        {gameState === 'gameover' && runData && (
          <div className="animate-in zoom-in-95 duration-500 max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-3xl p-1 relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/20 to-transparent pointer-events-none"></div>
              <div className="bg-gray-900 p-10 rounded-[22px] relative z-10 text-center">
                <Skull className="w-20 h-20 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <h2 className="text-4xl font-black text-white mb-2">RUN TERMINATED</h2>
                <p className="text-red-400 font-medium mb-8">Lý do: {history[history.length - 1]?.reason || "Bí ẩn"}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-left">
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Tầng Cao Nhất</p>
                    <p className="text-3xl font-black text-white mt-1">{runData.currentFloor}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Max Rating</p>
                    <p className="text-3xl font-black text-orange-400 mt-1">{runData.currentRating}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Số bài AC</p>
                    <p className="text-3xl font-black text-green-400 mt-1">{runData.missionsCompleted}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Tổng Điểm</p>
                    <p className="text-3xl font-black text-yellow-400 mt-1">{runData.score.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-10 text-left">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" /> Nhật ký Tháp
                  </h3>
                  {history.map((log, idx) => (
                    <div key={idx} className={`p-4 rounded-xl flex items-center justify-between border ${log.status === 'AC' ? 'bg-green-900/20 border-green-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
                      <div>
                        <p className="text-white font-bold">{log.title}</p>
                        <p className="text-xs text-gray-400 mt-1">Rating: {log.rating} • Bài: {log.id} • {log.platform}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.status === 'AC' ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 font-bold text-sm rounded flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> AC</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500/20 text-red-400 font-bold text-sm rounded flex items-center gap-1"><XCircle className="w-4 h-4" /> FAILED</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setGameState('setup')} className="px-8 py-4 bg-white text-gray-900 hover:bg-gray-200 font-black rounded-xl transition-colors flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-5 h-5" /> CHƠI LẠI
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}