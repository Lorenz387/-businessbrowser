export const MODELS = [
  { id: 'gpt-video-1', name: 'GPT Video 1', provider: 'OpenAI', badge: 'Text-to-Video', color: '#10b981' },
  { id: 'nano-banana-2', name: 'Nano Banana Video 2', provider: 'Gemini', badge: 'Text-to-Video', color: '#3b82f6' },
  { id: 'seedance-1.0', name: 'Seedance 1.0', provider: 'fal.ai', badge: 'Cinematic', color: '#7c3aed' },
  { id: 'veo-3', name: 'Veo 3', provider: 'Gemini', badge: 'High Realism', color: '#06b6d4' },
  { id: 'kling-3', name: 'Kling 3', provider: 'Kling AI', badge: 'Character', color: '#f59e0b' },
  { id: 'runway-gen4', name: 'Runway Gen-4', provider: 'Runway', badge: 'Stylized', color: '#ec4899' },
  { id: 'pika-2.2', name: 'Pika Labs 2.2', provider: 'Pika', badge: 'Fast', color: '#84cc16' },
]

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3']
export const DURATIONS = ['5s', '10s', '15s', '30s', '60s']
export const RESOLUTIONS = ['720p', '1080p', '1440p', '4K']
export const FRAME_RATES = ['24 FPS', '30 FPS', '60 FPS']
export const MOTION_INTENSITY = ['Low', 'Medium', 'High']

export const CAMERA_MOVES = [
  { id: 'static', label: 'Static' },
  { id: 'pan-left', label: 'Pan Left' },
  { id: 'pan-right', label: 'Pan Right' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'handheld', label: 'Handheld' },
  { id: 'drone', label: 'Drone Shot' },
]

export const STYLES = [
  'Cinematic', 'Anime', 'Photorealistic', 'Documentary',
  'Cyberpunk', 'Fantasy', 'Horror', 'Studio Lighting', 'Vintage Film', 'Noir',
]
