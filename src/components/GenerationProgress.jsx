import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function GenerationProgress({ status, progress, model, error }) {
  if (!status || status === 'idle') return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass rounded-2xl p-4 border border-white/8"
      >
        <div className="flex items-center gap-3 mb-3">
          {status === 'generating' && (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Loader2 className="w-5 h-5 text-violet-400" />
            </motion.div>
          )}
          {status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}

          <div>
            <div className="text-sm font-semibold text-white">
              {status === 'generating' && 'Generating your video...'}
              {status === 'done' && 'Your video is ready!'}
              {status === 'error' && 'Generation failed'}
            </div>
            {status === 'generating' && model && (
              <div className="text-xs text-white/40 mt-0.5">Model: {model.name}</div>
            )}
          </div>
        </div>

        {status === 'generating' && (
          <>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/30">Processing frames</span>
              <span className="text-xs text-violet-400 font-medium">{progress}%</span>
            </div>
          </>
        )}

        {status === 'error' && error && (
          <div className="mt-1 text-xs text-red-300/70 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
            {error}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
