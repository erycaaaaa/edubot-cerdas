import { AccountMenu } from '../components/AccountMenu';
import { isAxiosError } from 'axios';
import {
  detectInappropriateWords,
  getWarningConfig,
  type StrikeEvent,
} from '../store/strikeStore';
import { useState, useEffect, useRef } from 'react';
import { Send, Home, Award, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage, getMyStrikes, getMyGamification, type GamificationData } from '../services/apiClient';
import { AnimatedBlobs } from '../components/AnimatedBlobs';
import { BingoLogo } from '../components/BingoLogo';
import { HelpfulFeedback } from '../components/HelpfulFeedback';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'warning';
  timestamp: Date;
  warningLevel?: 1 | 2 | 3;
  requestId?: string;
}

interface ChatResultLike {
  status?: string;
  gamification?: unknown;
}

const isSuccessfulChatReply = (data: ChatResultLike): boolean =>
  data.status === 'OK' && Boolean(data.gamification);

interface StudentInfo {
  id: string;
  name: string;
  username: string;
  grade: string;
  gradeNumber: number;
  avatar: string;
  schoolId: string;
  schoolName: string;
}

// Default student (fallback if not in session)
const DEFAULT_STUDENT: StudentInfo = {
  id: 'eryca.124@stu.untar.ac.id',
  name: 'Eryca',
  username: 'eryca.124',
  grade: '3',
  gradeNumber: 3,
  avatar: '🦁',
  schoolId: 'stu.untar.ac.id',
  schoolName: 'Universitas Tarumanagara',
};

function getStudentInfo(): StudentInfo {
  try {
    const data = localStorage.getItem('edubot_student');
    if (data) return JSON.parse(data);
  } catch { /* noop */ }
  return DEFAULT_STUDENT;
}

// ─── Animated Strike Indicator Component ───────────────
function StrikeIndicator({ index, active, strikeCount }: { index: number; active: boolean; strikeCount: number }) {
  const bgColor = !active
    ? '#E5E7EB'
    : strikeCount === 1 ? '#FFD700' : strikeCount === 2 ? '#FF8C00' : '#FF4444';

  const textColor = !active ? '#9CA3AF' : '#fff';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={
        active
          ? {
            scale: [1, 1.25, 1],
            rotate: [0, -8, 8, -4, 0],
            opacity: 1,
          }
          : { scale: 1, opacity: 1 }
      }
      transition={
        active
          ? { duration: 0.6, ease: 'easeInOut' }
          : { duration: 0.3 }
      }
      className="relative"
    >
      {active && (
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: bgColor, filter: 'blur(6px)' }}
        />
      )}
      <div
        className="relative w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: bgColor }}
      >
        {active ? (
          <span className="text-xs" style={{ color: textColor }}>🚫</span>
        ) : (
          <span className="text-[10px]" style={{ color: textColor }}>{index}</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Badword Pop Animation ───
function BadwordPopAnimation({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.3, y: -20 }}
          transition={{ type: 'spring', damping: 10 }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-50"
        >
          <div className="bg-[#FF4444] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
            <motion.span
              animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 0.4, repeat: 2 }}
            >
              ⚠️
            </motion.span>
            Kata kurang pantas terdeteksi!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function StudentChat() {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const student = getStudentInfo();

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: student.gradeNumber <= 3
        ? `Halo ${student.name}! 👋 Aku EduBot! Mau belajar apa hari ini?`
        : `Halo ${student.name}! 👋 Aku EduBot, teman belajarmu! Apa yang ingin kamu pelajari hari ini?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [strikeCount, setStrikeCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<StrikeEvent | null>(null);
  const [isChatBlocked, setIsChatBlocked] = useState(false);
  const [showBadwordPop, setShowBadwordPop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gamification, setGamification] = useState<GamificationData | null>(null);

  // Load strikes from backend database on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([getMyStrikes(), getMyGamification()])
      .then(([status, progress]) => {
        if (!isMounted) return;
        setStrikeCount(status.strikeCount);
        setGamification(progress);
        if (status.isBlocked || status.strikeCount >= 3) {
          setIsChatBlocked(true);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch student progress from backend:', err);
        // Try gamification independently so a strike API hiccup does not hide progress.
        getMyGamification().then((progress) => {
          if (isMounted) setGamification(progress);
        }).catch(() => undefined);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message via HTTP REST API
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isChatBlocked || isLoading || isSendingRef.current) return;

    isSendingRef.current = true;
    setIsLoading(true);

    // Instant local check for animation pop
    const localBadWords = detectInappropriateWords(trimmed);
    if (localBadWords.length > 0) {
      setShowBadwordPop(true);
      setTimeout(() => setShowBadwordPop(false), 2000);
    }

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    const requestId = `${student.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const data = await sendChatMessage(trimmed, requestId);

      if (typeof data.strikeCount === 'number') {
        setStrikeCount(data.strikeCount);
      }
      if (data.gamification) setGamification(previous => ({ ...data.gamification, avatar: previous?.avatar ?? student.avatar }));

      if (data.hasViolation) {
        setShowBadwordPop(true);
        setTimeout(() => setShowBadwordPop(false), 2500);

        const currentStrikeCount = data.strikeCount ?? 0;
        const warnLevel = data.strikeLevel || (Math.min(currentStrikeCount, 3) as 1 | 2 | 3);
        const warnConfig = getWarningConfig(warnLevel, student.gradeNumber);

        const warningMessage: Message = {
          id: Date.now() + 1,
          text: warnConfig.chatMessage,
          sender: 'warning',
          timestamp: new Date(),
          warningLevel: warnLevel,
        };

        setMessages((prev) => [...prev, warningMessage]);

        const strikeEvent: StrikeEvent = {
          id: `strike_${Date.now()}`,
          studentId: student.id,
          studentName: student.name,
          studentAvatar: student.avatar,
          schoolId: student.schoolId || 'stu.untar.ac.id',
          level: warnLevel,
          levelLabel: warnLevel === 1 ? 'Ringan' : warnLevel === 2 ? 'Sedang' : 'Berat',
          message: trimmed,
          detectedWords: data.detectedWords || [],
          timestamp: new Date().toISOString(),
          read: false,
        };

        setCurrentWarning(strikeEvent);
        setShowWarningModal(true);

        if (data.isBlocked || currentStrikeCount >= 3) {
          setIsChatBlocked(true);
        }
      } else {
        // Normal bot response
        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.response || 'Maaf, saya tidak mengerti pertanyaanmu.',
          sender: 'bot',
          timestamp: new Date(),
          requestId: isSuccessfulChatReply(data) ? requestId : undefined,
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err: unknown) {
      console.error('Chat API error:', err);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: isAxiosError(err) && err.response?.status === 401
          ? 'Sesi berakhir. Silakan masuk kembali.'
          : 'Maaf, koneksi ke server sedang terganggu. Silakan coba lagi ya!',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStrikeLabel = () => {
    if (strikeCount === 0) return { text: 'Aman', color: '#7A7A7A', bg: '#f0fdf4' };
    if (strikeCount === 1) return { text: 'Ringan', color: '#FFD700', bg: '#FFF8E7' };
    if (strikeCount === 2) return { text: 'Sedang', color: '#FF8C00', bg: '#FFF0E0' };
    return { text: 'Berat', color: '#FF4444', bg: '#FFE8E8' };
  };

  const strikeLabel = getStrikeLabel();

  return (
    <div className="h-screen flex bg-[#FDF6EE] relative overflow-hidden text-[#332F2D]">
      <AnimatedBlobs />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-[#BDB2A0]/25 px-5 py-3.5 flex items-center justify-between shadow-sm">
          {/* LEFT SECTION */}
          <div className="flex items-center gap-3">
            {/* Back to Home */}
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-[#FDF6EE] rounded-xl transition-colors text-[#5D594C] hover:text-[#332F2D]"
              title="Kembali ke Beranda"
            >
              <Home className="w-5 h-5" />
            </button>

            <AccountMenu />

            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <BingoLogo size={42} interactive={true} />

              <div>
                <h1 className="font-bold text-lg text-[#332F2D] leading-tight">
                  Edu<span className="text-[#B9895F]">Bot</span>
                </h1>
                <p className="text-xs text-[#5D594C]">
                  Teman belajar interaktif ✨
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION - Strike Indicator */}
          <div className="flex items-center gap-2 relative">
            <button type="button" onClick={() => navigate('/student/avatars')}
              className="rounded-xl border border-[#BDB2A0]/30 px-3 py-2 text-xs font-semibold text-[#776938] hover:bg-[#FDF6EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="Buka koleksi avatar dan cara mendapat XP">
              <Award className="inline h-4 w-4 sm:mr-1" aria-hidden="true" /><span className="hidden sm:inline">Avatar & XP</span>
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF9F2] border border-[#BDB2A0]/30">
              <span className="text-xs font-bold text-[#B9895F]">⭐ {gamification?.expBalance ?? 0} EXP · {gamification?.xp ?? 0} XP</span>
              <span className="text-[11px] text-[#5D594C]">Lv. {gamification?.level.level ?? 1}</span>
            </div>
            <BadwordPopAnimation show={showBadwordPop} />

            <span
              className="text-xs hidden sm:inline font-semibold"
              style={{ color: strikeLabel.color }}
            >
              {strikeCount > 0 ? `Strike ${strikeCount}/3` : 'Aman'}
            </span>

            <div className="flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <StrikeIndicator
                  key={i}
                  index={i}
                  active={i <= strikeCount}
                  strikeCount={strikeCount}
                />
              ))}
            </div>
          </div>
        </header>

        {/* Chat Blocked Banner */}
        <AnimatePresence>
          {isChatBlocked && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#FFE8E8] border-b-2 border-[#FF4444] px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF4444] flex-shrink-0" />
              <p className="text-sm text-[#332F2D]">
                {student.gradeNumber <= 3
                  ? 'Chat berhenti dulu ya. Guru akan bantu kamu. 😢'
                  : 'Chat dinonaktifkan karena sudah mendapat 3 peringatan. Guru akan menghubungimu. 😢'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.sender === 'bot' && (
                  <div className="mr-3 flex-shrink-0">
                    <BingoLogo size={38} />
                  </div>
                )}

                {message.sender === 'warning' && (
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 0] }}
                    transition={{ duration: 0.5 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl mr-3 flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: message.warningLevel === 1 ? '#FFF3D6' : message.warningLevel === 2 ? '#FFE0C0' : '#FFD6D6' }}
                  >
                    {message.warningLevel === 1 ? '😟' : message.warningLevel === 2 ? '😔' : '😢'}
                  </motion.div>
                )}

                <div
                  className={`max-w-[80%] md:max-w-[60%] px-4 py-3 rounded-2xl ${message.sender === 'user'
                    ? 'bg-[#B9895F] text-white shadow-sm'
                    : message.sender === 'warning'
                      ? 'text-[#332F2D] border-2 shadow-sm'
                      : 'bg-white text-[#332F2D] shadow-sm border border-[#BDB2A0]/30'
                    }`}
                  style={
                    message.sender === 'warning'
                      ? {
                        backgroundColor: message.warningLevel === 1 ? '#FFF8E7' : message.warningLevel === 2 ? '#FFF0E0' : '#FFE8E8',
                        borderColor: message.warningLevel === 1 ? '#FFD700' : message.warningLevel === 2 ? '#FF8C00' : '#FF4444',
                      }
                      : undefined
                  }
                >
                  {message.sender === 'warning' && (
                    <div className="flex items-center gap-2 mb-1">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: 2 }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: message.warningLevel === 1 ? '#FFD700' : message.warningLevel === 2 ? '#FF8C00' : '#FF4444' }} />
                      </motion.div>
                      <span className="text-sm font-semibold">
                        {message.warningLevel === 1 ? '🚫 Strike 1/3 — Ringan' : message.warningLevel === 2 ? '🚫 Strike 2/3 — Sedang' : '🚫 Strike 3/3 — Berat'}
                      </span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.sender === 'bot' && message.requestId && <HelpfulFeedback
                    requestId={message.requestId}
                    disabled={isLoading || isChatBlocked}
                    onReward={reward => setGamification(previous => {
                      if (previous && previous.xp > reward.new_xp) return previous;
                      return {
                        streakDays: 0, lastActiveDate: null, conversationCount: 0,
                        helpfulFeedbackCount: 0, challengeCount: 0, badges: [],
                        avatar: student.avatar,
                        ...previous,
                        xp: reward.new_xp,
                        expBalance: reward.exp_balance,
                        level: reward.level,
                      };
                    })}
                  />}
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-white/75' : 'text-[#5D594C]/70'}`}>
                    {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {message.sender === 'user' && (
                  <div className="w-10 h-10 bg-white border border-[#BDB2A0]/30 rounded-full flex items-center justify-center text-xl ml-3 flex-shrink-0 shadow-sm">{gamification?.avatar ?? student.avatar}</div>
                )}
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="mr-3 flex-shrink-0">
                  <BingoLogo size={38} />
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-[#BDB2A0]/30">
                  <div className="flex gap-1.5 items-center py-1">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2.5 h-2.5 bg-[#B9895F] rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-2.5 h-2.5 bg-[#776938] rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-2.5 h-2.5 bg-[#BDB2A0] rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white/95 backdrop-blur-md border-t border-[#BDB2A0]/25 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isChatBlocked ? "Chat dinonaktifkan..." : "Ketik pertanyaan di sini..."}
              disabled={isChatBlocked || isLoading}
              className={`flex-1 px-4 py-3 rounded-2xl border-2 transition-colors ${isChatBlocked
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-[#BDB2A0]/40 focus:border-[#B9895F] focus:outline-none bg-white text-[#332F2D]'
                }`}
            />
            <motion.button
              whileHover={!isChatBlocked && !isLoading ? { scale: 1.05 } : {}}
              whileTap={!isChatBlocked && !isLoading ? { scale: 0.95 } : {}}
              onClick={handleSend}
              disabled={isChatBlocked || isLoading}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm ${isChatBlocked || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#B9895F] hover:bg-[#A67950] text-white hover:shadow-md'
                }`}
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">{isLoading ? 'Mengirim...' : 'Kirim'}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Warning Modal Overlay */}
      <AnimatePresence>
        {showWarningModal && currentWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#BDB2A0]/30"
            >
              {(() => {
                const config = getWarningConfig(currentWarning.level, student.gradeNumber);
                return (
                  <>
                    <div className="flex justify-center mb-4">
                      <motion.div
                        animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-sm"
                        style={{ backgroundColor: config.iconBg }}
                      >
                        {config.emoji}
                      </motion.div>
                    </div>

                    <div className="flex justify-center gap-3 mb-4">
                      {[1, 2, 3].map((s) => {
                        const isActive = s <= currentWarning.level;
                        return (
                          <motion.div
                            key={s}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{
                              scale: 1,
                              rotate: 0,
                              ...(isActive ? { y: [0, -6, 0] } : {}),
                            }}
                            transition={{
                              delay: s * 0.15,
                              type: 'spring',
                              ...(isActive ? { y: { duration: 0.8, repeat: Infinity, repeatDelay: 0.5 } } : {}),
                            }}
                            className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                            style={{
                              backgroundColor: isActive ? config.starColor : '#FDF6EE',
                              borderColor: isActive ? config.starColor : '#BDB2A0',
                            }}
                          >
                            {isActive ? (
                              <span className="text-white text-lg">🚫</span>
                            ) : (
                              <span className="text-[#5D594C] text-sm font-bold">{s}</span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="text-center mb-2">
                      <motion.span
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="inline-block px-4 py-1 rounded-full text-sm font-semibold text-white shadow-sm"
                        style={{ backgroundColor: config.borderColor }}
                      >
                        Strike {currentWarning.level}/3 — {config.label}
                      </motion.span>
                    </div>

                    <h3 className="text-center font-bold text-xl text-[#332F2D] mt-3 mb-3">{config.title}</h3>
                    <p className="text-center text-[#5D594C] mb-3">{config.message}</p>

                    <div className="rounded-2xl p-3.5 mb-4 text-center border border-[#BDB2A0]/20" style={{ backgroundColor: config.bgColor, borderLeft: `4px solid ${config.borderColor}` }}>
                      <p className="text-sm text-[#332F2D] font-medium">{config.subMessage}</p>
                    </div>

                    {currentWarning.level === 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-2 p-3 bg-[#FFE8E8] rounded-xl mb-4 border border-[#FF4444]"
                      >
                        <ShieldAlert className="w-5 h-5 text-[#FF4444] flex-shrink-0" />
                        <p className="text-sm text-[#332F2D]">
                          {student.gradeNumber <= 3 ? 'Guru sudah tahu.' : 'Notifikasi telah dikirim ke guru kamu.'}
                        </p>
                      </motion.div>
                    )}

                    <button
                      onClick={() => setShowWarningModal(false)}
                      className="w-full py-3.5 rounded-2xl font-bold text-white transition-all shadow-md hover:shadow-lg active:scale-98"
                      style={{ backgroundColor: config.borderColor }}
                    >
                      {config.buttonText}
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
