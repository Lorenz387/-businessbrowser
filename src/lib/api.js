import { fal } from '@fal-ai/client'

if (import.meta.env.VITE_FAL_KEY) {
  fal.config({ credentials: import.meta.env.VITE_FAL_KEY })
}

export async function generateVideo({ model, prompt, aspectRatio, duration, resolution, style, camera, motion, negativePrompt, onProgress }) {
  const durationSec = parseInt(duration)

  if (model.provider === 'fal.ai') {
    return generateFalVideo({ model, prompt, aspectRatio, durationSec, resolution, style, camera, motion, negativePrompt, onProgress })
  }

  // Simulate for non-fal models
  return simulateGeneration({ model, prompt, onProgress })
}

async function generateFalVideo({ model, prompt, aspectRatio, durationSec, style, camera, negativePrompt, onProgress }) {
  const fullPrompt = [style && `${style} style,`, camera && `${camera} camera,`, prompt].filter(Boolean).join(' ')

  const ratioMap = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1', '4:3': '4:3' }
  const aspectMap = ratioMap[aspectRatio] || '16:9'

  onProgress?.(10)

  let falModelId = 'fal-ai/seedance-1-lite'
  if (model.id === 'seedance-1.0') falModelId = 'fal-ai/seedance-1-lite'

  const result = await fal.subscribe(falModelId, {
    input: {
      prompt: fullPrompt,
      negative_prompt: negativePrompt || 'blur, watermark, text, artifacts',
      duration: Math.min(durationSec, 10),
      aspect_ratio: aspectMap,
    },
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') onProgress?.(50)
      if (update.status === 'COMPLETED') onProgress?.(90)
    },
  })

  onProgress?.(100)
  return { url: result.data?.video?.url, type: 'video' }
}

async function simulateGeneration({ model, prompt, onProgress }) {
  const steps = [10, 25, 45, 60, 80, 95, 100]
  for (const step of steps) {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    onProgress?.(step)
  }
  // Return a placeholder since no real API key for this model
  throw new Error(`${model.name} requires a valid API key for ${model.provider}. Add it to your .env file.`)
}
