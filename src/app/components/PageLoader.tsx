import { motion, AnimatePresence } from 'motion/react';

type PageLoaderProps = {
  isLoading: boolean;
  message?: string;
};

export function PageLoader({ isLoading, message = "PROCESSING..." }: PageLoaderProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <>
          {/* 1. INVISIBLE CLICK BLOCKER (Prevents accidental clicks on sidebar/header while loading) */}
          <div className="fixed inset-0 z-[150] cursor-wait select-none" />

          {/* 2. eFOOTBALL-STYLE EMBLEM OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[140] bg-neutral-950/85 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl select-none"
            style={{ perspective: 1000 }}
          >
            {/* 3D Coin-Flip Emblem Container */}
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{
                repeat: Infinity,
                duration: 1.25,
                ease: "linear",
              }}
              className="w-16 h-16 flex items-center justify-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Geometric Segmented Emblem (Inspired by eFootball's crisp cut-circle icon) */}
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]"
              >
                {/* Top Arch */}
                <path d="M 20 35 A 35 35 0 0 1 80 35 L 68 35 A 23 23 0 0 0 32 35 Z" />
                
                {/* Center Solid Bar */}
                <rect x="15" y="42" width="70" height="16" rx="4" />
                
                {/* Bottom Arch */}
                <path d="M 20 65 A 35 35 0 0 0 80 65 L 68 65 A 23 23 0 0 1 32 65 Z" />
              </svg>
            </motion.div>

            {/* Minimalist Loading Text */}
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="mt-6 text-[11px] font-bold tracking-[0.3em] text-neutral-300 uppercase font-mono"
            >
              {message}
            </motion.p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}