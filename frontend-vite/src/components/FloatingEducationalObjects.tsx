import { motion } from 'framer-motion';

const items = [
  { icon: '📚', left: '8%', top: '18%', delay: 0, duration: 4.2, rotate: -8 },
  { icon: '✏️', left: '18%', top: '62%', delay: 0.5, duration: 4.8, rotate: 10 },
  { icon: '⭐', left: '74%', top: '18%', delay: 0.8, duration: 3.7, rotate: 12 },
  { icon: '💡', left: '78%', top: '62%', delay: 1.4, duration: 4.5, rotate: -10 },
  { icon: '🎨', left: '56%', top: '12%', delay: 1.1, duration: 4.1, rotate: 7 },
  { icon: '📖', left: '86%', top: '48%', delay: 1.9, duration: 5.1, rotate: -12 },
  { icon: '🌟', left: '12%', top: '44%', delay: 2.1, duration: 4.4, rotate: 8 },
];

export function FloatingEducationalObjects() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {items.map((item) => (
        <motion.div
          key={`${item.icon}-${item.left}-${item.top}`}
          animate={{
            y: [0, -18, 0],
            x: [0, 10, 0],
            rotate: [item.rotate, item.rotate + 8, item.rotate],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: item.delay,
          }}
          className="absolute text-3xl drop-shadow-sm"
          style={{ left: item.left, top: item.top }}
        >
          <span>{item.icon}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default FloatingEducationalObjects;
