// ──────────────────────────────────────────────
//  EduBuz UI & Warning Config Store
//  Pure UI helpers & grade-adaptive messaging
//  (Core strikes & notifications are in Supabase DB)
// ──────────────────────────────────────────────

export interface StrikeRecord {
  studentId: string;    // email siswa / ID
  studentName: string;
  studentAvatar: string;
  studentGrade: number;
  schoolId: string;
  strikeCount: number;
  history: StrikeEvent[];
}

export interface StrikeEvent {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  schoolId: string;
  level: 1 | 2 | 3;
  levelLabel: 'Ringan' | 'Sedang' | 'Berat';
  message: string;
  detectedWords: string[];
  timestamp: string;
  read: boolean;
}

export interface TeacherNotification {
  id: string;
  type: 'strike_warning' | 'strike_critical' | string;
  title: string;
  description: string;
  studentName: string;
  studentAvatar: string;
  schoolId: string;
  level: 1 | 2 | 3;
  timestamp: string;
  read: boolean;
}

// Indonesian inappropriate words list (for quick UI hint)
const INAPPROPRIATE_WORDS = [
  'bodoh', 'goblok', 'tolol', 'idiot', 'bego', 'dungu', 'oon',
  'jelek', 'buruk rupa', 'kampungan', 'norak', 'culun', 'kuper',
  'bangsat', 'brengsek', 'sialan', 'keparat', 'setan', 'iblis',
  'anjing', 'anjir', 'anjay', 'anj',
  'babi', 'monyet', 'kera',
  'tai', 'taik', 'tahi', 'bajingan',
  'gila', 'edan', 'sinting', 'sarap', 'stress',
  'mampus', 'matilah', 'mati aja', 'mati kau',
  'gendut', 'ceking', 'pesek', 'item', 'dekil',
  'payah', 'lemah', 'pecundang', 'pengecut',
  'stupid', 'dumb', 'hate', 'ugly', 'loser', 'shut up',
  'bad', 'fool',
];

const CONTEXTUAL_ANIMAL_WORDS = new Set(['anjing', 'babi', 'monyet', 'kera']);

const FOOD_CONTEXT_KEYWORDS = [
  'nasi goreng', 'sate', 'bakso', 'mie', 'mi', 'sup', 'soto', 'rendang',
  'daging', 'makanan', 'masakan', 'menu', 'resep', 'rasa', 'makan',
  'goreng', 'panggang', 'bakar', 'kuah', 'restoran', 'warung'
];

function hasFoodContext(text: string): boolean {
  return FOOD_CONTEXT_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`, 'i').test(text));
}

function isContextualAnimalUse(text: string, word: string): boolean {
  if (!CONTEXTUAL_ANIMAL_WORDS.has(word)) return false;

  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directInsultPatterns = [
    new RegExp(`\\b(dasar|si)\\s+${escapedWord}\\b`, 'i'),
    new RegExp(`\\b${escapedWord}\\s+(kamu|lu|lo|kau|dia|mereka)\\b`, 'i'),
    new RegExp(`\\b(kamu|lu|lo|kau|dia|mereka)\\s+(itu\\s+)?${escapedWord}\\b`, 'i'),
  ];

  if (directInsultPatterns.some((pattern) => pattern.test(text))) {
    return false;
  }

  if (hasFoodContext(text)) {
    return true;
  }

  const questionOrLearningContext = [
    /\b(apa|apakah|kenapa|mengapa|bagaimana|gimana|siapa|kapan|di mana|dimana|berapa)\b/i,
    /\b(tau|tahu|mau tahu|pengen tahu|ingin tahu|jelasin|ceritain)\b/i,
    /\b(hewan|binatang|mamalia|ternak|peliharaan|kebun binatang)\b/i,
    /\b(makan|hidup|tinggal|habitat|suara|jenis|ciri|fakta|gambar|foto)\b/i,
    /\b(ga|gak|nggak|tidak)\??$/i,
  ];

  return questionOrLearningContext.some((pattern) => pattern.test(text));
}

/**
 * Detect inappropriate words for frontend instant feedback popup.
 * Official moderation check is always verified by backend REST API.
 */
export function detectInappropriateWords(text: string): string[] {
  const lowerText = text.toLowerCase().trim();
  const found: string[] = [];
  for (const word of INAPPROPRIATE_WORDS) {
    const regex = new RegExp(`(^|\\s|[^a-zA-Z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[^a-zA-Z])`, 'i');
    if (regex.test(lowerText)) {
      if (isContextualAnimalUse(lowerText, word)) {
        continue;
      }
      found.push(word);
    }
  }
  return found;
}

// ─── Safe Local Read-only Helpers ─────────────
export function getStrikeRecords(): Record<string, StrikeRecord> {
  try {
    const data = localStorage.getItem('edubot_strikes');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getStrikeRecordsBySchool(schoolId: string): Record<string, StrikeRecord> {
  const all = getStrikeRecords();
  const filtered: Record<string, StrikeRecord> = {};
  for (const [key, record] of Object.entries(all)) {
    if (record.schoolId === schoolId) {
      filtered[key] = record;
    }
  }
  return filtered;
}

// ──────────────────────────────────────────────
//  Grade-adaptive warning config
// ──────────────────────────────────────────────

export function getWarningConfig(level: 1 | 2 | 3, gradeNumber: number) {
  const isLower = gradeNumber <= 3;

  switch (level) {
    case 1:
      return {
        label: 'Peringatan Ringan',
        emoji: '😟',
        color: '#FFE5B3',
        borderColor: '#FFD700',
        bgColor: 'rgba(255, 229, 179, 0.2)',
        iconBg: '#FFF3D6',
        starColor: '#FFD700',
        title: isLower ? 'Kata-kata itu kurang baik ya' : 'Oops! Kata-katamu kurang baik',
        chatMessage: isLower
          ? 'Yuk pakai kata baik ya! 😊'
          : 'Ayo kita gunakan kata-kata yang sopan dan baik ya! Kita bisa belajar lebih menyenangkan kalau saling menghargai. 😊',
        message: isLower
          ? 'Kata itu bisa bikin teman sedih. Yuk pakai kata yang baik! 😊'
          : 'Ayo kita gunakan kata-kata yang sopan dan baik ya! Kita bisa belajar lebih menyenangkan kalau saling menghargai. 😊',
        subMessage: isLower
          ? 'Ini peringatan pertama. Hati-hati ya!'
          : 'Ini peringatan pertama kamu. Yuk kita jaga kata-kata kita!',
        buttonText: isLower ? 'Oke, aku janji!' : 'Baik, Saya Akan Lebih Baik',
      };
    case 2:
      return {
        label: 'Peringatan Sedang',
        emoji: '😔',
        color: '#FFB366',
        borderColor: '#FF8C00',
        bgColor: 'rgba(255, 179, 102, 0.2)',
        iconBg: '#FFE0C0',
        starColor: '#FF8C00',
        title: isLower ? 'Peringatan kedua!' : 'Peringatan Kedua!',
        chatMessage: isLower
          ? 'Ini peringatan ke-2. Jangan ulangi ya! 🙏'
          : 'Kamu sudah mendapat peringatan kedua. Kata-kata kasar bisa menyakiti perasaan orang lain. Mari berbicara dengan baik. 🙏',
        message: isLower
          ? 'Kamu sudah dapat peringatan ke-2. Kata kasar bikin teman sedih lho. 🙏'
          : 'Kamu sudah mendapat peringatan kedua. Menggunakan kata-kata kasar bisa menyakiti perasaan orang lain. Mari kita berbicara dengan baik. 🙏',
        subMessage: isLower
          ? 'Satu lagi, guru akan tahu.'
          : 'Jika kamu mendapat satu peringatan lagi, guru akan diberitahu dan chat akan dihentikan.',
        buttonText: isLower ? 'Aku akan hati-hati!' : 'Saya Mengerti',
      };
    case 3:
    default:
      return {
        label: 'Peringatan Berat',
        emoji: '😢',
        color: '#FF9999',
        borderColor: '#FF4444',
        bgColor: 'rgba(255, 153, 153, 0.15)',
        iconBg: '#FFD6D6',
        starColor: '#FF4444',
        title: isLower ? 'Peringatan terakhir!' : 'Peringatan Terakhir!',
        chatMessage: isLower
          ? 'Chat berhenti. Guru akan bicara sama kamu. 😢'
          : 'Ini peringatan terakhir. Guru kamu akan diberitahu tentang perilaku ini. Chat telah dihentikan. 😢',
        message: isLower
          ? 'Chat kamu berhenti dulu ya. Guru akan bantu kamu. 😢'
          : 'Ini peringatan terakhir. Guru kamu akan diberitahu tentang perilaku ini. Menggunakan kata-kata kasar tidak baik dan bisa membuat teman-teman sedih. 😢',
        subMessage: isLower
          ? 'Guru dan orang tua akan bicara sama kamu.'
          : 'Guru akan menghubungi kamu dan orang tua untuk membicarakan hal ini.',
        buttonText: isLower ? 'Aku mengerti' : 'Saya Mengerti',
      };
  }
}
