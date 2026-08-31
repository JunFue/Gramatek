import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

// Active models supporting generateContent on Google AI API
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-2.5-pro'
]

export async function POST(req: NextRequest) {
  try {
    // 1. Verify educator authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Kailangan munang mag-sign in.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({
        error: 'Hindi pa naka-configure ang GEMINI_API_KEY sa .env.local. Mangyaring ilagay ang iyong Gemini API key.',
        missingKey: true
      }, { status: 400 })
    }

    const formData = await req.formData()
    const mode = (formData.get('mode') as string) || 'prompt' // 'prompt' | 'extract_pdf' | 'lesson_pdf'
    const promptText = (formData.get('prompt') as string) || ''
    const topic = (formData.get('topic') as string) || ''
    const gradeLevel = (formData.get('gradeLevel') as string) || 'Grade 4-6'
    
    // Parse per-type count breakdown if supplied
    const typeCountsRaw = formData.get('typeCounts') as string | null
    let typeCounts: Record<string, number> | null = null
    if (typeCountsRaw) {
      try {
        typeCounts = JSON.parse(typeCountsRaw)
      } catch (e) {
        console.warn('Failed to parse typeCounts JSON:', typeCountsRaw)
      }
    }

    // Support count up to 100 questions (default 100 for PDF extraction, 5 for prompt)
    let questionCount = 5
    if (typeCounts && (mode === 'prompt' || mode === 'lesson_pdf')) {
      const sum = Object.values(typeCounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
      questionCount = Math.min(100, Math.max(1, sum))
    } else {
      const rawCount = parseInt((formData.get('count') as string) || (mode === 'extract_pdf' ? '100' : '5'), 10)
      questionCount = Math.min(100, Math.max(1, isNaN(rawCount) ? 5 : rawCount))
    }
    
    const file = formData.get('file') as File | null

    const genAI = new GoogleGenerativeAI(apiKey)
    
    const contents: any[] = []

    // Add PDF if provided
    if (file && file.size > 0) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        return NextResponse.json({ error: 'Tanging PDF files lamang ang suportado.' }, { status: 400 })
      }
      
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64Pdf = buffer.toString('base64')

      contents.push({
        inlineData: {
          data: base64Pdf,
          mimeType: 'application/pdf'
        }
      })
    }

    // Build system instructions and user prompt
    let systemInstruction = `Ikaw ay isang dalubhasang guro sa Wikang Filipino at Balarila (Grammar Specialist).
Bumuo ng mga de-kalidad at nakakaaliw na mga tanong (plain quiz cards) sa Filipino nang WALANG pre-set timers.
Baitang / Antas ng mga Mag-aaral: ${gradeLevel}.

MGA TUNTUNIN SA MGA URI NG KARD:
1. 'multiple_choice':
   - 'question_text': Ang tanong.
   - 'options': Eksaktong 4 na magkakaibang opsyon sa array.
   - 'correct_answer': Eksaktong tumutugma sa isa sa mga opsyon sa array.
2. 'fill_blank':
   - 'question_text': May '___' (tatlong underscore) para sa patlang.
   - 'options': Walang laman ([]).
   - 'correct_answer': Ang tamang salita o parirala.
3. 'enumeration':
   - 'question_text': Hal. "Ilista ang 3 aspekto ng pandiwa:" o "Ibigay ang mga uri ng pangngalan:"
   - 'options': Array ng lahat ng katanggap-tanggap na tamang sagot (hal. ["perpektibo", "imperpektibo", "kontemplatibo"]).
   - 'correct_answer': Ang listahan ng tamang sagot na pinaghihiwalay ng kuwit o array.
4. 'word_scramble':
   - 'question_text': Hal. "Ayusin ang mga titik upang mabuo ang salitang kasingkahulugan ng maganda (Hint: M_R_K_T)"
   - 'options': Array ng mga nagulong titik (hal. ["R", "A", "M", "I", "T", "I", "K"]).
   - 'correct_answer': Ang tamang salita (hal. "MARIKIT").
5. 'true_false':
   - 'question_text': Isang pahayag sa balarila o talasalitaan (hal. "Ang salitang 'mabilis' ay isang pang-uri.")
   - 'options': ["TAMA", "MALI"]
   - 'correct_answer': "TAMA" o "MALI".
6. 'sentence_scramble':
   - 'question_text': "Ayusin ang mga salita upang makabuo ng wastong pangungusap."
   - 'options': Array ng mga nagulong salita (hal. ["si", "Nagluto", "ng", "adobo", "Nanay"]).
   - 'correct_answer': Ang buong tamang pangungusap (hal. "Nagluto si Nanay ng adobo.").

Pangkalahatang Tuntunin:
- Gamitin ang tamang ortograpiya at balarilang Filipino (KWF).
- Maging malinaw, kawili-wili, at angkop sa antas.`

    if (mode === 'extract_pdf') {
      systemInstruction += `
PANGUNAHING GAWAIN SA QUESTION SHEET / TEST PAPER PDF:
1. BASAHIN NANG BUO AT KUMPLETO ANG KALAKIP NA PDF DOCUMENT.
2. Kunin at i-extract ang LAHAT ng mga tanong at tamang sagot na nakasulat sa loob ng PDF (hanggang sa maximum na ${questionCount} tanong).
3. AWTOMATIKONG TUKUYIN (AUTO-DETECT) ANG ANGKOP NA URI NG KARD (question_type) PARA SA BAWAT TANONG BATAY SA PORMAT NITO SA PDF:
   - Kung may mga pagpipilian (A, B, C, D) -> 'multiple_choice'
   - Kung may patlang o identification / missing term -> 'fill_blank'
   - Kung humihingi ng listahan ng mga aytem o halimbawa -> 'enumeration'
   - Kung may scrambled letters o baybayin ang titik -> 'word_scramble'
   - Kung pahayag na may Tama/Mali o True/False -> 'true_false'
   - Kung pagsasaayos ng salita sa tamang pangungusap -> 'sentence_scramble'
4. Isaayos ang bawat na-extract na tanong ayon sa wastong question_type at JSON format.`
    } else if (mode === 'lesson_pdf') {
      systemInstruction += `
PANGUNAHING GAWAIN SA ARALIN / KWENTO / MODULE PDF:
1. SURIIN ANG ARALIN O KWENTO SA KALAKIP NA PDF DOCUMENT.
2. Bumuo ng kabuuang ${questionCount} sariwang tanong batay sa nilalaman, kwento, talasalitaan, o konsepto ng aralin sa PDF.`

      if (typeCounts) {
        systemInstruction += `
3. SUNDIN NANG MAHIGPIT ANG SUMUSUNOD NA DISTRIBUSYON NG MGA URI NG KARD:
   - Multiple Choice ('multiple_choice'): ${typeCounts.multiple_choice || 0} tanong
   - Punan ang Patlang ('fill_blank'): ${typeCounts.fill_blank || 0} tanong
   - Enumerasyon ('enumeration'): ${typeCounts.enumeration || 0} tanong
   - Word Scramble ('word_scramble'): ${typeCounts.word_scramble || 0} tanong
   - Tama o Mali ('true_false'): ${typeCounts.true_false || 0} tanong
   - Ayusin ang Pangungusap ('sentence_scramble'): ${typeCounts.sentence_scramble || 0} tanong

Tiyaking ang bawat binuong tanong ay eksaktong tumutugma sa itinakdang dami ng bawat uri sa itaas.`
      }
    } else {
      systemInstruction += `
Paksa: ${topic || 'Balarila at Talasalitaan sa Filipino'}.
Kabuuang Bilang ng Tanong: ${questionCount}.`

      if (typeCounts) {
        systemInstruction += `
SUNDIN NANG MAHIGPIT ANG SUMUSUNOD NA DISTRIBUSYON NG MGA URI NG KARD:
- Multiple Choice ('multiple_choice'): ${typeCounts.multiple_choice || 0} tanong
- Punan ang Patlang ('fill_blank'): ${typeCounts.fill_blank || 0} tanong
- Enumerasyon ('enumeration'): ${typeCounts.enumeration || 0} tanong
- Word Scramble ('word_scramble'): ${typeCounts.word_scramble || 0} tanong
- Tama o Mali ('true_false'): ${typeCounts.true_false || 0} tanong
- Ayusin ang Pangungusap ('sentence_scramble'): ${typeCounts.sentence_scramble || 0} tanong

Tiyaking ang bawat binuong tanong ay eksaktong tumutugma sa itinakdang dami ng bawat uri sa itaas.`
      }

      systemInstruction += `\nKaragdagang Tagubilin ng Guro: ${promptText || 'Lumikha ng balanse at kapaki-pakinabang na mga tanong.'}`
    }

    if (promptText && (mode === 'extract_pdf' || mode === 'lesson_pdf')) {
      systemInstruction += `\nEspesyal na tagubilin mula sa guro: ${promptText}`
    }

    contents.push(systemInstruction)

    // Try candidate models in order
    let lastError: any = null
    let responseText: string | null = null

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  question_text: {
                    type: SchemaType.STRING,
                    description: 'Ang tanong o pagsusulit sa wikang Filipino.'
                  },
                  question_type: {
                    type: SchemaType.STRING,
                    description: 'multiple_choice, fill_blank, enumeration, word_scramble, true_false, o sentence_scramble'
                  },
                  options: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: 'Array ng options, list items, scrambled letters, scrambled words, o [TAMA, MALI]'
                  },
                  correct_answer: {
                    type: SchemaType.STRING,
                    description: 'Ang tamang sagot, salita, o pangungusap.'
                  },
                  explanation: {
                    type: SchemaType.STRING,
                    description: 'Maikling paliwanag kung bakit ito ang tamang sagot.'
                  }
                },
                required: ['question_text', 'question_type', 'correct_answer']
              }
            }
          }
        })

        const result = await model.generateContent(contents)
        responseText = result.response.text()
        if (responseText) break
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or unavailable:`, err?.message || err)
        lastError = err
      }
    }

    if (!responseText) {
      throw lastError || new Error('Hindi makakonekta sa alinmang Gemini model.')
    }

    let parsedQuestions: any[] = []
    try {
      parsedQuestions = JSON.parse(responseText)
    } catch (parseErr) {
      console.error('Failed to parse Gemini output:', responseText, parseErr)
      return NextResponse.json({ error: 'Nabigo sa pag-format ng mga tanong mula sa AI.' }, { status: 500 })
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return NextResponse.json({ error: 'Walang nabuong tanong mula sa ibinigay na prompt o PDF.' }, { status: 400 })
    }

    // Format output with client IDs and clean options
    const formattedCards = parsedQuestions.map((q, idx) => {
      const type = q.question_type || 'multiple_choice'
      let options = Array.isArray(q.options) ? q.options : []

      if (type === 'true_false' && options.length === 0) {
        options = ['TAMA', 'MALI']
      } else if (type === 'word_scramble' && options.length === 0 && q.correct_answer) {
        options = String(q.correct_answer).toUpperCase().split('').sort(() => Math.random() - 0.5)
      } else if (type === 'sentence_scramble' && options.length === 0 && q.correct_answer) {
        options = String(q.correct_answer).split(' ').sort(() => Math.random() - 0.5)
      } else if (type === 'multiple_choice' && options.length === 0) {
        options = ['Opsyon A', 'Opsyon B', 'Opsyon C', 'Opsyon D']
      }

      return {
        id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        question_text: q.question_text || '',
        question_type: type,
        options,
        correct_answer: q.correct_answer || (options[0] || ''),
        time_limit: null,
        explanation: q.explanation || null
      }
    })

    return NextResponse.json({
      success: true,
      cards: formattedCards,
      count: formattedCards.length
    })

  } catch (error: any) {
    console.error('Error generating AI questions:', error)
    return NextResponse.json({
      error: error?.message || 'Nagkaroon ng aberya sa pakikipag-ugnayan sa Gemini AI.'
    }, { status: 500 })
  }
}
