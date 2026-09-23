import { LiveQuestionType, LiveSessionQuestion, LiveSessionQuestionChoice } from '@/types/live-session'

/**
 * Extracts a flat string[] array of choice texts from choices regardless
 * of whether choices is stored as an array of strings, array of objects,
 * or wrapped in an object like { question_type, options: [...] }.
 */
export function extractChoicesList(choices: unknown): string[] {
  if (!choices) return []

  // If choices is an object wrapper like { question_type: '...', options: [...] }
  if (typeof choices === 'object' && choices !== null && !Array.isArray(choices)) {
    const obj = choices as Record<string, unknown>
    if (Array.isArray(obj.options)) return extractChoicesList(obj.options)
    if (Array.isArray(obj.choices)) return extractChoicesList(obj.choices)
    if (Array.isArray(obj.items)) return extractChoicesList(obj.items)
  }

  if (Array.isArray(choices)) {
    return choices.map((c: unknown) => {
      if (typeof c === 'string') return c
      if (typeof c === 'number') return String(c)
      if (typeof c === 'object' && c !== null) {
        const obj = c as Record<string, unknown>
        return String(obj.text || obj.label || obj.option || '')
      }
      return String(c ?? '')
    })
  }

  return []
}

/**
 * Reliably determines the question type of any live session question,
 * using explicit column values, embedded metadata, or smart heuristics.
 */
export function resolveQuestionType(question?: {
  question_type?: string | null
  choices?: unknown
  correct_answer?: string | null
  prompt?: string | null
} | null): LiveQuestionType {
  if (!question) return 'multiple_choice'

  // 1. Explicit property
  if (question.question_type) {
    const normalized = question.question_type.trim().toLowerCase()
    if (
      normalized === 'multiple_choice' ||
      normalized === 'fill_blank' ||
      normalized === 'enumeration' ||
      normalized === 'word_scramble' ||
      normalized === 'true_false' ||
      normalized === 'sentence_scramble'
    ) {
      return normalized as LiveQuestionType
    }
  }

  // 2. Embedded in choices object
  if (question.choices && typeof question.choices === 'object' && !Array.isArray(question.choices)) {
    const obj = question.choices as Record<string, unknown>
    const embedded = String(obj.question_type || obj.type || '').trim().toLowerCase()
    if (
      embedded === 'multiple_choice' ||
      embedded === 'fill_blank' ||
      embedded === 'enumeration' ||
      embedded === 'word_scramble' ||
      embedded === 'true_false' ||
      embedded === 'sentence_scramble'
    ) {
      return embedded as LiveQuestionType
    }
  }

  // 3. Fallback Heuristics
  const correct = String(question.correct_answer || '').trim()
  const list = extractChoicesList(question.choices)

  // True / False
  if (
    (correct.toUpperCase() === 'TAMA' || correct.toUpperCase() === 'MALI') &&
    list.length === 2 &&
    list.some((s) => s.toUpperCase() === 'TAMA')
  ) {
    return 'true_false'
  }

  // Empty choices -> fill_blank
  if (!list || list.length === 0) {
    return 'fill_blank'
  }

  // Word Scramble: options are all 1-character letters, and anagram of correct_answer
  const isAllSingleChars = list.every((c) => c.length === 1)
  const cleanCorrect = correct.replace(/\s+/g, '').toUpperCase()
  if (isAllSingleChars && list.length > 1 && cleanCorrect.length === list.length) {
    const sortedChoiceChars = [...list].map((c) => c.toUpperCase()).sort().join('')
    const sortedAnsChars = cleanCorrect.split('').sort().join('')
    if (sortedChoiceChars === sortedAnsChars) {
      return 'word_scramble'
    }
  }

  // Sentence Scramble: options are words that unscramble to target sentence
  if (list.length > 2 && correct.includes(' ')) {
    const normalizeWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const sortedChoiceWords = [...list].map(normalizeWords).sort().join(' ')
    const sortedAnsWords = correct.split(/\s+/).map(normalizeWords).sort().join(' ')
    if (sortedChoiceWords === sortedAnsWords) {
      return 'sentence_scramble'
    }
  }

  // Enumeration: correct answer contains comma, or list matches comma-separated items
  if (correct.includes(',') || (list.length >= 2 && list.length === correct.split(',').length)) {
    const correctItems = correct.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    if (correctItems.length > 1) {
      const matchCount = list.filter((c) => correctItems.includes(c.toLowerCase())).length
      if (matchCount >= 2 || matchCount === list.length) {
        return 'enumeration'
      }
    }
  }

  return 'multiple_choice'
}

/**
 * Returns human-readable Tagalog/English label for a question type
 */
export function getQuestionTypeMeta(type: LiveQuestionType) {
  switch (type) {
    case 'word_scramble':
      return {
        labelFil: 'Ayusin ang Titik (Word Scramble)',
        labelEn: 'Word Scramble',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
      }
    case 'enumeration':
      return {
        labelFil: 'Enumerasyon (Listahan)',
        labelEn: 'Enumeration',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
      }
    case 'sentence_scramble':
      return {
        labelFil: 'Ayusin ang Pangungusap',
        labelEn: 'Sentence Scramble',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
      }
    case 'true_false':
      return {
        labelFil: 'Tama o Mali',
        labelEn: 'True or False',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300'
      }
    case 'fill_blank':
      return {
        labelFil: 'Punan ang Patlang',
        labelEn: 'Fill in the Blank',
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300'
      }
    case 'multiple_choice':
    default:
      return {
        labelFil: 'Pagpipilian (Multiple Choice)',
        labelEn: 'Multiple Choice',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300'
      }
  }
}
