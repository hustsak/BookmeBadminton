"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Sparkles } from "lucide-react";

export function MobileBadmintonHero() {
  const [smashCount, setSmashCount] = useState(0);
  const [isSmashing, setIsSmashing] = useState(false);
  const [impactEffect, setImpactEffect] = useState(false);

  const handleSmash = () => {
    setIsSmashing(true);
    setImpactEffect(true);
    setSmashCount((prev) => prev + 1);

    setTimeout(() => {
      setImpactEffect(false);
    }, 300);

    setTimeout(() => {
      setIsSmashing(false);
    }, 450);
  };

  return (
    <div className="w-full select-none">
      <motion.div
        onClick={handleSmash}
        role="button"
        tabIndex={0}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[20px] border border-[#2b3c30] bg-gradient-to-r from-[#121c15] via-[#1a291f] to-[#121b14] h-[132px] p-2.5 text-white shadow-[0_6px_22px_rgba(18,27,20,0.18)] cursor-pointer active:scale-[0.99] transition-transform flex flex-col justify-between"
        title="Tap to smash the shuttlecock!"
      >
        {/* Ambient Glows */}
        <div
          className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-25 pointer-events-none"
          style={{ background: "#a8e63d" }}
        />
        <div
          className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ background: "#62d9c3" }}
        />

        {/* Realistic Badminton Court Lines */}
        <div className="absolute inset-0 opacity-[0.14] pointer-events-none">
          {/* Outer Boundary */}
          <div className="absolute inset-2 border border-white/60 rounded-xl" />
          {/* Center Net Line */}
          <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-[2px] bg-white border-x border-dashed border-white/80" />
          {/* Net Mesh Top Bar */}
          <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-4 bg-white/5 border-x border-white/40" />
          {/* Short Service Lines */}
          <div className="absolute top-2 bottom-2 left-[28%] w-[1px] bg-white/40" />
          <div className="absolute top-2 bottom-2 right-[28%] w-[1px] bg-white/40" />
        </div>

        {/* Clean Court Interior: Racket & Shuttlecock flying across court */}
        <div className="relative z-10 w-full flex-1 flex items-center justify-between px-6 overflow-hidden">
          {/* LEFT SIDE: Flying Shuttlecock */}
          <div className="relative w-24 h-20 flex items-center justify-center">
            {/* Flying Shuttlecock with Dynamic Trajectory */}
            <motion.div
              animate={
                isSmashing
                  ? {
                      x: [0, 75, 12, 0],
                      y: [-2, -28, 8, 0],
                      rotate: [15, -45, 10, 15],
                      scale: [1, 1.35, 1],
                    }
                  : {
                      x: [0, 42, 0],
                      y: [0, -16, 0],
                      rotate: [10, -22, 10],
                    }
              }
              transition={{
                duration: isSmashing ? 0.44 : 2.2,
                repeat: isSmashing ? 0 : Infinity,
                ease: "easeInOut",
              }}
              className="relative w-[40px] h-[40px] pointer-events-none transform-gpu will-change-transform"
            >
              <img
                src="/images/shuttlecock_hero.png"
                alt="Badminton Shuttlecock"
                className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
              />

              {/* Shuttlecock Speed Trail */}
              {isSmashing && (
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-10 h-2 bg-gradient-to-r from-transparent to-[#a8e63d] rounded-full blur-[1px] opacity-80" />
              )}
            </motion.div>
          </div>

          {/* CENTER: Net Kicker / Spark Impact */}
          <div className="relative flex flex-col items-center justify-center pointer-events-none">
            {/* Impact Flash Glow */}
            <AnimatePresence>
              {impactEffect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.8 }}
                  exit={{ opacity: 0, scale: 2.2 }}
                  transition={{ duration: 0.3 }}
                  className="absolute w-14 h-14 rounded-full bg-[#a8e63d]/55 blur-md"
                />
              )}
            </AnimatePresence>

            {/* Subtle net marker dot */}
            <div className="relative z-10 flex items-center gap-1.5 opacity-60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a8e63d]" />
            </div>
          </div>

          {/* RIGHT SIDE: Animated Badminton Racket */}
          <div className="relative w-28 h-20 flex items-center justify-end pr-2">
            <motion.div
              animate={
                isSmashing
                  ? {
                      rotate: [-35, -88, -35],
                      scale: [1, 1.25, 1],
                      x: [0, -20, 0],
                      y: [0, -10, 0],
                    }
                  : {
                      rotate: [-35, -52, -35],
                      y: [0, 5, 0],
                    }
              }
              transition={{
                duration: isSmashing ? 0.44 : 2.2,
                repeat: isSmashing ? 0 : Infinity,
                ease: "easeInOut",
              }}
              className="relative w-[58px] h-[78px] origin-bottom pointer-events-none transform-gpu will-change-transform"
            >
              <img
                src="/images/racket_hero.png"
                alt="Yonex Badminton Racket"
                className="w-full h-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.7)]"
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
