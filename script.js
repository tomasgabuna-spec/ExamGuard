const KEY="EXAMGUARD_DATA_V1";
const defaultData={teacherPin:"1234",classes:[],questions:[],exams:[],attempts:[],results:[]};
let db=loadDB();
let currentExam=null,currentAttempt=null,currentIndex=0,timerHandle=null;

function loadDB(){try{return {...defaultData,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch(e){return structuredClone(defaultData)}}
function saveDB(){localStorage.setItem(KEY,JSON.stringify(db))}
function uid(prefix){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function code(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function $(id){return document.getElementById(id)}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function showView(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(id).classList.add("active");window.scrollTo(0,0)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

document.addEventListener("click",e=>{
  const target=e.target.closest("[data-view]");
  if(target) showView(target.dataset.view);
});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.tab).classList.add("active");
  if(b.dataset.tab==="monitorTab") renderMonitor();
  if(b.dataset.tab==="resultsTab") renderResults();
}));

$("teacherLoginBtn").onclick=()=>{
  if($("teacherPin").value===db.teacherPin){showView("teacherView");renderTeacher();$("teacherLoginMsg").textContent=""}
  else $("teacherLoginMsg").textContent="Incorrect teacher PIN.";
};
$("teacherLogoutBtn").onclick=()=>showView("homeView");
$("resetDemoBtn").onclick=()=>{
  if(confirm("Reset all EXAMGUARD demo data?")){db=structuredClone(defaultData);seed();saveDB();renderTeacher();toast("Demo data reset.");}
};

function seed(){
  if(db.classes.length||db.questions.length||db.exams.length)return;
  const c={id:uid("CLS"),name:"Grade 11 Mathematics"};
  db.classes=[c];
  db.questions=[
    {id:uid("Q"),classId:c.id,text:"What is the next term in 2, 4, 6, 8, ...?",choices:{A:"9",B:"10",C:"11",D:"12"},correct:"B",points:1},
    {id:uid("Q"),classId:c.id,text:"If f(x)=2x+3, what is f(4)?",choices:{A:"7",B:"8",C:"11",D:"12"},correct:"C",points:1},
    {id:uid("Q"),classId:c.id,text:"Which is a continuous variable?",choices:{A:"Number of siblings",B:"Number of students",C:"Travel time",D:"Number of books"},correct:"C",points:1}
  ];
  const ex={id:uid("EX"),title:"Grade 11 Mathematics Demo Exam",classId:c.id,duration:15,randomize:true,status:"OPEN",code:code(),createdAt:new Date().toISOString()};
  db.exams=[ex];
}
seed();saveDB();

function renderTeacher(){
  $("statClasses").textContent=db.classes.length;
  $("statQuestions").textContent=db.questions.length;
  $("statExams").textContent=db.exams.length;
  $("statAttempts").textContent=db.attempts.length;
  $("classList").innerHTML=db.classes.length?db.classes.map(c=>`<div class="list-item"><b>${escapeHtml(c.name)}</b><small>${db.questions.filter(q=>q.classId===c.id).length} questions</small></div>`).join(""):"<p class='muted'>No classes yet.</p>";
  const opts=db.classes.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  $("questionClass").innerHTML=opts;$("examClass").innerHTML=opts;
  $("examList").innerHTML=db.exams.length?db.exams.map(e=>`<div class="list-item"><b>${escapeHtml(e.title)}</b><small>Code: <b>${e.code}</b> • ${e.duration} min • ${e.status}</small></div>`).join(""):"<p class='muted'>No exams yet.</p>";
  $("monitorExam").innerHTML=db.exams.map(e=>`<option value="${e.id}">${escapeHtml(e.title)} (${e.code})</option>`).join("");
  renderMonitor();
  renderResults();
}
$("addClassBtn").onclick=()=>{
  const name=$("className").value.trim();if(!name)return toast("Enter a class name.");
  db.classes.push({id:uid("CLS"),name});saveDB();$("className").value="";renderTeacher();toast("Class created.");
};
$("addQuestionBtn").onclick=()=>{
  const text=$("questionText").value.trim(), classId=$("questionClass").value;
  if(!text||!classId||!$("choiceA").value.trim()||!$("choiceB").value.trim()||!$("choiceC").value.trim()||!$("choiceD").value.trim())return toast("Complete the question and four choices.");
  db.questions.push({id:uid("Q"),classId,text,choices:{A:$("choiceA").value.trim(),B:$("choiceB").value.trim(),C:$("choiceC").value.trim(),D:$("choiceD").value.trim()},correct:$("correctAnswer").value,points:Number($("questionPoints").value)||1});
  ["questionText","choiceA","choiceB","choiceC","choiceD"].forEach(id=>$(id).value="");saveDB();renderTeacher();toast("Question added.");
};
$("createExamBtn").onclick=()=>{
  const title=$("examTitle").value.trim(),classId=$("examClass").value,duration=Math.max(1,Number($("examDuration").value)||30);
  const count=db.questions.filter(q=>q.classId===classId).length;
  if(!title||!classId)return toast("Enter an exam title and class.");
  if(!count)return toast("Add at least one question to this class first.");
  db.exams.push({id:uid("EX"),title,classId,duration,randomize:$("randomizeQuestions").checked,status:"OPEN",code:code(),createdAt:new Date().toISOString()});
  saveDB();$("examTitle").value="";renderTeacher();toast("Exam created.");
};

function renderMonitor(){
  const examId=$("monitorExam").value||db.exams[0]?.id;
  $("monitorExam").value=examId||"";
  const attempts=db.attempts.filter(a=>a.examId===examId);
  $("monitorTable").innerHTML=`<table class="data-table"><thead><tr><th>Student</th><th>ID</th><th>Status</th><th>Progress</th><th>Score</th></tr></thead><tbody>${
    attempts.length?attempts.map(a=>`<tr><td>${escapeHtml(a.studentName)}</td><td>${escapeHtml(a.studentId)}</td><td><span class="status ${a.status}">${a.status}</span></td><td>${a.answers.filter(x=>x).length}/${a.questionIds.length}</td><td>${a.status==="SUBMITTED"?a.score:"—"}</td></tr>`).join(""):"<tr><td colspan='5' class='muted'>No students have joined this exam yet.</td></tr>"
  }</tbody></table>`;
}
$("monitorExam").onchange=renderMonitor;

function renderResults(){
  $("resultsTable").innerHTML=`<table class="data-table"><thead><tr><th>Exam</th><th>Student</th><th>ID</th><th>Score</th><th>Percent</th><th>Submitted</th></tr></thead><tbody>${
    db.results.length?db.results.map(r=>`<tr><td>${escapeHtml(r.examTitle)}</td><td>${escapeHtml(r.studentName)}</td><td>${escapeHtml(r.studentId)}</td><td>${r.score}/${r.total}</td><td>${r.percent}%</td><td>${new Date(r.submittedAt).toLocaleString()}</td></tr>`).join(""):"<tr><td colspan='6' class='muted'>No submitted results yet.</td></tr>"
  }</tbody></table>`;
}
$("downloadCsvBtn").onclick=()=>{
  if(!db.results.length)return toast("No results to download.");
  const rows=[["Exam","Student","Student ID","Score","Total","Percent","Submitted"]];
  db.results.forEach(r=>rows.push([r.examTitle,r.studentName,r.studentId,r.score,r.total,r.percent,r.submittedAt]));
  const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="EXAMGUARD_Results.csv";a.click();URL.revokeObjectURL(a.href);
};

$("joinExamBtn").onclick=()=>{
  const codeVal=$("joinCode").value.trim().toUpperCase(),name=$("studentName").value.trim(),sid=$("studentId").value.trim();
  const exam=db.exams.find(e=>e.code===codeVal);
  if(!exam)return $("joinMsg").textContent="Exam code not found.";
  if(exam.status!=="OPEN")return $("joinMsg").textContent="This exam is not open.";
  if(!name||!sid)return $("joinMsg").textContent="Enter your name and student ID.";
  const qs=db.questions.filter(q=>q.classId===exam.classId);
  currentExam=exam;
  const ordered=exam.randomize?shuffle(qs):qs;
  currentAttempt={id:uid("ATT"),examId:exam.id,studentName:name,studentId:sid,status:"ANSWERING",questionIds:ordered.map(q=>q.id),answers:Array(ordered.length).fill(null),startedAt:new Date().toISOString(),score:0};
  db.attempts.push(currentAttempt);saveDB();
  currentIndex=0;$("studentExamTitle").textContent=exam.title;$("studentIdentity").textContent=`${name} • ${sid}`;
  showView("studentExamView");startTimer(exam.duration*60);renderQuestion();
};

function startTimer(seconds){
  clearInterval(timerHandle);let end=Date.now()+seconds*1000;
  const tick=()=>{let left=Math.max(0,Math.ceil((end-Date.now())/1000));$("timer").textContent=`${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`;if(left<=0){clearInterval(timerHandle);submitExam(true)}};
  tick();timerHandle=setInterval(tick,1000);
}
function renderQuestion(){
  const qid=currentAttempt.questionIds[currentIndex],q=db.questions.find(x=>x.id===qid);
  const selected=currentAttempt.answers[currentIndex];
  $("progressBar").style.width=`${((currentIndex+1)/currentAttempt.questionIds.length)*100}%`;
  $("questionCounter").textContent=`Question ${currentIndex+1} of ${currentAttempt.questionIds.length}`;
  $("questionArea").innerHTML=`<div class="eyebrow">QUESTION ${currentIndex+1}</div><div class="question-title">${escapeHtml(q.text)}</div><div class="choices">${
    Object.entries(q.choices).map(([k,v])=>`<label class="choice ${selected===k?"selected":""}"><input type="radio" name="answer" value="${k}" ${selected===k?"checked":""}> <span><b>${k}.</b> ${escapeHtml(v)}</span></label>`).join("")
  }</div>`;
  document.querySelectorAll('input[name="answer"]').forEach(r=>r.onchange=()=>{currentAttempt.answers[currentIndex]=r.value;saveDB();renderQuestion()});
  $("prevBtn").disabled=currentIndex===0;
  $("nextBtn").classList.toggle("hidden",currentIndex===currentAttempt.questionIds.length-1);
  $("submitExamBtn").classList.toggle("hidden",currentIndex!==currentAttempt.questionIds.length-1);
}
$("prevBtn").onclick=()=>{if(currentIndex>0){currentIndex--;renderQuestion()}};
$("nextBtn").onclick=()=>{if(currentIndex<currentAttempt.questionIds.length-1){currentIndex++;renderQuestion()}};
$("submitExamBtn").onclick=()=>submitExam(false);

function submitExam(auto){
  if(!currentAttempt)return;
  if(!auto&&!confirm("Submit your examination now?"))return;
  clearInterval(timerHandle);
  let score=0,total=0;
  currentAttempt.questionIds.forEach((id,i)=>{const q=db.questions.find(x=>x.id===id);total+=q.points;if(currentAttempt.answers[i]===q.correct)score+=q.points});
  currentAttempt.score=score;currentAttempt.status="SUBMITTED";currentAttempt.submittedAt=new Date().toISOString();
  const result={examId:currentExam.id,examTitle:currentExam.title,studentName:currentAttempt.studentName,studentId:currentAttempt.studentId,score,total,percent:Math.round(score/total*100),submittedAt:currentAttempt.submittedAt};
  db.results.push(result);saveDB();
  $("studentResultText").textContent=`${currentAttempt.studentName}, your score is ${score}/${total} (${result.percent}%).`;
  currentAttempt=null;currentExam=null;showView("studentResultView");
}

renderTeacher();
