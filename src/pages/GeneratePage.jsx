import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Wand2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import ModelCard from '../components/ModelCard'
import OptionPill from '../components/OptionPill'
import GenerationProgress from '../components/GenerationProgress'
import VideoPlayer from '../components/VideoPlayer'
import {
  MODELS, ASPECT_RATIOS, DURATIONS, RESOLUTIONS,
  CAMERA_MOVES, STYLES, MOTION_INTENSITY, FRAME_RATES,
} from '../lib/models'
import { generateVideo } from '../lib/api'
import { saveToGallery } from '../store/videoStore'

export default function GeneratePage({ onVideoCreated }) {
  const [prompt, setPrompt] = useState('')
  const [negPrompt, setNegPrompt] = useState('blur, watermark, text, artifacts, duplicate people')
  const [model, setModel] = useState(MODELS[2])
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [duration, setDuration] = useState('10s')
  const [resolution, setResolution] = useState('1080p')
  const [style, setStyle] = useState('Cinematic')
  const [camera, setCamera] = useState('Static')
  const [motion_, setMotion] = useState('Medium')
  const [fps, setFps] = useState('24 FPS')
  const [status, setStatus] = useState('idle') // idle | generating | done | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [resultUrl, setResultUrl] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const generate = async () => {
    if (!prompt.trim()) return
    setStatus('generating')
    setProgress(0)
    setError('')
    setResultUrl(null)
    try {
      const result = await generateVideo({
        model, prompt, aspectRatio, duration, resolution,
        style, camera, motion: motion_, negativePrompt: negPrompt,
        onProgress: setProgress,
      })
      setResultUrl(result.url)
      setStatus('done')
      const item = {
        id: Date.now().toString(),
        url: result.url,
        prompt,
        model: model.name,
        modelId: model.id,
        style, duration, resolution,
        createdAt: new Date().toISOString(),
        favorite: false,
      }
      saveToGallery(item)
      onVideoCreated?.()
    } catch (e) {
      setError(e.message || 'Generation failed. Please try again.')
      setStatus('error')
    }
  }

  const canGenerate = prompt.trim().length > 0 && status !== 'generating'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Generate Video</h1>
        <p className="text-sm text-white/40 mt-0.5">Describe your vision and let AI bring it to life</p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: prompt + settings */}
        <div className="col-span-3 space-y-4">
          {/* Prompt */}
          <div className="glass rounded-2xl p-4 border border-white/8">
            <label className="text-xs font-semibold text-white/40 mb-2 block">PROMPT</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              rows={4}
              className="w-full bg-transparent text-white/90 text-sm resize-none placeholder-white/20 leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-xs text-white/20">{prompt.length} chars</span>
              <span className="text-xs text-white/20">Tip: Be descriptive for better results</span>
            </div>
          </div>

          {/* Quick options row */}
          <div className="glass rounded-2xl p-4 border border-white/8 space-y-3">
            <OptionRow label="Aspect Ratio" options={ASPECT_RATIOS} selected={aspectRatio} onChange={setAspectRatio} />
            <OptionRow label="Duration" options={DURATIONS} selected={duration} onChange={setDuration} />
            <OptionRow label="Resolution" options={RESOLUTIONS} selected={resolution} onChange={setResolution} />
            <OptionRow label="Style" options={STYLES} selected={style} onChange={setStyle} wrap />
          </div>

          {/* Advanced */}
          <div className="glass rounded-2xl border border-white/8 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/60 hover:text-white/80 transition-colors cursor-pointer"
            >
              <span className="font-semibold">Advanced Settings</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                <OptionRow label="Camera" options={CAMERA_MOVES.map(c => c.label)} selected={camera} onChange={setCamera} wrap />
                <OptionRow label="Motion" options={MOTION_INTENSITY} selected={motion_} onChange={setMotion} />
                <OptionRow label="Frame Rate" options={FRAME_RATES} selected={fps} onChange={setFps} />
                <div>
                  <label className="text-xs font-semibold text-white/40 mb-1.5 block">NEGATIVE PROMPT</label>
                  <textarea
                    value={negPrompt}
                    onChange={e => setNegPrompt(e.target.value)}
                    rows={2}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white/60 placeholder-white/20 resize-none"
                    placeholder="What to avoid..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <motion.button
            onClick={generate}
            disabled={!canGenerate}
            whileHover={canGenerate ? { scale: 1.01 } : {}}
            whileTap={canGenerate ? { scale: 0.98 } : {}}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              canGenerate
                ? 'bg-gradient-to-r from-violet-600 to-purple-500 text-white glow-accent cursor-pointer hover:from-violet-500 hover:to-purple-400'
                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/8'
            }`}
          >
            {status === 'generating' ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Wand2 className="w-4 h-4" />
                </motion.div>
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Video
              </>
            )}
          </motion.button>

          <GenerationProgress status={status} progress={progress} model={model} error={error} />
        </div>

        {/* Right: model selector + preview */}
        <div className="col-span-2 space-y-4">
          <div className="glass rounded-2xl p-4 border border-white/8">
            <label className="text-xs font-semibold text-white/40 mb-3 block">MODEL</label>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {MODELS.map(m => (
                <ModelCard key={m.id} model={m} selected={model.id === m.id} onClick={() => setModel(m)} />
              ))}
            </div>
          </div>

          {/* Preview */}
          {(resultUrl || status === 'done') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <VideoPlayer src={resultUrl} className="w-full" />
              {resultUrl && (
                <div className="flex gap-2 mt-2">
                  <a
                    href={resultUrl}
                    download="video.mp4"
                    className="flex-1 text-center py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-xs font-medium text-violet-300 hover:bg-violet-600/30 transition-all"
                  >
                    Download MP4
                  </a>
                  <button
                    onClick={() => navigator.clipboard?.writeText(prompt)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/50 hover:text-white/70 transition-all"
                  >
                    Copy Prompt
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function OptionRow({ label, options, selected, onChange, wrap }) {
  return (
    <div>
      <div className="text-xs font-semibold text-white/40 mb-1.5">{label}</div>
      <div className={`flex gap-1.5 ${wrap ? 'flex-wrap' : 'flex-nowrap overflow-x-auto'}`}>
        {options.map(opt => (
          <OptionPill key={opt} label={opt} selected={selected === opt} onClick={() => onChange(opt)} />
        ))}
      </div>
    </div>
  )
}
