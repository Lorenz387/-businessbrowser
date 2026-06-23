import { motion } from 'framer-motion'

export default function OptionPill({ label, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
        selected
          ? 'bg-violet-600/25 border-violet-500/50 text-violet-300'
          : 'bg-white/4 border-white/8 text-white/50 hover:border-white/20 hover:text-white/70'
      }`}
    >
      {label}
    </motion.button>
  )
}
