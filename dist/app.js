(() => {
  "use strict";

  const DATA = window.SLP_DATA;
  const STORAGE_KEY = "riphah-ms-slp-mastery-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const app = $("#app");
  const nav = $("#primary-nav");
  const mobileNav = $("#mobile-bottom-nav");
  const searchInput = $("#global-search");
  const searchPanel = $("#search-panel");
  const letters = ["A", "B", "C", "D"];

  const freshProgress = () => ({ answers: {}, starred: [], studyDates: [], lastView: "dashboard" });
  let progress = loadProgress();
  let session = null;
  let exam = null;
  let examTimer = null;

  function loadProgress() {
    try { return { ...freshProgress(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return freshProgress(); }
  }
  function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);
  }
  function routeParts() { return (location.hash.replace(/^#\/?/, "") || "dashboard").split("/"); }
  function go(path) { location.hash = `#/${path}`; }
  function courseById(id) { return DATA.courses.find(c => c.id === id) || DATA.courses[0]; }
  function topicById(course, id) { return course.topics.find(t => t.id === id) || course.topics[0]; }
  function questionsFor({ courseId, topicId } = {}) {
    return DATA.questions.filter(q => (!courseId || q.courseId === courseId) && (!topicId || q.topicId === topicId));
  }
  function seededShuffle(items, seedText) {
    let seed = [...seedText].reduce((n, c) => ((n << 5) - n + c.charCodeAt(0)) | 0, 0) >>> 0;
    const list = [...items];
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function studiedToday() { return progress.studyDates.includes(todayKey()); }
  function currentStreak() {
    const dates = new Set(progress.studyDates);
    let count = 0;
    const d = new Date();
    if (!dates.has(todayKey())) d.setDate(d.getDate() - 1);
    while (dates.has(d.toISOString().slice(0, 10))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }
  function stats(filterCourseId) {
    const ids = new Set(questionsFor({ courseId: filterCourseId }).map(q => q.id));
    let attempts = 0, correct = 0, mastered = 0, missed = 0;
    Object.entries(progress.answers).forEach(([id, value]) => {
      if (!ids.has(id)) return;
      attempts += value.attempts || 0; correct += value.correct || 0;
      if ((value.correct || 0) >= 2 && (value.correct || 0) / value.attempts >= .75) mastered++;
      if (value.lastCorrect === false) missed++;
    });
    return { attempts, correct, accuracy: attempts ? Math.round(correct / attempts * 100) : 0, mastered, missed };
  }
  function recordAnswer(question, correct, selected) {
    const old = progress.answers[question.id] || { attempts: 0, correct: 0 };
    progress.answers[question.id] = {
      attempts: old.attempts + 1,
      correct: old.correct + (correct ? 1 : 0),
      lastCorrect: correct,
      lastSelected: selected,
      updated: Date.now()
    };
    if (!progress.studyDates.includes(todayKey())) progress.studyDates.push(todayKey());
    saveProgress();
    renderNav();
  }
  function icon(name) {
    return ({ dashboard: "⌂", daily: "◷", courses: "▦", exam: "▣", review: "↻" })[name] || "•";
  }
  function renderNav() {
    const [view, id] = routeParts();
    const items = [["dashboard","Home"],["daily","Daily Quiz"],["courses","Courses"],["exam","Mock Exam"],["review","Review Mistakes"]];
    nav.innerHTML = `
      <div class="nav-label">Practice</div>
      ${items.map(([key,label]) => `<button class="nav-link ${view === key || (key === "courses" && view === "course") ? "active" : ""}" data-route="${key}"><span class="nav-icon">${icon(key)}</span>${label}</button>`).join("")}
    `;
    mobileNav.innerHTML = items.map(([key,label]) => `<button class="mobile-nav-link ${view === key || (key === "courses" && view === "course") ? "active" : ""}" data-mobile-route="${key}"><span>${icon(key)}</span><small>${label.replace(" Mistakes","")}</small></button>`).join("");
    $$("[data-route]", nav).forEach(btn => btn.addEventListener("click", () => go(btn.dataset.route)));
    $$("[data-mobile-route]", mobileNav).forEach(btn => btn.addEventListener("click", () => go(btn.dataset.mobileRoute)));
    $("#streak-chip").textContent = `${currentStreak()} day streak`;
  }
  function meter(value) { return `<div class="mini-track"><div class="mini-fill" style="width:${Math.min(value,100)}%"></div></div>`; }
  function pageHead(eyebrow, title, lede, actions = "") {
    return `<div class="page-head"><div><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1>${escapeHTML(title)}</h1><p class="lede">${escapeHTML(lede)}</p></div>${actions ? `<div class="button-row">${actions}</div>` : ""}</div>`;
  }

  function renderDashboard() {
    const s = stats();
    const todayAnswered = Object.values(progress.answers).filter(a => a.updated && new Date(a.updated).toISOString().slice(0,10) === todayKey()).length;
    const todayPct = Math.min(100, Math.round(todayAnswered / 36 * 100));
    app.innerHTML = `
      <section class="home-welcome">
        <div>
          <p class="eyebrow">Maham Hassan (Speech &amp; Language Pathologist)</p>
          <h1>What would you like to practise?</h1>
          <p class="lede">Build exam confidence with focused, syllabus-wide MCQs and clear answer explanations.</p>
        </div>
        <div class="home-progress"><span>Today</span><strong>${todayAnswered}<small>/36</small></strong><div class="mini-track"><div class="mini-fill" style="width:${todayPct}%"></div></div></div>
      </section>
      <section class="quick-action-grid">
        <button class="quick-action daily-action" data-action="daily"><span class="quick-icon">◷</span><span><strong>Daily Quiz</strong><small>36 balanced MCQs</small></span><b>Start →</b></button>
        <button class="quick-action" data-action="courses"><span class="quick-icon">▦</span><span><strong>Browse Courses</strong><small>Choose a topic</small></span><b>Open →</b></button>
        <button class="quick-action" data-action="exam"><span class="quick-icon">▣</span><span><strong>Mock Exam</strong><small>Timed exam practice</small></span><b>Begin →</b></button>
      </section>
      <section class="home-stat-row">
        <span><strong>${DATA.meta.questionCount.toLocaleString()}</strong> MCQs</span><span><strong>${s.accuracy}%</strong> accuracy</span><span><strong>${s.missed}</strong> to review</span>
      </section>
      <section class="home-course-section"><div class="section-title"><div><p class="eyebrow">Course-wise practice</p><h2>Choose a course</h2></div><button class="text-button" data-action="courses">View all</button></div><div class="home-course-grid">${DATA.courses.map(c => { const cs=stats(c.id); return `<button class="home-course-card" data-course="${c.id}" style="--course:${c.accent}"><span class="course-initial">${escapeHTML(c.short.slice(0,2))}</span><span><strong>${escapeHTML(c.title)}</strong><small>300 MCQs · ${cs.accuracy}% accuracy</small></span><b>→</b></button>`; }).join("")}</div></section>
    `;
    bindActions();
    $$("[data-course]").forEach(btn => btn.addEventListener("click", () => go(`course/${btn.dataset.course}`)));
  }

  function renderCourses() {
    app.innerHTML = `${pageHead("Course-wise question bank", "Choose a course", "Select a course, then practise a complete topic or a quick 10-question set.")}
      <section class="course-browser-grid">${DATA.courses.map(c => { const cs=stats(c.id); const attempted=questionsFor({courseId:c.id}).filter(q => progress.answers[q.id]).length; return `<button class="course-browser-card" data-course="${c.id}" style="--course:${c.accent}"><span class="course-browser-icon">${escapeHTML(c.short.slice(0,2))}</span><div><p class="eyebrow">${c.topics.length} topics · 300 MCQs</p><h2>${escapeHTML(c.title)}</h2><p>${attempted} attempted · ${cs.accuracy}% accuracy</p>${meter(Math.round(attempted/300*100))}</div><span class="course-arrow">→</span></button>`; }).join("")}</section>`;
    $$("[data-course]").forEach(btn => btn.addEventListener("click", () => go(`course/${btn.dataset.course}`)));
  }

  function dailyQuestions() {
    const selected = [];
    DATA.courses.forEach(course => selected.push(...seededShuffle(questionsFor({ courseId: course.id }), `${todayKey()}-${course.id}`).slice(0, 6)));
    return seededShuffle(selected, todayKey());
  }
  function startSession(questions, title, subtitle) {
    session = { questions: [...questions], index: 0, score: 0, selected: null, checked: false, title, subtitle };
    renderPractice();
  }
  function renderDaily() {
    const set = dailyQuestions();
    app.innerHTML = `${pageHead("Daily MCQ practice", "Today’s balanced MCQ paper", "Thirty-six questions—six from every course—with full explanations after every answer.", `<button class="btn btn-primary" id="start-daily">Start 36 MCQs</button>`)}
      <section class="content-grid">
        <article class="card"><p class="eyebrow">Coverage map</p><h2>Every course, every day</h2><div class="course-progress-list">${DATA.courses.map(c => `<div class="course-progress-row" style="--course:${c.accent}"><strong>${escapeHTML(c.title)}</strong><small>6 questions</small>${meter(100)}</div>`).join("")}</div></article>
        <article class="card"><p class="eyebrow">Method</p><h2>How to use explanations</h2><p>Answer before looking anything up. Read the complete explanation after every choice. Say the correct rule aloud, then write one sentence for any error you made.</p><p class="fine-print">The daily set changes with the date. Your answer history remains on this device.</p></article>
      </section>`;
    $("#start-daily").addEventListener("click", () => startSession(set, "Today’s balanced quiz", "36 questions across six courses"));
  }

  function renderPractice() {
    const q = session.questions[session.index];
    if (!q) return renderSessionSummary();
    const pct = Math.round(session.index / session.questions.length * 100);
    app.innerHTML = `<div class="quiz-shell">
      <div class="quiz-top"><button class="btn btn-secondary" id="quit-session">Exit</button><div class="quiz-progress"><p><span>${escapeHTML(session.title)}</span><span>${session.index + 1} of ${session.questions.length}</span></p>${meter(pct)}</div></div>
      <article class="card question-card">
        <div class="question-meta"><span class="tag">${escapeHTML(q.course)}</span><span class="tag">${escapeHTML(q.topic)}</span><span class="tag tag-kind">${escapeHTML(q.difficulty || q.kind)}</span></div>
        <h2>${escapeHTML(q.prompt)}</h2>
        <div class="option-list">${q.options.map((option,i) => {
          let cls = "option";
          if (session.checked && i === q.answer) cls += " correct";
          if (session.checked && i === session.selected && i !== q.answer) cls += " incorrect";
          if (!session.checked && i === session.selected) cls += " selected";
          return `<button class="${cls}" data-option="${i}" ${session.checked ? "disabled" : ""}><span class="option-letter">${letters[i]}</span><span>${escapeHTML(option)}</span></button>`;
        }).join("")}</div>
        ${session.checked ? `<div class="explanation ${session.selected === q.answer ? "" : "wrong"}">
          <div class="answer-verdict"><span>${session.selected === q.answer ? "Correct answer" : "Review this answer"}</span><h3>${letters[q.answer]}. ${escapeHTML(q.options[q.answer])}</h3></div>
          <div class="explanation-grid">
            <section class="explain-block explain-reason"><span>Why this is correct</span><p>${escapeHTML(q.reasoning)}</p></section>
            <section class="explain-block explain-definition"><span>Definition</span><p>${escapeHTML(q.definition)}</p></section>
            <section class="explain-block explain-importance"><span>Why it matters in SLP</span><p>${escapeHTML(q.importance)}</p></section>
            <section class="explain-block explain-example"><span>Clinical or learning example</span><p>${escapeHTML(q.example)}</p></section>
          </div>
          <section class="distractor-review"><h4>Why the other options are wrong</h4>${(q.distractorReview || []).map(item => `<p><strong>${letters[item.index]}.</strong> ${escapeHTML(item.note)}</p>`).join("")}</section>
          <section class="exam-tip"><strong>Exam tip</strong><p>${escapeHTML(q.examTip || "Identify the tested concept before comparing closely related options.")}</p></section>
        </div>` : ""}
        <div class="question-footer"><button class="star-button ${progress.starred.includes(q.id) ? "active" : ""}" id="star-question">★ ${progress.starred.includes(q.id) ? "Saved" : "Save for review"}</button><button class="btn btn-primary" id="question-action" ${session.checked ? "" : "disabled"}>${session.checked ? (session.index === session.questions.length - 1 ? "See results" : "Next question") : "Select one option"}</button></div>
      </article>
    </div>`;
    $$("[data-option]").forEach(btn => btn.addEventListener("click", () => {
      if (session.checked) return;
      session.selected = Number(btn.dataset.option);
      session.checked = true;
      const correct = session.selected === q.answer;
      if (correct) session.score++;
      recordAnswer(q, correct, session.selected);
      renderPractice();
    }));
    $("#question-action").addEventListener("click", () => {
      session.index++; session.selected = null; session.checked = false;
      renderPractice();
    });
    $("#quit-session").addEventListener("click", () => { session = null; route(); });
    $("#star-question").addEventListener("click", () => toggleStar(q.id));
  }
  function renderSessionSummary() {
    const score = session.score, total = session.questions.length, pct = Math.round(score / total * 100);
    app.innerHTML = `<div class="quiz-shell"><article class="card result-hero"><div class="score-ring" style="--score:${pct * 3.6}deg"><strong>${pct}%</strong></div><div><p class="eyebrow">Practice complete</p><h1>${score} of ${total} correct</h1><p class="lede">${pct >= 80 ? "Strong work. Revisit saved questions to make the result durable." : "Use the missed-question review now; improvement comes from correcting the exact reason for each error."}</p><div class="button-row" style="margin-top:18px"><button class="btn btn-primary" id="review-missed">Review weak answers</button><button class="btn btn-secondary" id="back-dashboard">Dashboard</button></div></div></article></div>`;
    session = null;
    $("#review-missed").addEventListener("click", () => go("review"));
    $("#back-dashboard").addEventListener("click", () => go("dashboard"));
  }
  function toggleStar(id) {
    progress.starred = progress.starred.includes(id) ? progress.starred.filter(x => x !== id) : [...progress.starred, id];
    saveProgress();
    if (session) renderPractice(); else route();
  }

  function renderCourse(courseId, topicId) {
    const course = courseById(courseId);
    const s = stats(course.id);
    app.innerHTML = `<section class="card course-banner" style="--course:${course.accent}">
      <div class="course-banner-top"><div><p class="eyebrow">Riphah MS SLP course</p><h1>${escapeHTML(course.title)}</h1><div class="meta-row"><span>${escapeHTML(course.instructor)}</span><span>${course.topics.length} topics</span><span>${course.conceptCount} syllabus concepts</span><span>300 MCQs</span></div></div><div class="button-row"><button class="btn btn-primary" id="course-practice">Practice 50</button><button class="btn btn-secondary" id="course-exam">Mock exam</button></div></div>
      <div style="margin-top:18px">${meter(Math.round(s.mastered / 300 * 100))}</div>
    </section>
    <div class="mcq-section-head"><div><p class="eyebrow">Topic-wise MCQ bank</p><h2>Choose a topic and begin answering</h2><p class="lede">Definitions, importance, examples, and supporting detail appear inside the explanation after each submitted answer.</p></div></div>
    <section class="topic-mcq-grid" style="--course:${course.accent}">
      ${course.topics.map(topic => {
        const topicQuestions = questionsFor({ topicId: topic.id });
        const attempted = topicQuestions.filter(q => progress.answers[q.id]).length;
        const topicCorrect = topicQuestions.filter(q => progress.answers[q.id]?.lastCorrect === true).length;
        return `<article class="card topic-mcq-card ${topic.id === topicId ? "highlighted" : ""}">
          <div class="topic-mcq-number">${String(topic.number).padStart(2,"0")}</div>
          <div><p class="eyebrow">${topicQuestions.length} MCQs</p><h3>${escapeHTML(topic.title)}</h3><p>${topic.concepts.length} syllabus concepts tested through definition, discrimination, and application questions.</p></div>
          <div class="topic-mcq-progress"><span>${attempted} attempted</span><span>${topicCorrect} currently correct</span></div>
          ${meter(Math.round(attempted / topicQuestions.length * 100))}
          <div class="button-row"><button class="btn btn-primary" data-topic-full="${topic.id}">Start all ${topicQuestions.length}</button><button class="btn btn-secondary" data-topic-quick="${topic.id}">Quick 10</button></div>
        </article>`;
      }).join("")}
    </section>`;
    $$('[data-topic-full]').forEach(btn => btn.addEventListener("click", () => { const topic = topicById(course, btn.dataset.topicFull); startSession(seededShuffle(questionsFor({ topicId: topic.id }), Date.now().toString()), `${course.short}: ${topic.title}`, "Complete topic MCQ set"); }));
    $$('[data-topic-quick]').forEach(btn => btn.addEventListener("click", () => { const topic = topicById(course, btn.dataset.topicQuick); startSession(seededShuffle(questionsFor({ topicId: topic.id }), Date.now().toString()).slice(0,10), `${course.short}: ${topic.title}`, "10-question quick practice"); }));
    $("#course-practice").addEventListener("click", () => startSession(seededShuffle(questionsFor({ courseId: course.id }), Date.now().toString()).slice(0,50), `${course.short} practice`, "50 mixed questions"));
    $("#course-exam").addEventListener("click", () => { go(`exam/${course.id}`); });
  }

  function renderExamSetup(preselected) {
    const selected = preselected && courseById(preselected) ? preselected : DATA.courses[0].id;
    app.innerHTML = `${pageHead("Timed assessment", "Course-specific mock exam", "Simulate Riphah’s MCQ format. Answers remain hidden until final submission.")}
      <section class="exam-setup">
        <article class="card"><h2>Build your mock paper</h2><div class="form-group"><label for="exam-course">Course</label><select id="exam-course">${DATA.courses.map(c => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${escapeHTML(c.title)}</option>`).join("")}</select></div><div class="form-group"><label for="exam-length">Number of questions</label><select id="exam-length"><option value="25">25 questions</option><option value="50" selected>50 questions</option><option value="100">100 questions</option></select></div><div class="form-group"><label for="exam-duration">Time limit</label><select id="exam-duration"><option value="30">30 minutes</option><option value="60" selected>60 minutes</option><option value="120">120 minutes</option></select></div><button class="btn btn-primary" id="begin-exam">Begin mock exam</button></article>
        <article class="card"><p class="eyebrow">Exam discipline</p><h2>Use strict conditions</h2><ol class="exam-rules"><li>Keep notes and course files closed.</li><li>Choose the single best answer for every item.</li><li>Flag uncertainty mentally, but keep moving.</li><li>Submit before time ends; unanswered items score zero.</li><li>Review the explanation for every incorrect item afterward.</li></ol><p class="fine-print" style="margin-top:20px">Questions are independently generated from the supplied course content and are not recalled or official university examination items.</p></article>
      </section>`;
    $("#begin-exam").addEventListener("click", () => startExam($("#exam-course").value, Number($("#exam-length").value), Number($("#exam-duration").value)));
  }
  function startExam(courseId, length, minutes) {
    const pool = seededShuffle(questionsFor({ courseId }), `${Date.now()}-${courseId}`).slice(0, length);
    exam = { courseId, questions: pool, answers: {}, index: 0, seconds: minutes * 60, submitted: false };
    if (examTimer) clearInterval(examTimer);
    examTimer = setInterval(() => { if (!exam || exam.submitted) return; exam.seconds--; const clock = $("#exam-clock"); if (clock) clock.textContent = formatTime(exam.seconds); if (exam.seconds <= 0) submitExam(true); }, 1000);
    renderExamQuestion();
  }
  function formatTime(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`; }
  function renderExamQuestion() {
    const q = exam.questions[exam.index];
    const selected = exam.answers[q.id];
    app.innerHTML = `<div class="exam-layout"><div><div class="quiz-top"><div><p class="eyebrow">${escapeHTML(courseById(exam.courseId).title)}</p><h2>Question ${exam.index + 1} of ${exam.questions.length}</h2></div></div><article class="card question-card"><div class="question-meta"><span class="tag">${escapeHTML(q.topic)}</span><span class="tag tag-kind">${escapeHTML(q.kind)}</span></div><h2>${escapeHTML(q.prompt)}</h2><div class="option-list">${q.options.map((o,i) => `<button class="option ${selected === i ? "exam-option-selected" : ""}" data-exam-option="${i}"><span class="option-letter">${letters[i]}</span><span>${escapeHTML(o)}</span></button>`).join("")}</div><div class="question-footer"><button class="btn btn-secondary" id="exam-prev" ${exam.index === 0 ? "disabled" : ""}>Previous</button><button class="btn btn-primary" id="exam-next">${exam.index === exam.questions.length - 1 ? "Go to overview" : "Next"}</button></div></article></div><aside class="card exam-nav"><div class="exam-clock" id="exam-clock">${formatTime(exam.seconds)}</div><h3>Question navigator</h3><div class="question-grid">${exam.questions.map((item,i) => `<button class="q-jump ${exam.answers[item.id] !== undefined ? "answered" : ""} ${i === exam.index ? "current" : ""}" data-jump="${i}">${i+1}</button>`).join("")}</div><button class="btn btn-teal" id="submit-exam" style="width:100%;margin-top:16px">Submit exam</button><p class="fine-print" style="margin:12px 0 0">${Object.keys(exam.answers).length} of ${exam.questions.length} answered</p></aside></div>`;
    $$('[data-exam-option]').forEach(btn => btn.addEventListener("click", () => { exam.answers[q.id] = Number(btn.dataset.examOption); renderExamQuestion(); }));
    $$('[data-jump]').forEach(btn => btn.addEventListener("click", () => { exam.index = Number(btn.dataset.jump); renderExamQuestion(); }));
    $("#exam-prev").addEventListener("click", () => { exam.index--; renderExamQuestion(); });
    $("#exam-next").addEventListener("click", () => { exam.index = Math.min(exam.questions.length - 1, exam.index + 1); renderExamQuestion(); });
    $("#submit-exam").addEventListener("click", () => submitExam(false));
  }
  function submitExam(forced) {
    if (!exam || exam.submitted) return;
    const unanswered = exam.questions.length - Object.keys(exam.answers).length;
    if (!forced && !confirm(unanswered ? `${unanswered} questions are unanswered. Submit now?` : "Submit this exam now?")) return;
    exam.submitted = true; clearInterval(examTimer);
    let score = 0;
    exam.questions.forEach(q => { const selected = exam.answers[q.id]; const correct = selected === q.answer; if (correct) score++; recordAnswer(q, correct, selected ?? -1); });
    exam.score = score;
    renderExamResults(forced);
  }
  function renderExamResults(forced) {
    const pct = Math.round(exam.score / exam.questions.length * 100);
    const topicScores = {};
    exam.questions.forEach(q => { const x = topicScores[q.topic] ||= { n:0,c:0 }; x.n++; if (exam.answers[q.id] === q.answer) x.c++; });
    app.innerHTML = `<section class="card result-hero"><div class="score-ring" style="--score:${pct*3.6}deg"><strong>${pct}%</strong></div><div><p class="eyebrow">${forced ? "Time expired" : "Mock exam submitted"}</p><h1>${exam.score} of ${exam.questions.length} correct</h1><p class="lede">${pct >= 80 ? "Exam-ready performance. Strengthen the few remaining weak topics." : pct >= 60 ? "Developing well. Review the topic breakdown before another attempt." : "Return to topic practice and explanations before repeating a timed mock."}</p><div class="button-row" style="margin-top:18px"><button class="btn btn-primary" id="new-exam">New mock</button><button class="btn btn-secondary" id="print-result">Print results</button></div></div></section><section class="content-grid" style="margin-top:20px"><article class="card"><h2>Topic breakdown</h2><div class="course-progress-list">${Object.entries(topicScores).map(([topic,x]) => { const p=Math.round(x.c/x.n*100); return `<div class="course-progress-row" style="--course:${p>=70?'#2f8651':'#c64256'}"><strong>${escapeHTML(topic)}</strong><small>${x.c}/${x.n} · ${p}%</small>${meter(p)}</div>`; }).join("")}</div></article><article class="card"><h2>What to do next</h2><p>Review every incorrect item below. For each one, explain why your choice was wrong and why the correct option is better.</p><button class="btn btn-teal" id="jump-errors">Go to errors</button></article></section><section style="margin-top:24px"><div class="card-head"><div><p class="eyebrow">Answer review</p><h2>Incorrect and unanswered items</h2></div></div><div class="result-list" id="exam-errors">${exam.questions.filter(q => exam.answers[q.id] !== q.answer).map(q => `<article class="result-item" style="--status:#c64256"><p>${escapeHTML(q.prompt)}</p><small>Your answer: ${exam.answers[q.id] === undefined ? "Unanswered" : escapeHTML(q.options[exam.answers[q.id]])}<br><strong>Correct answer:</strong> ${escapeHTML(q.options[q.answer])}</small><div class="exam-review-explanation"><p><strong>Reasoning:</strong> ${escapeHTML(q.reasoning)}</p><p><strong>Definition:</strong> ${escapeHTML(q.definition)}</p><p><strong>Why it matters:</strong> ${escapeHTML(q.importance)}</p><p><strong>Example:</strong> ${escapeHTML(q.example)}</p><p><strong>Exam tip:</strong> ${escapeHTML(q.examTip || "Identify the tested concept before comparing options.")}</p>${(q.distractorReview || []).map(item => `<p><strong>${letters[item.index]}:</strong> ${escapeHTML(item.note)}</p>`).join("")}</div></article>`).join("") || `<div class="empty-state">Perfect score—no errors to review.</div>`}</div></section>`;
    $("#new-exam").addEventListener("click", () => { exam = null; go("exam"); });
    $("#print-result").addEventListener("click", () => print());
    $("#jump-errors").addEventListener("click", () => $("#exam-errors").scrollIntoView({behavior:"smooth"}));
  }

  function renderReview() {
    const missed = DATA.questions.filter(q => progress.answers[q.id]?.lastCorrect === false);
    const starred = DATA.questions.filter(q => progress.starred.includes(q.id));
    app.innerHTML = `${pageHead("MCQ correction", "Incorrect and saved MCQs", "Reattempt weak questions and use the answer explanations to correct each misunderstanding.", missed.length ? `<button class="btn btn-primary" id="practice-missed">Practice ${Math.min(50,missed.length)} missed</button>` : "")}
      <section class="content-grid"><article class="card"><div class="card-head"><div><p class="eyebrow">Last attempt incorrect</p><h2>${missed.length} questions need review</h2></div></div>${missed.length ? `<div class="review-grid">${missed.slice(0,30).map(q => `<div class="review-row"><div><p>${escapeHTML(q.concept)}</p><small>${escapeHTML(q.course)} · ${escapeHTML(q.topic)} · ${escapeHTML(q.kind)}</small></div><button class="text-button" data-one-question="${q.id}">Practice</button></div>`).join("")}</div>` : `<div class="empty-state"><div class="empty-icon">✓</div><h3>No missed questions yet</h3><p>Complete a daily quiz or mock exam to build your review queue.</p></div>`}</article><article class="card"><div class="card-head"><div><p class="eyebrow">Saved</p><h2>${starred.length} starred questions</h2></div></div>${starred.length ? `<div class="review-grid">${starred.slice(0,20).map(q => `<div class="review-row"><div><p>${escapeHTML(q.concept)}</p><small>${escapeHTML(q.course)} · ${escapeHTML(q.kind)}</small></div><button class="text-button" data-one-question="${q.id}">Open</button></div>`).join("")}</div>` : `<div class="empty-state"><p>Use “Save for review” during practice to collect difficult questions here.</p></div>`}<button class="btn btn-danger" id="reset-progress" style="margin-top:20px">Reset all progress</button></article></section>`;
    if (missed.length) $("#practice-missed").addEventListener("click", () => startSession(seededShuffle(missed, Date.now().toString()).slice(0,50), "Missed-question review", "Correct recent errors"));
    $$('[data-one-question]').forEach(btn => btn.addEventListener("click", () => startSession([DATA.questions.find(q => q.id === btn.dataset.oneQuestion)], "Focused correction", "One saved question")));
    $("#reset-progress").addEventListener("click", () => { if (confirm("Delete all scores, stars, and study history on this device?")) { progress = freshProgress(); saveProgress(); renderReview(); renderNav(); } });
  }

  function bindActions() {
    $$('[data-action]').forEach(btn => btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "daily") go("daily");
      if (action === "courses") go("courses");
      if (action === "exam") go("exam");
      if (action === "review") go("review");
      if (action === "weakest") {
        const weak = [...DATA.courses].sort((a,b) => stats(a.id).accuracy - stats(b.id).accuracy)[0]; go(`course/${weak.id}`);
      }
    }));
  }
  function renderSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) { searchPanel.hidden = true; return; }
    const results = DATA.questions.filter(item => `${item.concept} ${item.prompt} ${item.topic} ${item.course}`.toLowerCase().includes(q)).slice(0,20);
    searchPanel.innerHTML = results.length ? results.map((r,i) => `<button class="search-result" data-search-result="${i}"><strong>${escapeHTML(r.concept)}</strong><small>${escapeHTML(r.course)} · ${escapeHTML(r.topic)} · ${escapeHTML(r.kind)} MCQ</small></button>`).join("") : `<div class="empty-state">No MCQ found for “${escapeHTML(query)}”.</div>`;
    searchPanel.hidden = false;
    $$('[data-search-result]', searchPanel).forEach(btn => btn.addEventListener("click", () => { const r=results[Number(btn.dataset.searchResult)]; searchInput.value=""; searchPanel.hidden=true; startSession([r], "Search result MCQ", `${r.course} · ${r.topic}`); }));
  }
  function route() {
    if (examTimer && !exam?.submitted) { clearInterval(examTimer); examTimer = null; }
    session = null;
    const [view, id, sub] = routeParts();
    progress.lastView = view; saveProgress(); renderNav();
    if (view === "daily") renderDaily();
    else if (view === "courses") renderCourses();
    else if (view === "course") renderCourse(id, sub);
    else if (view === "exam") renderExamSetup(id);
    else if (view === "review") renderReview();
    else renderDashboard();
    app.focus({ preventScroll: true }); window.scrollTo(0,0);
  }

  searchInput.addEventListener("input", e => renderSearch(e.target.value));
  searchInput.addEventListener("keydown", e => { if (e.key === "Escape") { searchInput.value=""; searchPanel.hidden=true; searchInput.blur(); } });
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchInput.focus(); } });
  document.addEventListener("click", e => { if (!searchPanel.contains(e.target) && e.target !== searchInput) searchPanel.hidden = true; });
  $("#profile-button").addEventListener("click", () => { go("review"); });
  window.addEventListener("hashchange", route);
  renderNav(); route();
})();
