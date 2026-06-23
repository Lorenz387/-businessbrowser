import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function ModelCard({ model, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
        selected
          ? 'border-violet-500/60 bg-violet-600/15 glow-accent-sm'
          : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white leading-tight">{model.name}</div>
          <div className="text-[11px] text-white/40 mt-0.5">{model.provider}</div>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div
        className="mt-2 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{ background: `${model.color}20`, color: model.color, border: `1px solid ${model.color}40` }}
      >
        {model.badge}
      </div>
    </motion.button>
  )
}
