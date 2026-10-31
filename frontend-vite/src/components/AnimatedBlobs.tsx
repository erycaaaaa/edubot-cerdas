import { motion } from 'framer-motion';

export function AnimatedBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        animate={{ x: [25, 75, 25], y: [30, 70, 30] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[12%] left-[8%] w-14 h-14 bg-[#B9895F] rounded-full blur-xl opacity-35"
      />
      <motion.div
        animate={{ x: [15, 80, 15], y: [40, 85, 40] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        className="absolute top-[25%] right-[15%] w-14 h-14 bg-[#776938] rounded-full blur-xl opacity-30"
      />
      <motion.div
        animate={{ x: [35, 20, 35], y: [50, 25, 50] }}
        transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        className="absolute top-[48%] left-[18%] w-14 h-14 bg-[#BDB2A0] rounded-full blur-xl opacity-40"
      />
      <motion.div
        animate={{ x: [30, 90, 30], y: [35, 15, 35] }}
        transition={{ duration: 4.3, repeat: Infinity, ease: 'easeInOut', delay: 1.8 }}
        className="absolute bottom-[30%] right-[22%] w-14 h-14 bg-[#B9895F] rounded-full blur-xl opacity-30"
      />
      <motion.div
        animate={{ x: [45, 85, 45], y: [25, 65, 25] }}
        transition={{ duration: 3.7, repeat: Infinity, ease: 'easeInOut', delay: 2.4 }}
        className="absolute top-[60%] right-[10%] w-14 h-14 bg-[#776938] rounded-full blur-xl opacity-35"
      />
      <motion.div
        animate={{ x: [20, 70, 20], y: [55, 90, 55] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute bottom-[20%] left-[12%] w-14 h-14 bg-[#BDB2A0] rounded-full blur-xl opacity-40"
      />
      <motion.div
        animate={{ x: [50, 25, 50], y: [45, 20, 45] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 3.6 }}
        className="absolute top-[35%] right-[35%] w-14 h-14 bg-[#B9895F] rounded-full blur-xl opacity-25"
      />
    </div>
  );
}
