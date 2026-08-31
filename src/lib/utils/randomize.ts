import { LiveSessionQuestionChoice } from '@/types/live-session'

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
function createPrng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Computes a 32-bit integer hash from a string
 */
function stringToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

/**
 * Normalizes raw choices (array of strings or object choices) into LiveSessionQuestionChoice[]
 */
export function normalizeChoices(choices: unknown): LiveSessionQuestionChoice[] {
  if (!choices) return []
  
  if (Array.isArray(choices)) {
    return choices.map((c: unknown, index: number) => {
      if (typeof c === 'string') {
        return { id: String(index), text: c }
      }
      if (typeof c === 'object' && c !== null) {
        const obj = c as Record<string, unknown>
        return {
          id: String(obj.id !== undefined ? obj.id : index),
          text: String(obj.text || obj.label || obj.option || '')
        }
      }
      return { id: String(index), text: String(c) }
    })
  }

  return []
}

/**
 * Shuffles choices deterministically using a seed constructed from (participantId + questionId)
 */
export function shuffleChoicesDeterministically(
  choices: LiveSessionQuestionChoice[],
  seedKey: string
): LiveSessionQuestionChoice[] {
  if (!choices || choices.length <= 1) return choices
  
  const seed = stringToSeed(seedKey)
  const prng = createPrng(seed)
  const result = [...choices]

  // Fisher-Yates shuffle with seeded PRNG
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }

  return result
}
