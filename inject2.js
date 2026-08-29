const fs = require('fs');
let code = fs.readFileSync('src/components/QuizPlayer.tsx', 'utf-8');

const finishQuizAnchor = 'const finishQuiz = async () => {\\r\\n    setIsFinished(true)\\r\\n    setIsSaving(true)';
const finishQuizAnchorUnix = 'const finishQuiz = async () => {\\n    setIsFinished(true)\\n    setIsSaving(true)';

const finishReplacement = `const finishQuiz = async () => {
    setIsFinished(true)
    setIsSaving(true)
    if (quiz.is_practice) {
      if (typeof window !== 'undefined') {
         // simple pass if score > 0 or not eliminated
         localStorage.setItem(\`completed_\${quiz.id}\`, 'true');
      }
      setIsSaving(false)
      return;
    }`;

code = code.replace(finishQuizAnchor, finishReplacement);
code = code.replace(finishQuizAnchorUnix, finishReplacement);

const linkAnchor = '<Link href={`/student/classrooms/${quiz.classroom_id}`} className="mt-8 text-slate-500 hover:text-white transition-colors text-sm font-medium">';
code = code.replace(linkAnchor, `<Link href={quiz.is_practice ? '/student/practice' : \`/student/classrooms/\${quiz.classroom_id}\`} className="mt-8 text-slate-500 hover:text-white transition-colors text-sm font-medium">`);

code = code.replace('Back to Classroom', '{quiz.is_practice ? "Back to Practice Hub" : "Back to Classroom"}');
code = code.replace('Back to Classroom', '{quiz.is_practice ? "Back to Practice Hub" : "Back to Classroom"}');

code = code.replace(
  /<Link href=\{\`\/student\/quiz\/\$\{quiz\.id\}\/results\`\}[\s\S]*?View History[\s\S]*?<\/Link>/g, 
  `{quiz.is_practice ? (
                   <div className="flex-1 py-4 bg-white/5 text-white/50 font-medium rounded-2xl text-center">
                     Practice Record
                   </div>
                 ) : (
                   <Link href={\`/student/quiz/\${quiz.id}/results\`} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-colors">
                     View History
                   </Link>
                 )}`
);

code = code.replace(
  /<Link href=\{\`\/student\/classrooms\/\$\{quiz\.classroom_id\}\`\}[\s\S]*?\{quiz\.is_practice \? "Back to Practice Hub" : "Back to Classroom"\}[\s\S]*?<\/Link>/g,
  `<Link href={quiz.is_practice ? '/student/practice' : \`/student/classrooms/\${quiz.classroom_id}\`} className="flex-1 py-4 bg-brand-primary hover:bg-blue-500 text-white font-medium rounded-2xl transition-colors shadow-lg shadow-blue-500/20 text-center">
                   {quiz.is_practice ? "Palarong Handa" : "Back to Classroom"}
                 </Link>`
);

fs.writeFileSync('src/components/QuizPlayer.tsx', code);
console.log('Done');
