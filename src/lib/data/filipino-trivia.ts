export const ALAM_MO_BA_FACTS = [
  "Walang kasarian ang panghalip sa Filipino – walang katumbas ang ‘he/she’ o ‘him/her’, sa halip ay ginagamit ng salitang siya para tumukoy sa isang tao.",
  "Bagong Alpabetong Filipino – ang mga titik na C, CH, F, J, LL, Ñ, Q, RR, V, X at Z ay hindi kabilang sa abakada, ang mga ito ay idinagdag lamang at itinuturing na mga hiram na titik.",
  "Pagpapalit ng D tungo sa R – ang din/daw ay nagiging rin/raw kapag sumusunod sa salitang nagtatapos sa patinig o malapatinig.",
  "NG at NANG – ginagamit ang ng kasunod ng pangngalan, pang-uri o pagpapakita ng pagmamay-ari, habang ang nang naman ay ginagamit bilang katumbas ng noong, pagsasabi ng paraan at bilang pang-angkop ng inuulit na salita.",
  "May at Mayroon – parehas itong ginagagamit sa pagpapahayag ng pagmamay-ari, ngunit ginagamit ang may kapag pangngalan ang kasunod, habang ginagamit naman ang mayroon kapag panghalip ang kasunod nito.",
  "Subukin at Subukan – ginagamit ang subukin upang suriin ang uri, lakas o kakayahan ng isang tao o bagay, habang ang subukan naman ay ginagamit upang malaman ang ginagawa ng isang tao.",
  "Pahirin at Pahiran – ginagamit ang pahirin sa pagpapa-alis o pagpapapawi ng isang bagay, habang ang pahiran naman ay ginagamit sa pagpapalagay ng isang bagay.",
  "Punasin at Punasan – ginagamit ang punasin kapag binabanggit ang bagay na tinatanggal, habang ang punasan ay ginagamit kapag binabanggit ang bagay na pagtatanggalan ng kung ano man.",
  "Operahin at Operahan – ginagamit ang operahin kapag tinutukoy ang tiyak na bahaging tinitistis, habang ang operahan naman ay ginagamit kapag tinutukoy ang tao at hindi ang bahagi ng kanyang katawan.",
  "Kung at Kong – ang kung ay isang pangatnig na panubali na ginagamit sa hugnayang pangungusap, habang ang kong naman ay nanggaling sa panghalip na panaong ko at inaangkupan lamang ng ng.",
  "Pinto at Pintuan – ginagamit ang pinto sa pagtukoy sa bahagi ng daanan na isinasara at ibinubukas, habang ang pintuan naman ay ginagamit sa pagtukoy sa kinalalagyan ng pinto, ang bahaging daraanan kapag bumukas na ang pinto.",
  "Iwan at Iwanan – ginagamit ang iwan kapag may hindi isasama o dadalhin, habang ang iwanan naman ay ginagamit kapag may ibibigay na kung ano sa isang tao.",
  "Sundin at Sundan – ginagamit ang sundin sa pagpapasunod ng isang payo o pangaral habang ang sundan naman ay ginagamit kapag gagayahin ang ginagawa o pinupuntahan ng iba.",
  "Tungtong, Tuntong at Tunton – ang tungtong ay panakip sa palayok o kawali, ang tuntong naman ay pagyapak sa ano mang bagay, habang ang tunton ay pagbakas o paghanap sa bakas ng ano mang bagay.",
  "Hagdan at Hagdanan – ginagamit ang hagdan sa pagtukoy sa mga baytang at inaakyatan o binababaan sa isang bahay o gusali, habang ang hagdanan naman ay ginagamit sa pagtukoy sa bahagi ng bahay na kinalalagyan ng hagdan.",
  "Gatlang En at Em – ginagamit ang gatlang en upang katawanin ang salitang 'hanggang' o sa mga panahong nagpapatuloy gaya ng sa petsa habang ang gatlang em naman ay ginagamit upang magsaad ng pansamantalang pagtigil sa pagbasa o daloy ng ideya at diin sa paliwanag.",
  "Mga Karaniwang Bantas - kuwit (,), tuldok (.), pananong (?), padamdam (!), tuldok-kuwit (;), tutuldok (:), kuldit (') at gitling (-).",
  "Alibata o Baybayin – hindi alibata ang sinaunang paraan ng pagsusulat ng mga katutubong Pilipino. Baybayin ang tunay na sinaunang alpabeto ng mga katutubong Pilipino.",
  "Pambansang Wika – Tagalog (1937), Pilipino (1959) at naging opisyal na Fiipino ang pambansang wika sa ilalim ng konstitusyon ng 1973 at 1987.",
  "'Kumusta' at hindi 'Kamusta', ang kumusta ay nagmula sa salitang Espanyol na 'Como Estas' na ang ibig sabiihin sa Ingles ay 'How are you?'"
];

export const PREBUILT_QUIZ_UUIDS: Record<string, string> = {
  'level-1': '00000000-0000-4000-8000-000000000001',
  'level-2': '00000000-0000-4000-8000-000000000002',
  'level-3': '00000000-0000-4000-8000-000000000003',
};

export const UUID_TO_PREBUILT_ID: Record<string, string> = {
  '00000000-0000-4000-8000-000000000001': 'level-1',
  '00000000-0000-4000-8000-000000000002': 'level-2',
  '00000000-0000-4000-8000-000000000003': 'level-3',
};

export interface PrebuiltQuizCard {
  id: string;
  question_type: 'multiple_choice' | 'fill_blank' | 'sentence_scramble';
  question_text: string;
  options?: string[];
  correct_answer?: number | string;
  pattern_clue?: string;
  sentence_prompt?: string;
  scrambled_words?: string[];
  correct_sentence?: string;
  points: number;
}

export interface PrebuiltQuiz {
  id: string;
  uuid: string;
  level_number: number;
  title: string;
  subtitle: string;
  description: string;
  points_per_item: number;
  total_points: number;
  time_limit_seconds: number;
  cards: PrebuiltQuizCard[];
}

export const PREBUILT_QUIZZES: PrebuiltQuiz[] = [
  {
    id: "level-1",
    uuid: "00000000-0000-4000-8000-000000000001",
    level_number: 1,
    title: "ANTAS 1 – TALASALITAAN",
    subtitle: "Multiple Choice",
    description: "15 katanungan (15 segundo bawat aytem, 1 puntos bawat tama).",
    points_per_item: 1,
    total_points: 15,
    time_limit_seconds: 15,
    cards: [
      {
        id: "q_1_1",
        question_type: "multiple_choice",
        question_text: "Ang mga sumusunod ay halimbawa ng balbal na salita, maliban sa?",
        options: ["Yosi", "Bagets", "Gurang", "Tahanan"],
        correct_answer: 3,
        points: 1
      },
      {
        id: "q_1_2",
        question_type: "multiple_choice",
        question_text: "Pagkatapos kumain, sisibat na ako. Ano ang kahulugan ng salitang nakahilig (sisibat)?",
        options: ["Matutulog", "Maliligo", "Aalis", "Maghuhugas"],
        correct_answer: 2,
        points: 1
      },
      {
        id: "q_1_3",
        question_type: "multiple_choice",
        question_text: "Ano ang konotatibong kahulugan ng salitang hawak sa leeg?",
        options: ["Inaabuso ng pisikal", "Sobrang pagod", "Makati ang leeg", "Sunud-sunuran"],
        correct_answer: 3,
        points: 1
      },
      {
        id: "q_1_4",
        question_type: "multiple_choice",
        question_text: "Ano ang denotatibong kahulugan ng salitang araw?",
        options: ["Sentro ng solar system", "Liwanag", "Bagong pag-asa", "Pagsisimula ng umaga"],
        correct_answer: 0,
        points: 1
      },
      {
        id: "q_1_5",
        question_type: "multiple_choice",
        question_text: "Umupo siya sa mesa na nakatunganga sa pagkain sa kaniyang pinggan. Ano ang kahulugan ng salitang nakahilig (nakatunganga)?",
        options: ["Nakatawa", "Nakasimangot", "Nakatulala", "Nakatulog"],
        correct_answer: 2,
        points: 1
      },
      {
        id: "q_1_6",
        question_type: "multiple_choice",
        question_text: "Isang duwag ang tingin ni Ali sa kaniyang ama, dahil hindi pumalag sa kapitbahay. Ano ang kahulugan ng salitang nakahilig (duwag)?",
        options: ["Kulang sa tapang", "Mapangahas", "Mapagkumbaba", "Palakaibigan"],
        correct_answer: 0,
        points: 1
      },
      {
        id: "q_1_7",
        question_type: "multiple_choice",
        question_text: "Agad na naligo si Neri, sapagkat maligamgam at nakakapagpasigla ang dagat. Ano ang kahulugan ng salitang nakahilig (maligamgam)?",
        options: ["Maginaw", "Mainit-init", "Kumukulo", "Maalat"],
        correct_answer: 1,
        points: 1
      },
      {
        id: "q_1_8",
        question_type: "multiple_choice",
        question_text: "Ano ang kasalungat ng salitang mapanghi?",
        options: ["Malansa", "Amoy-ihi", "Presko", "Mabango"],
        correct_answer: 3,
        points: 1
      },
      {
        id: "q_1_9",
        question_type: "multiple_choice",
        question_text: "Ang tindahan ay bukas ________ siyam hanggang anim ng gabi.",
        options: ["Sa", "Mula", "Sa pamamagitan ng", "Sa pagitan ng"],
        correct_answer: 1,
        points: 1
      },
      {
        id: "q_1_10",
        question_type: "multiple_choice",
        question_text: "Mas gusto ni Rebecca ang gatas _________ kape.",
        options: ["Laban sa", "Kaysa", "Higit sa", "Nang"],
        correct_answer: 1,
        points: 1
      },
      {
        id: "q_1_11",
        question_type: "multiple_choice",
        question_text: "Umalis ako sa bahay ______ maaga.",
        options: ["Mula", "Nang", "Ng", "Sa"],
        correct_answer: 1,
        points: 1
      },
      {
        id: "q_1_12",
        question_type: "multiple_choice",
        question_text: "Ano ang konotatibong kahulugan ng salitang luha ng buwaya?",
        options: ["Pakitang tao", "Madaling maawa", "Madaling umiyak", "Umiiyak na hayop"],
        correct_answer: 0,
        points: 1
      },
      {
        id: "q_1_13",
        question_type: "multiple_choice",
        question_text: "Ano ang konotatibong kahulugan ng salitang tinik sa lalamunan?",
        options: ["Kahiya-hiyang tanggapin", "Hindi marunong magpatawad", "Masakit ang lalamunan", "Hadlang sa layunin"],
        correct_answer: 3,
        points: 1
      },
      {
        id: "q_1_14",
        question_type: "multiple_choice",
        question_text: "Alin sa mga sumusunod ang halimbawa ng salitang kolokyal?",
        options: ["Lespu", "Sinta", "Bakya", "Musta"],
        correct_answer: 3,
        points: 1
      },
      {
        id: "q_1_15",
        question_type: "multiple_choice",
        question_text: "Alin sa mga sumusunod ang halimbawa ng salitang lalawiganin?",
        options: ["American boy", "Pumapapel", "Pagmamahal", "Meron"],
        correct_answer: 0,
        points: 1
      }
    ]
  },
  {
    id: "level-2",
    uuid: "00000000-0000-4000-8000-000000000002",
    level_number: 2,
    title: "ANTAS 2 – PAGPUPUNO NG PATLANG",
    subtitle: "Fill in the Blanks",
    description: "10 katanungan (30 segundo bawat aytem, 2 puntos bawat tama).",
    points_per_item: 2,
    total_points: 20,
    time_limit_seconds: 30,
    cards: [
      {
        id: "q_2_1",
        question_type: "fill_blank",
        question_text: "_____________ ang bata sa kaniyang mga magulang nang makalimutan siyang pasalubungan.",
        pattern_clue: "_ _ G T A _ _ O",
        correct_answer: "NAGTAMPO",
        points: 2
      },
      {
        id: "q_2_2",
        question_type: "fill_blank",
        question_text: "Isang araw nabalitaan ni Ana mula sa kaniyang mga kaklase ang ________________ sa scholarship program sa kolehiyo na ibinibigay sa mga magsisipagtapos.",
        pattern_clue: "_ _ N _ K O _",
        correct_answer: "TUNGKOL",
        points: 2
      },
      {
        id: "q_2_3",
        question_type: "fill_blank",
        question_text: "May mga pinipiling umupo sa unahan __________________ ang iba naman ay kampante sa pag-upo sa likuran.",
        pattern_clue: "S _ _ A N _ A _ A",
        correct_answer: "SAMANTALA",
        points: 2
      },
      {
        id: "q_2_4",
        question_type: "fill_blank",
        question_text: "Gumawa si Magbabaya ng pitong pigura ng tao na kawangis niya, at ibiniin kaay Dadanhayan aanng anim.",
        pattern_clue: "_ A _ U _ H A",
        correct_answer: "KAMUKHA",
        points: 2
      },
      {
        id: "q_2_5",
        question_type: "fill_blank",
        question_text: "Bago umalis ang ina, inihele niya ang kaniyang mga anak at sinabihan ang kaniyang asawa na bantayan sila.",
        pattern_clue: "_ I N _ T U _ _ G",
        correct_answer: "PINATULOG",
        points: 2
      },
      {
        id: "q_2_6",
        question_type: "fill_blank",
        question_text: "Sa paglipas ng mga araw ay humupa na ang baha.",
        pattern_clue: "_ A W _ _ A",
        correct_answer: "NAWALA",
        points: 2
      },
      {
        id: "q_2_7",
        question_type: "fill_blank",
        question_text: "Ayaw ni Potri Intantiyaya na magpakasal, ___________ siya’y bata pa.",
        pattern_clue: "_ A L _ _ H _ S A",
        correct_answer: "PALIBHASA",
        points: 2
      },
      {
        id: "q_2_8",
        question_type: "fill_blank",
        question_text: "_____________ mahirap ang kanilang buhay, nagsusumikap si Edmundo na makapag aral.",
        pattern_clue: "D _ _ A P _ _ ‘ T",
        correct_answer: "DATAPWA'T",
        points: 2
      },
      {
        id: "q_2_9",
        question_type: "fill_blank",
        question_text: "Gumising siya nang maaga at naglalako ng pandesal ________ matustusan ang kaniyang pambaon sa eskuwela.",
        pattern_clue: "_ _ A N _",
        correct_answer: "UPANG",
        points: 2
      },
      {
        id: "q_2_10",
        question_type: "fill_blank",
        question_text: "Tayo ang gumawa ng sari nating daan ________ nasa sa ating mga kamay nakasalalay ang ikatatagumpay ng ating buhay.",
        pattern_clue: "S _ P _ _ _ A T",
        correct_answer: "SAPAGKAT",
        points: 2
      }
    ]
  },
  {
    id: "level-3",
    uuid: "00000000-0000-4000-8000-000000000003",
    level_number: 3,
    title: "ANTAS 3 – PAGBUO NG PANGUNGUSAP",
    subtitle: "Sentence Unscramble",
    description: "5 katanungan (1 minuto bawat aytem, 3 puntos bawat tama).",
    points_per_item: 3,
    total_points: 15,
    time_limit_seconds: 60,
    cards: [
      {
        id: "q_3_1",
        question_type: "sentence_scramble",
        question_text: "Ayusin ang mga sumusunod na salita upang makabuo ng wastong pangungusap.",
        sentence_prompt: "nagkagalit / hanggang sa / Bulan / nagkaroon / sama / ng / si / ng / loob / ang / mag-asawa",
        scrambled_words: ["nagkagalit", "hanggang sa", "Bulan", "nagkaroon", "sama", "ng", "si", "ng", "loob", "ang", "mag-asawa"],
        correct_sentence: "Nagkaroon ng sama ng loob si Bulan hanggang sa nagkagalit ang mag-asawa.",
        points: 3
      },
      {
        id: "q_3_2",
        question_type: "sentence_scramble",
        question_text: "Ayusin ang mga sumusunod na salita upang makabuo ng wastong pangungusap.",
        sentence_prompt: "kalan / siya / pagdating / sa / ng / dali-dali / tabi / basang-basa / nahiga / bahay / kaya / ng",
        scrambled_words: ["kalan", "siya", "pagdating", "sa", "ng", "dali-dali", "tabi", "basang-basa", "nahiga", "bahay", "kaya", "ng"],
        correct_sentence: "Basang-basa siya pagdating ng bahay kaya dali-dali siyang nahiga sa tabi ng kalan.",
        points: 3
      },
      {
        id: "q_3_3",
        question_type: "sentence_scramble",
        question_text: "Ayusin ang mga sumusunod na salita upang makabuo ng wastong pangungusap.",
        sentence_prompt: "gitna / dagat / sa / kaguluhan / ng / ang / kanastro / naitapon / sa / maging / pinaglalagyan / imahen / ay / na / ng",
        scrambled_words: ["gitna", "dagat", "sa", "kaguluhan", "ng", "ang", "kanastro", "naitapon", "sa", "maging", "pinaglalagyan", "imahen", "ay", "na", "ng"],
        correct_sentence: "Sa gitna ng kaguluhan, maging ang kanastro na pinaglalagyan ng imahen ay naitapon sa dagat.",
        points: 3
      },
      {
        id: "q_3_4",
        question_type: "sentence_scramble",
        question_text: "Ayusin ang mga sumusunod na salita upang makabuo ng wastong pangungusap.",
        sentence_prompt: "Pinkaw / Intsik / kawali / ang / ng / na / ni / sa / ulo / ng / pagkabasag / inihambalos",
        scrambled_words: ["Pinkaw", "Intsik", "kawali", "ang", "ng", "na", "ni", "sa", "ulo", "ng", "pagkabasag", "inihambalos"],
        correct_sentence: "Ang pagkabasag ng kawali na inihambalos ni Pinkaw sa ulo ng Intsik.",
        points: 3
      },
      {
        id: "q_3_5",
        question_type: "sentence_scramble",
        question_text: "Ayusin ang mga sumusunod na salita upang makabuo ng wastong pangungusap.",
        sentence_prompt: "bagyo / bukid / karaniwang / pagkaraan / lumiligid / mga / lumalabas / Mariang Makiling / ng / at / si / sa",
        scrambled_words: ["bagyo", "bukid", "karaniwang", "pagkaraan", "lumiligid", "mga", "lumalabas", "Mariang Makiling", "ng", "at", "si", "sa"],
        correct_sentence: "Karaniwang lumalabas si Mariang Makiling pagkaraan ng bagyo at lumiligid sa mga bukid.",
        points: 3
      }
    ]
  }
];

export function getPrebuiltQuizById(idOrUuid?: string | null): PrebuiltQuiz | undefined {
  if (!idOrUuid) return undefined;
  const normalized = idOrUuid.toLowerCase();
  return PREBUILT_QUIZZES.find(
    q => q.id === normalized || q.uuid === normalized || PREBUILT_QUIZ_UUIDS[normalized] === normalized
  );
}

export function getPrebuiltQuizTitle(idOrUuid?: string | null): string | null {
  if (!idOrUuid) return null;
  const quiz = getPrebuiltQuizById(idOrUuid);
  return quiz ? quiz.title : null;
}
