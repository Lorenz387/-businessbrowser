import { useNavigate } from 'react-router-dom'
import { post } from './api.js'
import { useAction } from './hooks.js'

export const STEP_TYPE_LABEL = {
  lesson: 'Lektion',
  open_lesson: 'Lektion fortsetzen',
  practice: 'Übung',
  review: 'Wiederholung',
  apply: 'Anwenden',
}

/** Executes a learning-plan step: generates a lesson / practice session, or navigates. */
export function useStartStep() {
  const navigate = useNavigate()
  const action = useAction()
  const start = (step) => action.run(async () => {
    if (step.type === 'open_lesson') return navigate(`/learn/lessons/${step.lessonId}`)
    if (step.type === 'lesson') {
      const r = await post('/lessons', { skillId: step.skillId, goalId: step.goalId, mode: step.mode })
      return navigate(`/learn/lessons/${r.id}`)
    }
    if (step.type === 'practice' || step.type === 'review') {
      const r = await post('/practice', { skillId: step.skillId, review: step.type === 'review', count: step.type === 'review' ? 4 : 5 })
      return navigate(`/practice/${r.id}`)
    }
    if (step.type === 'apply') return navigate(`/missions?skill=${step.skillId}`)
  }).catch(() => {})
  return { start, pending: action.pending, error: action.error }
}
