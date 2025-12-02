import { motion } from "motion/react";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl"
      />

      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl"
      />

      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-amber-400/20 rounded-full blur-3xl"
      />

      {/* Flowing wave patterns */}
      <svg className="absolute bottom-0 left-0 w-full h-64 opacity-10">
        <motion.path
          d="M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 V200 H0 Z"
          fill="url(#gradient1)"
          animate={{
            d: [
              "M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 V200 H0 Z",
              "M0,100 Q250,150 500,100 T1000,100 T1500,100 T2000,100 V200 H0 Z",
              "M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 V200 H0 Z",
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-amber-400/30 rounded-full"
          animate={{
            y: [0, -1000],
            x: [0, Math.random() * 100 - 50],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `-${Math.random() * 100}px`,
          }}
        />
      ))}

      {/* Mandala-like pattern */}
      <svg className="absolute top-40 right-40 w-96 h-96 opacity-5">
        <motion.circle
          cx="192"
          cy="192"
          r="150"
          stroke="#d97706"
          strokeWidth="2"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ originX: "192px", originY: "192px" }}
        />
        <motion.circle
          cx="192"
          cy="192"
          r="120"
          stroke="#f59e0b"
          strokeWidth="2"
          fill="none"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{ originX: "192px", originY: "192px" }}
        />
        <motion.circle
          cx="192"
          cy="192"
          r="90"
          stroke="#ea580c"
          strokeWidth="2"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ originX: "192px", originY: "192px" }}
        />
        {[...Array(8)].map((_, i) => (
          <motion.line
            key={i}
            x1="192"
            y1="192"
            x2={192 + Math.cos((i * Math.PI) / 4) * 150}
            y2={192 + Math.sin((i * Math.PI) / 4) * 150}
            stroke="#d97706"
            strokeWidth="1"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{
              duration: 3,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>

      {/* Lotus petal pattern */}
      <svg className="absolute bottom-40 left-40 w-80 h-80 opacity-5">
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ originX: "160px", originY: "160px" }}
        >
          {[...Array(12)].map((_, i) => (
            <motion.ellipse
              key={i}
              cx="160"
              cy="160"
              rx="60"
              ry="20"
              fill="#d97706"
              transform={`rotate(${i * 30} 160 160)`}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{
                duration: 4,
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.g>
      </svg>
    </div>
  );
}
