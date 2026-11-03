import { motion } from 'framer-motion';

const pastelShapes = [
  { className: 'left-[7%] top-[12%] bg-[#F6C8D5] opacity-35', duration: 4.3, delay: 0 },
  { className: 'right-[10%] top-[16%] bg-[#D9CEF5] opacity-30', duration: 5.1, delay: 0.7 },
  { className: 'left-[18%] top-[48%] bg-[#C8E8D5] opacity-38', duration: 4.8, delay: 1.2 },
  { className: 'right-[18%] bottom-[26%] bg-[#C7E4F5] opacity-32', duration: 4.6, delay: 1.8 },
  { className: 'right-[8%] top-[62%] bg-[#F8E5A4] opacity-28', duration: 3.9, delay: 2.4 },
  { className: 'left-[12%] bottom-[18%] bg-[#F6C8D5] opacity-36', duration: 4.7, delay: 3 },
  { className: 'right-[34%] top-[30%] bg-[#D9CEF5] opacity-24', duration: 4.1, delay: 3.2 },
];

export function AnimatedBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {pastelShapes.map((shape, index) => (
        <motion.div
          key={`${shape.className}-${index}`}
          animate={{ x: [8, 54, 8], y: [10, 48, 10] }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: shape.delay,
          }}
          className={`absolute h-16 w-16 rounded-full blur-2xl ${shape.className}`}
        />
      ))}
    </div>
  );
}
