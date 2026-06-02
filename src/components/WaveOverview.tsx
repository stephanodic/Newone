import React from 'react';
import { motion } from 'motion/react';

export default function WaveOverview({ stats }: { stats: import("../types").StatsResult }) {
  return (
    <div className="min-h-[200px] bg-gradient-to-br from-[#1D9E75] to-[#11cc98] relative overflow-hidden flex flex-col items-center justify-center text-white px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">Saldo Totale</span>
        <h2 className="text-6xl font-black tracking-tighter mb-1">
          { (stats?.balance || 0).toLocaleString() }
          <span className="text-2xl ml-1 opacity-50">€</span>
        </h2>
      </motion.div>
      <div className="absolute bottom-0 left-0 w-full h-32 opacity-20 bg-white/20 blur-2xl rounded-[100%]" />
    </div>
  );
}