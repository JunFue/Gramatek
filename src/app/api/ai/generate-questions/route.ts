import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

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
    const questionCount = parseInt((formData.get('count') as string) || '5', 10)
    const questionType = (formData.get('questionType') as string) || 'multiple_choice'
    const file = formData.get('file') as File | null

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Choose model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question_text: {
                type: SchemaType.STRING,
                description: 'Ang tanong o pagsusulit sa wikang Filipino/Tagalog (o English kung hiniling).'
              },
              question_type: {
                type: SchemaType.STRING,
                description: 'multiple_choice o fill_blank'
              },
              options: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: 'Apat (4) na mapagpipilian para sa multiple choice. Walang laman para sa fill_blank.'
              },
              correct_answer: {
                type: SchemaType.STRING,
                description: 'Ang eksaktong tamang sagot (o choice text para sa multiple choice).'
              },
              suggested_time_seconds: {
                type: SchemaType.INTEGER,
                description: 'Mungkahing segundo para sagutin ang kard (karaniwang 20 hanggang 45 segundo).'
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
Lumikha ng ${questionCount} mataas na kalidad na mga tanong (quiz cards) para sa mga mag-aaral ng Gramatek.
Baitang / Antas ng mga Mag-aaral: ${gradeLevel}.
Uri ng mga Tanong: ${questionType === 'both' ? 'kumbinasyon ng multiple_choice at fill_blank' : questionType}.

MGA TUNTUNIN:
1. Gamitin ang wastong gramatika, baybay, at bantas sa Filipino (KWF standards).
2. Para sa multiple_choice: Siguraduhing may eksaktong 4 na magkakaibang opsyon sa 'options', at ang 'correct_answer' ay eksaktong tumutugma sa isa sa mga opsyon.
3. Para sa fill_blank: Gumamit ng '___' (tatlong underscore) sa loob ng question_text para sa patlang, at ilagay ang tamang salita sa 'correct_answer'.
4. Maging malinaw, kawili-wili, at angkop sa antas ng mag-aaral.`

    if (mode === 'extract_pdf') {
      systemInstruction += `
PANGUNAHING GAWAIN: BASAHIN ANG KALAKIP NA PDF DOCUMENT.
Kunin at isaayos ang mga tanong at tamang sagot na matatagpuan sa loob ng PDF. 
I-convert ang bawat tanong sa tamang JSON format. Kung may kulang na pagpipilian, magdagdag ng lohikal na distractors.`
    } else if (mode === 'lesson_pdf') {
      systemInstruction += `
PANGUNAHING GAWAIN: SURIIN ANG ARALIN/MODULE SA KALAKIP NA PDF DOCUMENT.
Bumuo ng ${questionCount} sariwang tanong batay sa nilalaman, kwento, talasalitaan, o konsepto ng aralin sa PDF.`
    } else {
      systemInstruction += `
Paksa: ${topic || 'Balarila at Talasalitaan sa Filipino'}.
Karagdagang Tagubilin ng Guro: ${promptText || 'Lumikha ng balanse at kapaki-pakinabang na mga tanong.'}`
    }

    if (promptText && (mode === 'extract_pdf' || mode === 'lesson_pdf')) {
      systemInstruction += `\nEspesyal na tagubilin mula sa guro: ${promptText}`
    }

    contents.push(systemInstruction)

    const result = await model.generateContent(contents)
    const responseText = result.response.text()

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

    // Format output with client IDs
    const formattedCards = parsedQuestions.map((q, idx) => ({
      id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      question_text: q.question_text || '',
      question_type: q.question_type || 'multiple_choice',
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : (q.question_type === 'multiple_choice' ? ['Opsyon A', 'Opsyon B', 'Opsyon C', 'Opsyon D'] : []),
      correct_answer: q.correct_answer || (Array.isArray(q.options) ? q.options[0] : ''),
      time_limit: q.suggested_time_seconds || 30,
      explanation: q.explanation || null
    }))

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
