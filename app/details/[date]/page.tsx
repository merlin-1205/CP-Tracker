// app/details/[date]/page.tsx
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Brain, Trophy, CalendarDays, ArrowLeft, 
  ExternalLink, Clock, RefreshCw, Star, Paperclip, FileText 
} from 'lucide-react';
import Link from 'next/link';
import EditActivityModal from '@/components/EditActivityModal';

interface DetailsPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DetailsPage({ params }: DetailsPageProps) {
  const { date } = await params;

  // Truy vấn dữ liệu từ Firebase
  const activitiesRef = collection(db, "cp_activities");
  const q = query(activitiesRef, where("createdAt", "==", date));
  const querySnapshot = await getDocs(q);

  // Phân loại dữ liệu thành Bài tập và Contest
  const problems: any[] = [];
  const contests: any[] = [];

  querySnapshot.forEach((doc) => {
    const data = { id: doc.id, ...doc.data() } as any;
    if (data.type === 'problem') {
      problems.push(data);
    } else if (data.type === 'contest') {
      contests.push(data);
    }
  });

  // Nếu không có hoạt động nào trong ngày, hiển thị trang 404
  if (problems.length === 0 && contests.length === 0) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex items-center gap-4">
          <Link href="/" className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-extrabold tracking-tight">
              Chi tiết ngày {format(parseISO(date), 'dd/MM/yyyy')}
            </h1>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CỘT BÀI TẬP (PROBLEMS) */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Brain className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bài tập đã giải</h2>
                <p className="text-sm text-gray-500">Tổng cộng {problems.length} bài</p>
              </div>
            </div>

            {problems.length > 0 ? (
              <div className="space-y-4">
                {problems.map((problem: any) => (
                  <div key={problem.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex-1">
                        {problem.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        {problem.link && (
                          <a href={problem.link} target="_blank" rel="noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors">
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                        <EditActivityModal activity={problem} />
                      </div>
                    </div>
                    
                    {/* Các thông số */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {problem.rating && problem.rating !== '0' && (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-md border border-purple-100 dark:border-purple-800">
                          <Star className="w-3.5 h-3.5" /> Rating: {problem.rating}
                        </span>
                      )}
                      {problem.timeTaken > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-md border border-orange-100 dark:border-orange-800">
                          <Clock className="w-3.5 h-3.5" /> {problem.timeTaken} phút
                        </span>
                      )}
                      {problem.submissions > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md border border-blue-100 dark:border-blue-800">
                          <RefreshCw className="w-3.5 h-3.5" /> {problem.submissions} submits
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {problem.tags.map((tag: string) => (
                          <span key={tag} className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Ghi chú */}
                    {problem.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase">Ghi chú / Suy ngẫm</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{problem.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic px-4">Không có bài tập nào ghi nhận.</p>
            )}
          </div>

          {/* CỘT CONTESTS */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Contest đã tham gia</h2>
                <p className="text-sm text-gray-500">Tổng cộng {contests.length} contest</p>
              </div>
            </div>

            {contests.length > 0 ? (
              <div className="space-y-4">
                {contests.map((contest: any) => (
                  <div key={contest.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 transition-colors">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex-1">
                        {contest.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        {contest.link && (
                          <a href={contest.link} target="_blank" rel="noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors">
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                        <EditActivityModal activity={contest} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Đã giải</span>
                        <span className="text-lg font-black text-green-600 dark:text-green-400">{contest.solvedCount} bài</span>
                      </div>
                      {contest.rank && (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase font-semibold">Hạng (Rank)</span>
                          <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">{contest.rank}</span>
                        </div>
                      )}
                    </div>

                    {/* File đính kèm */}
                    {contest.attachmentUrl && (
                      <a 
                        href={contest.attachmentUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors mb-3"
                      >
                        <Paperclip className="w-4 h-4" /> Xem file đính kèm
                      </a>
                    )}

                    {/* Ghi chú */}
                    {contest.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-yellow-300 dark:border-yellow-600">
                        <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase">Review Contest</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contest.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic px-4">Không tham gia contest nào.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}