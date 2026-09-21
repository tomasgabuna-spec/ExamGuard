/* =========================================================
   EXAMGUARD
   Offline Secure Examination and Monitoring System
   CodePen Frontend Prototype
   ========================================================= */

const STORAGE_KEY = "EXAMGUARD_DATABASE_V2";

const defaultDatabase = {
  teacherPin: "1234",
  classes: [],
  questions: [],
  exams: [],
  attempts: [],
  results: []
};

let db = loadDatabase();

let currentExam = null;
let currentAttempt = null;
let currentQuestionIndex = 0;
let timerInterval = null;


/* =========================================================
   DATABASE
   ========================================================= */

function loadDatabase() {

  try {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(defaultDatabase);
    }

    return {
      ...structuredClone(defaultDatabase),
      ...JSON.parse(saved)
    };

  } catch (error) {

    return structuredClone(defaultDatabase);

  }

}


function saveDatabase() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(db)
  );

}


function generateID(prefix) {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 7)
  );

}


function generateExamCode() {

  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

}


function shuffle(array) {

  return [...array].sort(
    () => Math.random() - 0.5
  );

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   INITIAL DEMO DATA
   ========================================================= */

function createDemoData() {

  if (
    db.classes.length > 0 ||
    db.questions.length > 0 ||
    db.exams.length > 0
  ) {
    return;
  }


  const classID = generateID("CLASS");


  db.classes.push({

    id: classID,

    name:
      "Grade 11 Mathematics",

    createdAt:
      new Date().toISOString()

  });


  db.questions.push(

    {
      id: generateID("Q"),

      classID,

      text:
        "What is the next term in the sequence 2, 4, 6, 8, ...?",

      choices: {
        A: "9",
        B: "10",
        C: "11",
        D: "12"
      },

      correct: "B",

      points: 1

    },


    {
      id: generateID("Q"),

      classID,

      text:
        "If f(x) = 2x + 3, what is f(4)?",

      choices: {
        A: "7",
        B: "8",
        C: "11",
        D: "12"
      },

      correct: "C",

      points: 1

    },


    {
      id: generateID("Q"),

      classID,

      text:
        "Which is an example of a continuous variable?",

      choices: {
        A: "Number of siblings",
        B: "Number of students",
        C: "Travel time",
        D: "Number of books"

      },

      correct: "C",

      points: 1

    },


    {
      id: generateID("Q"),

      classID,

      text:
        "Which of the following represents a linear function?",

      choices: {
        A: "y = x²",
        B: "y = 2x + 5",
        C: "y = 1/x",
        D: "y = √x"

      },

      correct: "B",

      points: 1

    }

  );


  const examID = generateID("EXAM");


  db.exams.push({

    id: examID,

    title:
      "Grade 11 Mathematics Demo Examination",

    classID,

    duration: 15,

    randomize: true,

    status: "OPEN",

    code: generateExamCode(),

    createdAt:
      new Date().toISOString()

  });


  saveDatabase();

}


createDemoData();


/* =========================================================
   BASIC UI
   ========================================================= */

function showScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(screen =>
      screen.classList.remove("active")
    );

  document
    .getElementById(id)
    .classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function showHome() {

  clearInterval(timerInterval);

  showScreen("homeScreen");

}


function showTeacherLogin() {

  showScreen("teacherLoginScreen");

}


function showStudentJoin() {

  showScreen("studentJoinScreen");

}


function showToast(message) {

  const toast =
    document.getElementById("toast");

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 2500);

}


/* =========================================================
   TEACHER LOGIN
   ========================================================= */

function teacherLogin() {

  const pin =
    document
      .getElementById("teacherPin")
      .value
      .trim();


  if (pin === db.teacherPin) {

    document.getElementById(
      "loginMessage"
    ).textContent = "";

    showScreen("teacherDashboard");

    renderTeacherDashboard();

    showToast(
      "Teacher login successful."
    );

  } else {

    document.getElementById(
      "loginMessage"
    ).textContent =
      "Incorrect teacher PIN.";

  }

}


function teacherLogout() {

  showHome();

  showToast(
    "Teacher session ended."
  );

}


/* =========================================================
   TEACHER TABS
   ========================================================= */

function openTeacherTab(
  tabID,
  button
) {

  document
    .querySelectorAll(".teacher-tab")
    .forEach(tab =>
      tab.classList.remove("active")
    );


  document
    .querySelectorAll(".dash-tab")
    .forEach(tab =>
      tab.classList.remove("active")
    );


  document
    .getElementById(tabID)
    .classList.add("active");


  if (button) {

    button.classList.add("active");

  }


  if (tabID === "monitorTab") {

    populateMonitorExamList();

    renderMonitor();

  }


  if (tabID === "resultsTab") {

    renderResults();

  }

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderTeacherDashboard() {

  document.getElementById(
    "classCount"
  ).textContent =
    db.classes.length;


  document.getElementById(
    "questionCount"
  ).textContent =
    db.questions.length;


  document.getElementById(
    "examCount"
  ).textContent =
    db.exams.length;


  document.getElementById(
    "submissionCount"
  ).textContent =
    db.results.length;


  populateClassSelects();

  renderClasses();

  renderQuestions();

  renderExams();

  populateMonitorExamList();

  renderMonitor();

  renderResults();

  renderActiveExam();

}


/* =========================================================
   CLASS MANAGEMENT
   ========================================================= */

function createClass() {

  const input =
    document.getElementById(
      "newClassName"
    );

  const name =
    input.value.trim();


  if (!name) {

    showToast(
      "Please enter a class name."
    );

    return;

  }


  db.classes.push({

    id:
      generateID("CLASS"),

    name,

    createdAt:
      new Date().toISOString()

  });


  saveDatabase();

  input.value = "";

  renderTeacherDashboard();

  showToast(
    "Class created successfully."
  );

}


function renderClasses() {

  const container =
    document.getElementById(
      "classList"
    );


  if (!db.classes.length) {

    container.innerHTML =
      `<div class="empty-state">
        No classes created yet.
      </div>`;

    return;

  }


  container.innerHTML =
    db.classes.map(cls => {

      const questionCount =
        db.questions.filter(
          q =>
            q.classID === cls.id
        ).length;


      const examCount =
        db.exams.filter(
          exam =>
            exam.classID === cls.id
        ).length;


      return `

        <div class="item-card">

          <h4>
            ${escapeHTML(cls.name)}
          </h4>

          <p>
            ${questionCount} questions
            •
            ${examCount} exams
          </p>

        </div>

      `;

    }).join("");

}


/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function populateClassSelects() {

  const options =
    db.classes.length

      ? db.classes.map(cls =>

          `<option value="${cls.id}">
            ${escapeHTML(cls.name)}
          </option>`

        ).join("")

      : `<option value="">
          No classes available
        </option>`;


  document.getElementById(
    "questionClass"
  ).innerHTML = options;


  document.getElementById(
    "examClass"
  ).innerHTML = options;

}


/* =========================================================
   QUESTION BANK
   ========================================================= */

function addQuestion() {

  const classID =
    document.getElementById(
      "questionClass"
    ).value;


  const questionText =
    document.getElementById(
      "questionText"
    ).value.trim();


  const A =
    document.getElementById(
      "choiceA"
    ).value.trim();


  const B =
    document.getElementById(
      "choiceB"
    ).value.trim();


  const C =
    document.getElementById(
      "choiceC"
    ).value.trim();


  const D =
    document.getElementById(
      "choiceD"
    ).value.trim();


  const correct =
    document.getElementById(
      "correctAnswer"
    ).value;


  const points =
    Number(
      document.getElementById(
        "questionPoints"
      ).value
    ) || 1;


  if (
    !classID ||
    !questionText ||
    !A ||
    !B ||
    !C ||
    !D
  ) {

    showToast(
      "Please complete the question and all choices."
    );

    return;

  }


  db.questions.push({

    id:
      generateID("Q"),

    classID,

    text:
      questionText,

    choices: {
      A,
      B,
      C,
      D
    },

    correct,

    points

  });


  saveDatabase();


  document.getElementById(
    "questionText"
  ).value = "";


  document.getElementById(
    "choiceA"
  ).value = "";


  document.getElementById(
    "choiceB"
  ).value = "";


  document.getElementById(
    "choiceC"
  ).value = "";


  document.getElementById(
    "choiceD"
  ).value = "";


  renderTeacherDashboard();


  showToast(
    "Question added to the question bank."
  );

}


function renderQuestions() {

  const container =
    document.getElementById(
      "questionList"
    );


  if (!db.questions.length) {

    container.innerHTML =
      `<div class="empty-state">
        No questions added yet.
      </div>`;

    return;

  }


  container.innerHTML =
    db.questions.map(
      (q, index) => {

        const cls =
          db.classes.find(
            c =>
              c.id === q.classID
          );


        return `

          <div class="item-card">

            <h4>
              ${index + 1}.
              ${escapeHTML(q.text)}
            </h4>

            <p>
              A. ${escapeHTML(q.choices.A)}
            </p>

            <p>
              B. ${escapeHTML(q.choices.B)}
            </p>

            <p>
              C. ${escapeHTML(q.choices.C)}
            </p>

            <p>
              D. ${escapeHTML(q.choices.D)}
            </p>

            <p>
              <strong>
                Correct:
                ${q.correct}
              </strong>
              •
              ${q.points} point(s)
              •
              ${cls
                ? escapeHTML(cls.name)
                : "Unknown Class"}
            </p>

          </div>

        `;

      }
    ).join("");

}


/* =========================================================
   EXAM MANAGEMENT
   ========================================================= */

function createExam() {

  const title =
    document.getElementById(
      "examTitle"
    ).value.trim();


  const classID =
    document.getElementById(
      "examClass"
    ).value;


  const duration =
    Number(
      document.getElementById(
        "examDuration"
      ).value
    ) || 30;


  const randomize =
    document.getElementById(
      "randomizeExam"
    ).checked;


  if (!title || !classID) {

    showToast(
      "Enter an exam title and class."
    );

    return;

  }


  const questions =
    db.questions.filter(
      q =>
        q.classID === classID
    );


  if (!questions.length) {

    showToast(
      "Add questions to this class first."
    );

    return;

  }


  let examCode =
    generateExamCode();


  while (
    db.exams.some(
      exam =>
        exam.code === examCode
    )
  ) {

    examCode =
      generateExamCode();

  }


  db.exams.push({

    id:
      generateID("EXAM"),

    title,

    classID,

    duration,

    randomize,

    status:
      "OPEN",

    code:
      examCode,

    createdAt:
      new Date().toISOString()

  });


  saveDatabase();


  document.getElementById(
    "examTitle"
  ).value = "";


  renderTeacherDashboard();


  showToast(
    `Exam created. Code: ${examCode}`
  );

}


function renderExams() {

  const container =
    document.getElementById(
      "examList"
    );


  if (!db.exams.length) {

    container.innerHTML =
      `<div class="empty-state">
        No examinations created.
      </div>`;

    return;

  }


  container.innerHTML =
    db.exams.map(exam => {

      const cls =
        db.classes.find(
          c =>
            c.id === exam.classID
        );


      const questionCount =
        db.questions.filter(
          q =>
            q.classID === exam.classID
        ).length;


      return `

        <div class="item-card">

          <h4>
            ${escapeHTML(exam.title)}
          </h4>

          <p>
            ${cls
              ? escapeHTML(cls.name)
              : "Unknown class"}
          </p>

          <div class="exam-code">
            ${exam.code}
          </div>

          <div class="exam-meta">

            <span class="meta-pill">
              ⏱ ${exam.duration} minutes
            </span>

            <span class="meta-pill">
              📝 ${questionCount} questions
            </span>

            <span class="meta-pill">
              🔀
              ${exam.randomize
                ? "Randomized"
                : "Standard"}
            </span>

            <span class="meta-pill">
              ${exam.status}
            </span>

          </div>

          <div class="item-actions">

            <button
              class="mini-btn green"
              onclick="copyExamCode('${exam.code}')"
            >
              Copy Code
            </button>

            <button
              class="mini-btn"
              onclick="toggleExam('${exam.id}')"
            >
              ${
                exam.status === "OPEN"
                  ? "Close Exam"
                  : "Open Exam"
              }
            </button>

          </div>

        </div>

      `;

    }).join("");

}


function copyExamCode(code) {

  navigator.clipboard
    .writeText(code)
    .then(() => {

      showToast(
        `Exam code ${code} copied.`
      );

    });

}


function toggleExam(examID) {

  const exam =
    db.exams.find(
      e =>
        e.id === examID
    );


  if (!exam) return;


  exam.status =
    exam.status === "OPEN"
      ? "CLOSED"
      : "OPEN";


  saveDatabase();

  renderTeacherDashboard();

  showToast(
    `Exam ${exam.status.toLowerCase()}.`
  );

}


/* =========================================================
   ACTIVE EXAM
   ========================================================= */

function renderActiveExam() {

  const container =
    document.getElementById(
      "activeExamCard"
    );


  const activeExam =
    db.exams.find(
      exam =>
        exam.status === "OPEN"
    );


  if (!activeExam) {

    container.innerHTML =
      `<div class="empty-state">
        No active examination.
      </div>`;

    return;

  }


  const cls =
    db.classes.find(
      c =>
        c.id === activeExam.classID
    );


  const participants =
    db.attempts.filter(
      attempt =>
        attempt.examID === activeExam.id
    );


  container.innerHTML = `

    <div>

      <p>
        ${escapeHTML(activeExam.title)}
      </p>

      <div class="exam-code">
        ${activeExam.code}
      </div>

      <div class="exam-meta">

        <span class="meta-pill">
          Class:
          ${cls
            ? escapeHTML(cls.name)
            : "Unknown"}
        </span>

        <span class="meta-pill">
          Duration:
          ${activeExam.duration} min
        </span>

        <span class="meta-pill">
          Students:
          ${participants.length}
        </span>

      </div>

    </div>

  `;

}


/* =========================================================
   MONITORING
   ========================================================= */

function populateMonitorExamList() {

  const select =
    document.getElementById(
      "monitorExam"
    );


  if (!db.exams.length) {

    select.innerHTML =
      `<option value="">
        No exams
      </option>`;

    return;

  }


  select.innerHTML =
    db.exams.map(
      exam =>

        `<option value="${exam.id}">
          ${escapeHTML(exam.title)}
          (${exam.code})
        </option>`

    ).join("");

}


function renderMonitor() {

  const select =
    document.getElementById(
      "monitorExam"
    );


  const examID =
    select.value ||
    db.exams[0]?.id;


  if (!examID) {

    return;

  }


  select.value = examID;


  const attempts =
    db.attempts.filter(
      attempt =>
        attempt.examID === examID
    );


  let waiting = 0;
  let answering = 0;
  let interrupted = 0;
  let submitted = 0;
  let exited = 0;


  attempts.forEach(
    attempt => {

      if (
        attempt.status ===
        "WAITING"
      ) waiting++;

      if (
        attempt.status ===
        "ANSWERING"
      ) answering++;

      if (
        attempt.status ===
        "INTERRUPTED"
      ) interrupted++;

      if (
        attempt.status ===
        "SUBMITTED"
      ) submitted++;

      if (
        attempt.status ===
        "EXITED"
      ) exited++;

    }
  );


  document.getElementById(
    "waitingCount"
  ).textContent = waiting;


  document.getElementById(
    "answeringCount"
  ).textContent = answering;


  document.getElementById(
    "interruptedCount"
  ).textContent = interrupted;


  document.getElementById(
    "submittedCount"
  ).textContent = submitted;


  document.getElementById(
    "exitedCount"
  ).textContent = exited;


  const body =
    document.getElementById(
      "monitorBody"
    );


  if (!attempts.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="6"
          style="text-align:center;color:#667085"
        >
          No students have joined this examination.
        </td>

      </tr>

    `;

    return;

  }


  body.innerHTML =
    attempts.map(
      attempt => {

        const answered =
          attempt.answers.filter(
            answer =>
              answer !== null
          ).length;


        const progress =
          Math.round(
            answered /
            attempt.questionIDs.length *
            100
          );


        return `

          <tr>

            <td>
              <strong>
                ${escapeHTML(
                  attempt.studentName
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(
                attempt.studentID
              )}
            </td>

            <td>

              <span
                class="status ${attempt.status}"
              >
                ${attempt.status}
              </span>

            </td>

            <td>
              ${answered}/
              ${attempt.questionIDs.length}
              (${progress}%)
            </td>

            <td>
              ${
                attempt.status ===
                "SUBMITTED"
                  ? attempt.score
                  : "—"
              }
            </td>

            <td>

              ${
                attempt.status ===
                "ANSWERING"

                ?

                `<button
                  class="mini-btn red"
                  onclick="terminateAttempt('${attempt.id}')"
                >
                  Terminate
                </button>`

                :

                "—"
              }

            </td>

          </tr>

        `;

      }
    ).join("");

}


function terminateAttempt(
  attemptID
) {

  const attempt =
    db.attempts.find(
      a =>
        a.id === attemptID
    );


  if (!attempt) return;


  if (
    !confirm(
      `Terminate ${attempt.studentName}'s examination?`
    )
  ) {

    return;

  }


  attempt.status =
    "EXITED";


  attempt.exitedAt =
    new Date().toISOString();


  saveDatabase();

  renderMonitor();

  showToast(
    "Student examination terminated."
  );

}


/* =========================================================
   STUDENT JOIN
   ========================================================= */

function joinExam() {

  const code =
    document
      .getElementById(
        "joinExamCode"
      )
      .value
      .trim()
      .toUpperCase();


  const studentName =
    document
      .getElementById(
        "studentName"
      )
      .value
      .trim();


  const studentID =
    document
      .getElementById(
        "studentID"
      )
      .value
      .trim();


  const message =
    document.getElementById(
      "joinMessage"
    );


  const exam =
    db.exams.find(
      e =>
        e.code === code
    );


  if (!exam) {

    message.textContent =
      "Exam code not found.";

    return;

  }


  if (
    exam.status !==
    "OPEN"
  ) {

    message.textContent =
      "This examination is currently closed.";

    return;

  }


  if (
    !studentName ||
    !studentID
  ) {

    message.textContent =
      "Please enter your student name and ID.";

    return;

  }


  const questions =
    db.questions.filter(
      q =>
        q.classID ===
        exam.classID
    );


  if (!questions.length) {

    message.textContent =
      "This examination has no questions.";

    return;

  }


  const orderedQuestions =
    exam.randomize
      ? shuffle(questions)
      : questions;


  currentExam = exam;


  currentAttempt = {

    id:
      generateID("ATTEMPT"),

    examID:
      exam.id,

    studentName,

    studentID,

    status:
      "ANSWERING",

    questionIDs:
      orderedQuestions.map(
        q =>
          q.id
      ),

    answers:
      Array(
        orderedQuestions.length
      ).fill(null),

    startedAt:
      new Date().toISOString(),

    score:
      0

  };


  db.attempts.push(
    currentAttempt
  );


  saveDatabase();


  currentQuestionIndex =
    0;


  document.getElementById(
    "studentExamTitle"
  ).textContent =
    exam.title;


  document.getElementById(
    "studentExamStudent"
  ).textContent =
    `${studentName} • ${studentID}`;


  showScreen(
    "studentExamScreen"
  );


  startExamTimer(
    exam.duration * 60
  );


  renderStudentQuestion();

}


/* =========================================================
   STUDENT EXAMINATION
   ========================================================= */

function startExamTimer(
  totalSeconds
) {

  clearInterval(
    timerInterval
  );


  const endTime =
    Date.now() +
    totalSeconds * 1000;


  function tick() {

    const remaining =
      Math.max(
        0,
        Math.ceil(
          (
            endTime -
            Date.now()
          ) / 1000
        )
      );


    const minutes =
      Math.floor(
        remaining / 60
      );


    const seconds =
      remaining % 60;


    document.getElementById(
      "examTimer"
    ).textContent =

      `${String(minutes).padStart(2,"0")}:` +
      `${String(seconds).padStart(2,"0")}`;


    if (
      remaining <= 0
    ) {

      clearInterval(
        timerInterval
      );

      submitExam(
        true
      );

    }

  }


  tick();


  timerInterval =
    setInterval(
      tick,
      1000
    );

}


function renderStudentQuestion() {

  if (!currentAttempt) {
    return;
  }


  const questionID =
    currentAttempt
      .questionIDs[
        currentQuestionIndex
      ];


  const question =
    db.questions.find(
      q =>
        q.id ===
        questionID
    );


  if (!question) {
    return;
  }


  const selected =
    currentAttempt.answers[
      currentQuestionIndex
    ];


  const total =
    currentAttempt.questionIDs.length;


  const questionNumber =
    currentQuestionIndex + 1;


  document.getElementById(
    "currentQuestionLabel"
  ).textContent =
    `QUESTION ${questionNumber}`;


  document.getElementById(
    "currentQuestion"
  ).textContent =
    question.text;


  document.getElementById(
    "questionNumber"
  ).textContent =
    `Question ${questionNumber} of ${total}`;


  const answered =
    currentAttempt.answers.filter(
      answer =>
        answer !== null
    ).length;


  document.getElementById(
    "answeredNumber"
  ).textContent =
    `${answered} Answered`;


  document.getElementById(
    "navCounter"
  ).textContent =
    `${questionNumber} / ${total}`;


  document.getElementById(
    "examProgress"
  ).style.width =
    `${questionNumber / total * 100}%`;


  const choices =
    document.getElementById(
      "studentChoices"
    );


  choices.innerHTML =
    Object.entries(
      question.choices
    ).map(
      ([letter,text]) => `

        <label
          class="student-choice
          ${selected === letter
            ? "selected"
            : ""}"
        >

          <input
            type="radio"
            name="studentAnswer"
            value="${letter}"
            ${selected === letter
              ? "checked"
              : ""}
          >

          <span>

            <strong>
              ${letter}.
            </strong>

            ${escapeHTML(text)}

          </span>

        </label>

      `
    ).join("");


  document
    .querySelectorAll(
      'input[name="studentAnswer"]'
    )
    .forEach(
      radio => {

        radio.onchange =
          function() {

            currentAttempt
              .answers[
                currentQuestionIndex
              ] =
              this.value;


            saveDatabase();

            renderStudentQuestion();

          };

      }
    );


  document.getElementById(
    "nextQuestionBtn"
  ).classList.toggle(
    "hidden",
    currentQuestionIndex ===
    total - 1
  );


  document.getElementById(
    "submitExamBtn"
  ).classList.toggle(
    "hidden",
    currentQuestionIndex !==
    total - 1
  );

}


/* =========================================================
   QUESTION NAVIGATION
   ========================================================= */

function previousQuestion() {

  if (
    currentQuestionIndex <= 0
  ) {

    return;

  }


  currentQuestionIndex--;

  renderStudentQuestion();

}


function nextQuestion() {

  if (!currentAttempt) {
    return;
  }


  if (
    currentQuestionIndex >=
    currentAttempt.questionIDs.length - 1
  ) {

    return;

  }


  currentQuestionIndex++;

  renderStudentQuestion();

}


/* =========================================================
   SUBMISSION
   ========================================================= */

function submitExam(
  automatic = false
) {

  if (!currentAttempt) {
    return;
  }


  if (
    !automatic
  ) {

    const confirmed =
      confirm(
        "Are you sure you want to submit your examination?"
      );


    if (!confirmed) {
      return;
    }

  }


  clearInterval(
    timerInterval
  );


  let score = 0;

  let totalPoints = 0;


  currentAttempt
    .questionIDs
    .forEach(
      (questionID,index) => {

        const question =
          db.questions.find(
            q =>
              q.id ===
              questionID
          );


        if (!question) {
          return;
        }


        totalPoints +=
          Number(
            question.points
          );


        if (
          currentAttempt
            .answers[index] ===
          question.correct
        ) {

          score +=
            Number(
              question.points
            );

        }

      }
    );


  currentAttempt.score =
    score;


  currentAttempt.status =
    "SUBMITTED";


  currentAttempt.submittedAt =
    new Date().toISOString();


  const percentage =
    totalPoints > 0

      ? Math.round(
          score /
          totalPoints *
          100
        )

      : 0;


  db.results.push({

    id:
      generateID("RESULT"),

    examID:
      currentExam.id,

    examTitle:
      currentExam.title,

    studentName:
      currentAttempt.studentName,

    studentID:
      currentAttempt.studentID,

    score,

    total:
      totalPoints,

    percentage,

    status:
      "SUBMITTED",

    submittedAt:
      currentAttempt.submittedAt

  });


  saveDatabase();


  document.getElementById(
    "studentResultMessage"
  ).textContent =

    `${currentAttempt.studentName}, ` +
    "your examination has been recorded successfully.";


  document.getElementById(
    "studentFinalScore"
  ).textContent =
    `${score}/${totalPoints}`;


  document.getElementById(
    "studentFinalPercentage"
  ).textContent =
    `${percentage}%`;


  currentAttempt = null;

  currentExam = null;


  showScreen(
    "studentResultScreen"
  );

}


/* =========================================================
   RESULTS
   ========================================================= */

function renderResults() {

  const body =
    document.getElementById(
      "resultsBody"
    );


  if (!db.results.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="7"
          style="
            text-align:center;
            color:#667085;
          "
        >
          No examination results yet.
        </td>

      </tr>

    `;

    return;

  }


  body.innerHTML =
    db.results.map(
      result => `

        <tr>

          <td>
            <strong>
              ${escapeHTML(
                result.studentName
              )}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              result.studentID
            )}
          </td>

          <td>
            ${escapeHTML(
              result.examTitle
            )}
          </td>

          <td>
            ${result.score}/${result.total}
          </td>

          <td>
            <strong>
              ${result.percentage}%
            </strong>
          </td>

          <td>

            <span
              class="status SUBMITTED"
            >
              SUBMITTED
            </span>

          </td>

          <td>
            ${new Date(
              result.submittedAt
            ).toLocaleString()}
          </td>

        </tr>

      `
    ).join("");

}


/* =========================================================
   CSV EXPORT
   ========================================================= */

function downloadResults() {

  if (!db.results.length) {

    showToast(
      "There are no results to download."
    );

    return;

  }


  const rows = [

    [
      "Student",
      "Student ID",
      "Exam",
      "Score",
      "Total",
      "Percentage",
      "Status",
      "Time Submitted"
    ]

  ];


  db.results.forEach(
    result => {

      rows.push([

        result.studentName,

        result.studentID,

        result.examTitle,

        result.score,

        result.total,

        result.percentage + "%",

        result.status,

        new Date(
          result.submittedAt
        ).toLocaleString()

      ]);

    }
  );


  const csv =
    rows.map(
      row =>
        row.map(
          value =>
            `"${String(value)
              .replace(/"/g,'""')}"`
        ).join(",")
    ).join("\n");


  const blob =
    new Blob(
      ["\ufeff" + csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href = url;

  link.download =
    "EXAMGUARD_Results.csv";


  link.click();


  URL.revokeObjectURL(
    url
  );


  showToast(
    "Results downloaded."
  );

}


/* =========================================================
   PRINT / PDF
   ========================================================= */

function printResults() {

  if (!db.results.length) {

    showToast(
      "There are no results to print."
    );

    return;

  }


  const rows =
    db.results.map(
      result => `

        <tr>

          <td>
            ${escapeHTML(
              result.studentName
            )}
          </td>

          <td>
            ${escapeHTML(
              result.studentID
            )}
          </td>

          <td>
            ${escapeHTML(
              result.examTitle
            )}
          </td>

          <td>
            ${result.score}/${result.total}
          </td>

          <td>
            ${result.percentage}%
          </td>

          <td>
            ${result.status}
          </td>

          <td>
            ${new Date(
              result.submittedAt
            ).toLocaleString()}
          </td>

        </tr>

      `
    ).join("");


  const printWindow =
    window.open(
      "",
      "_blank"
    );


  printWindow.document.write(`

    <!DOCTYPE html>

    <html>

    <head>

      <title>
        EXAMGUARD Examination Results
      </title>

      <style>

        body {
          font-family: Arial;
          padding: 30px;
        }

        h1 {
          margin-bottom: 5px;
        }

        p {
          color: #555;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 25px;
        }

        th,
        td {
          border: 1px solid #ccc;
          padding: 9px;
          text-align: left;
        }

        th {
          background: #f2f2f2;
        }

      </style>

    </head>

    <body>

      <h1>
        EXAMGUARD
      </h1>

      <p>
        Examination Results Report
      </p>

      <table>

        <thead>

          <tr>

            <th>
              Student
            </th>

            <th>
              Student ID
            </th>

            <th>
              Examination
            </th>

            <th>
              Score
            </th>

            <th>
              Percentage
            </th>

            <th>
              Status
            </th>

            <th>
              Submitted
            </th>

          </tr>

        </thead>

        <tbody>

          ${rows}

        </tbody>

      </table>

    </body>

    </html>

  `);


  printWindow.document.close();

  printWindow.focus();

  printWindow.print();

}


/* =========================================================
   RESET DATABASE
   ========================================================= */

function resetEXAMGUARD() {

  const confirmed =
    confirm(
      "This will delete all EXAMGUARD demo data. Continue?"
    );


  if (!confirmed) {
    return;
  }


  localStorage.removeItem(
    STORAGE_KEY
  );


  db =
    structuredClone(
      defaultDatabase
    );


  createDemoData();


  renderTeacherDashboard();


  showToast(
    "EXAMGUARD demo data reset."
  );

}


/* =========================================================
   DEMO MONITORING
   ========================================================= */

/*
   CodePen cannot make multiple physical phones communicate
   directly through localStorage.

   This function creates demonstration students so that
   the Teacher > Live Monitoring screen can be tested.
*/

function createDemoStudents() {

  const exam =
    db.exams.find(
      e =>
        e.status === "OPEN"
    );


  if (!exam) {

    showToast(
      "Create an open examination first."
    );

    return;

  }


  const existing =
    db.attempts.filter(
      a =>
        a.examID === exam.id
    ).length;


  const names = [
    "Student 1",
    "Student 2",
    "Student 3",
    "Student 4",
    "Student 5"
  ];


  for (
    let i = existing;
    i < Math.min(existing + 5, 5);
    i++
  ) {

    const questions =
      db.questions.filter(
        q =>
          q.classID ===
          exam.classID
      );


    db.attempts.push({

      id:
        generateID("DEMO"),

      examID:
        exam.id,

      studentName:
        names[i],

      studentID:
        "DEMO-" +
        String(i + 1)
          .padStart(3,"0"),

      status:
        i === 0
          ? "ANSWERING"
          : i === 1
            ? "ANSWERING"
            : i === 2
              ? "SUBMITTED"
              : "WAITING",

      questionIDs:
        questions.map(
          q =>
            q.id
        ),

      answers:
        Array(
          questions.length
        ).fill(null),

      score:
        i === 2
          ? 3
          : 0,

      startedAt:
        new Date().toISOString()

    });

  }


  saveDatabase();

  renderTeacherDashboard();

  showToast(
    "Demo students added."
  );

}


/* =========================================================
   KEYBOARD SHORTCUT
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      if (
        document
          .getElementById(
            "homeScreen"
          )
          .classList
          .contains("active")
      ) {

        return;

      }

    }

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

renderTeacherDashboard();

console.log(
  "EXAMGUARD initialized successfully."
);