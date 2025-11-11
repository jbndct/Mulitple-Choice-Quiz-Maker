document.addEventListener('DOMContentLoaded', () => {

    // --- STATE VARIABLES ---
    const STORAGE_KEY = 'quizManagerStorage';
    let appState = { activeQuizzes: [] };
    let currentQuizId = null;
    let currentLoadTab = 'json'; // 'json' or 'text'
    
    // --- ELEMENT REFERENCES ---
    // Containers
    const screenContainers = {
        'list': document.getElementById('quiz-list-container'),
        'setup': document.getElementById('setup-container'),
        'quiz': document.getElementById('quiz-container'),
        'results': document.getElementById('results-container'),
        'review': document.getElementById('review-container')
    };

    // Screen 1: List
    const activeQuizList = document.getElementById('active-quiz-list');
    const noQuizzesMessage = document.getElementById('no-quizzes-message');
    const loadNewQuizBtn = document.getElementById('load-new-quiz-btn');

    // Screen 2: Setup
    const backToListBtn = document.getElementById('back-to-list-btn');
    const tabBtnJson = document.getElementById('tab-btn-json');
    const tabBtnText = document.getElementById('tab-btn-text');
    const tabContentJson = document.getElementById('tab-content-json');
    const tabContentText = document.getElementById('tab-content-text');
    const jsonTextInput = document.getElementById('json-text-input');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const simpleTextInput = document.getElementById('simple-text-input');
    const loadQuizBtn = document.getElementById('load-quiz-btn');
    const setupError = document.getElementById('setup-error');

    // Screen 3: Quiz
    const quizContainer = document.getElementById('quiz-container');
    const skippedModeBanner = document.getElementById('skipped-mode-banner');
    const progressBar = document.getElementById('progress-bar');
    const quizTitle = document.getElementById('quiz-title');
    const showTocBtn = document.getElementById('show-toc-btn');
    const quizBackToListBtn = document.getElementById('quiz-back-to-list-btn');
    const questionCounter = document.getElementById('question-counter');
    const totalQuestions = document.getElementById('total-questions');
    const currentScore = document.getElementById('current-score');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackMessage = document.getElementById('feedback-message');
    const prevQuestionBtn = document.getElementById('prev-question-btn');
    const skipQuestionBtn = document.getElementById('skip-question-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');

    // Screen 4: Results
    const scoreText = document.getElementById('score-text');
    const reviewAnswersBtn = document.getElementById('review-answers-btn');
    const resultsBackToListBtn = document.getElementById('results-back-to-list-btn');
    
    // Screen 5: Review
    const reviewList = document.getElementById('review-list');
    const reviewBackToResultsBtn = document.getElementById('review-back-to-results-btn');
    
    // TOC Modal
    const tocModalContainer = document.getElementById('toc-modal-container');
    const tocGrid = document.getElementById('toc-grid');
    const closeTocBtn = document.getElementById('close-toc-btn');
    
    // --- STORAGE FUNCTIONS ---

    function loadStateFromStorage() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            appState = JSON.parse(storedData);
            if (!appState.activeQuizzes) {
                appState.activeQuizzes = [];
            }
            // Backwards compatibility for the 'visited' array
            appState.activeQuizzes.forEach(quiz => {
                if (!quiz.visited || quiz.visited.length !== quiz.quizData.length) {
                    console.log('Fixing visited array for quiz:', quiz.name);
                    quiz.visited = new Array(quiz.quizData.length).fill(false);
                    // Mark all ANSWERED questions as visited
                    quiz.userAnswers.forEach((answer, index) => {
                        if (answer !== null) {
                            quiz.visited[index] = true;
                        }
                    });
                    // And mark the *current* question as visited (if it's valid)
                    if (quiz.currentQuestionIndex < quiz.quizData.length) {
                        quiz.visited[quiz.currentQuestionIndex] = true;
                    }
                }
            });
        } else {
            appState = { activeQuizzes: [] };
        }
    }

    function saveStateToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }

    function generateId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `quiz-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }
    
    function updateQuizProgress() {
        saveStateToStorage();
    }

    function deleteQuiz(quizId) {
        appState.activeQuizzes = appState.activeQuizzes.filter(q => q.id !== quizId);
        saveStateToStorage();
    }

    function renameQuiz(quizId, newName) {
        const quiz = appState.activeQuizzes.find(q => q.id === quizId);
        if (quiz && newName) {
            quiz.name = newName;
            saveStateToStorage();
            renderQuizList(); // Re-render to show new name
        }
    }

    // --- NAVIGATION ---
    
    function showScreen(screenKey) {
        for (const key in screenContainers) {
            if (key === screenKey) {
                screenContainers[key].classList.remove('hidden');
            } else {
                screenContainers[key].classList.add('hidden');
            }
        }
    }

    // --- SCREEN 1: QUIZ LIST LOGIC ---

    function renderQuizList() {
        activeQuizList.innerHTML = ''; // Clear existing list
        
        if (appState.activeQuizzes.length === 0) {
            noQuizzesMessage.classList.remove('hidden');
        } else {
            noQuizzesMessage.classList.add('hidden');
            appState.activeQuizzes.forEach(quiz => {
                const quizItem = document.createElement('div');
                quizItem.className = 'bg-gray-700 p-4 rounded-lg';
                
                const totalQuestions = quiz.quizData.length;
                const answeredCount = quiz.userAnswers.filter(a => a !== null).length;
                const isFinished = answeredCount === totalQuestions;
                const progress = isFinished ? totalQuestions : quiz.currentQuestionIndex;

                quizItem.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-semibold text-lg text-white" data-id="${quiz.id}" data-type="name">${quiz.name}</h3>
                        <div class="hidden" data-id="${quiz.id}" data-type="edit-container">
                            <input type="text" value="${quiz.name}" class="bg-gray-800 text-white p-1 rounded-md text-sm">
                            <button data-id="${quiz.id}" class="save-name-btn text-sm text-green-400 hover:text-green-300 ml-2">Save</button>
                        </div>
                        <button data-id="${quiz.id}" class="rename-btn text-sm text-blue-400 hover:text-blue-300">Rename</button>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">
                        ${isFinished ? 'Finished! (Click to review)' : `Progress: ${progress} / ${totalQuestions} questions`}
                        (Score: ${quiz.score})
                    </p>
                    <div class="flex space-x-2">
                        <button data-id="${quiz.id}" class="continue-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                            ${isFinished ? 'Review' : 'Continue'}
                        </button>
                        <button data-id="${quiz.id}" class="delete-btn bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium">Delete</button>
                    </div>
                `;
                activeQuizList.appendChild(quizItem);
            });

            // Add event listeners to the new buttons
            activeQuizList.querySelectorAll('.continue-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const quizId = e.target.dataset.id;
                    const quiz = appState.activeQuizzes.find(q => q.id === quizId);
                    const answeredCount = quiz.userAnswers.filter(a => a !== null).length;
                    const isFinished = answeredCount === quiz.quizData.length;
                    
                    if (isFinished) {
                        currentQuizId = quizId;
                        showResults();
                    } else {
                        startQuiz(quizId);
                    }
                });
            });
            activeQuizList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    deleteQuiz(e.target.dataset.id);
                    renderQuizList(); // Re-render after deletion
                });
            });
            activeQuizList.querySelectorAll('.rename-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const quizId = e.target.dataset.id;
                    const item = e.target.closest('.bg-gray-700');
                    item.querySelector(`[data-type="name"]`).classList.add('hidden');
                    item.querySelector(`[data-type="edit-container"]`).classList.remove('hidden');
                    e.target.classList.add('hidden');
                });
            });
            activeQuizList.querySelectorAll('.save-name-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const quizId = e.target.dataset.id;
                    const item = e.target.closest('.bg-gray-700');
                    const input = item.querySelector('input[type="text"]');
                    renameQuiz(quizId, input.value);
                });
            });
        }
    }
    
    // --- SCREEN 2: SETUP LOGIC ---

    function switchSetupTab(tab) {
        currentLoadTab = tab;
        if (tab === 'json') {
            tabBtnJson.classList.add('text-white', 'border-blue-500');
            tabBtnJson.classList.remove('text-gray-400', 'border-transparent');
            tabBtnText.classList.add('text-gray-400', 'border-transparent');
            tabBtnText.classList.remove('text-white', 'border-blue-500');
            
            tabContentJson.classList.remove('hidden');
            tabContentText.classList.add('hidden');
        } else {
            tabBtnText.classList.add('text-white', 'border-blue-500');
            tabBtnText.classList.remove('text-gray-400', 'border-transparent');
            tabBtnJson.classList.add('text-gray-400', 'border-transparent');
            tabBtnJson.classList.remove('text-white', 'border-blue-500');

            tabContentText.classList.remove('hidden');
            tabContentJson.classList.add('hidden');
        }
    }
    
    tabBtnJson.addEventListener('click', () => switchSetupTab('json'));
    tabBtnText.addEventListener('click', () => switchSetupTab('text'));
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            jsonTextInput.value = '';
            simpleTextInput.value = '';
        }
    });

    loadQuizBtn.addEventListener('click', async () => {
        loadQuizBtn.disabled = true;
        loadQuizBtn.textContent = 'Loading...';
        
        await new Promise(res => setTimeout(res, 50)); 

        let quizName = "Pasted Quiz";
        let quizData = null;

        try {
            if (currentLoadTab === 'json') {
                const file = fileInput.files[0];
                const pastedText = jsonTextInput.value;

                if (file) {
                    quizName = file.name.replace(/\.json$|\.txt$/i, '');
                    const fileText = await file.text();
                    quizData = JSON.parse(fileText);
                } else if (pastedText) {
                    quizName = `Pasted JSON Quiz (${new Date().toLocaleDateString()})`;
                    quizData = JSON.parse(pastedText);
                } else {
                    throw new Error('Please paste JSON data or upload a file.');
                }
            } else { // 'text' tab
                const simpleText = simpleTextInput.value;
                if (!simpleText) {
                    throw new Error('Please paste your simple text data.');
                }
                quizName = `Pasted Text Quiz (${new Date().toLocaleDateString()})`;
                quizData = parseSimpleText(simpleText);
            }

            if (validateQuizData(quizData)) {
                const newQuiz = {
                    id: generateId(),
                    name: quizName,
                    quizData: quizData,
                    currentQuestionIndex: 0,
                    score: 0,
                    userAnswers: new Array(quizData.length).fill(null),
                    visited: new Array(quizData.length).fill(false),
                    reviewingSkipped: false
                };
                
                appState.activeQuizzes.push(newQuiz);
                saveStateToStorage();
                
                resetSetupForm();
                startQuiz(newQuiz.id);

            } else {
                throw new Error('Invalid quiz data structure.');
            }
        } catch (error) {
            showSetupError(error.message);
        } finally {
            loadQuizBtn.disabled = false;
            loadQuizBtn.textContent = 'Load and Start Quiz';
        }
    });

    function resetSetupForm() {
        jsonTextInput.value = '';
        simpleTextInput.value = '';
        fileInput.value = null;
        fileNameDisplay.textContent = 'No file chosen';
        setupError.classList.add('hidden');
    }

    function parseSimpleText(text) {
        const questionBlocks = text.trim().split(/\n\s*\n/);
        const quizData = [];

        for (const block of questionBlocks) {
            const lines = block.trim().split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) continue;

            const questionText = lines[0].trim();
            const options = [];
            let correctAnswerIndex = -1;

            for (let i = 1; i < lines.length; i++) {
                let optionText = lines[i].trim();
                if (optionText.startsWith('*')) {
                    optionText = optionText.substring(1).trim();
                    correctAnswerIndex = options.length;
                }
                options.push(optionText);
            }

            if (questionText && options.length > 1 && correctAnswerIndex !== -1) {
                quizData.push({
                    questionText,
                    options,
                    correctAnswerIndex
                });
            }
        }

        if (quizData.length === 0) {
            throw new Error('Could not parse any valid questions. Check the format.');
        }
        return quizData;
    }
    
    function showSetupError(message) {
        setupError.textContent = message;
        setupError.classList.remove('hidden');
    }

    function validateQuizData(data) {
        if (!Array.isArray(data) || data.length === 0) return false;
        const firstQuestion = data[0];
        return firstQuestion.hasOwnProperty('questionText') &&
               firstQuestion.hasOwnProperty('options') &&
               Array.isArray(firstQuestion.options) &&
               firstQuestion.hasOwnProperty('correctAnswerIndex') &&
               typeof firstQuestion.correctAnswerIndex === 'number';
    }


    // --- SCREEN 3: QUIZ LOGIC ---

    function startQuiz(quizId) {
        const quiz = appState.activeQuizzes.find(q => q.id === quizId);
        if (!quiz) {
            console.error("Quiz not found!");
            showScreen('list');
            return;
        }
        
        currentQuizId = quizId;
        
        quizTitle.textContent = quiz.name;
        quizTitle.title = quiz.name;
        totalQuestions.textContent = quiz.quizData.length;
        
        showScreen('quiz');
        displayQuestion();
    }

    function updateProgressBar() {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        const answeredCount = quiz.userAnswers.filter(a => a !== null).length;
        const percent = (answeredCount / quiz.quizData.length) * 100;
        progressBar.style.width = `${percent}%`;
    }

    function displayQuestion() {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        
        quiz.visited[quiz.currentQuestionIndex] = true;
        
        const question = quiz.quizData[quiz.currentQuestionIndex];
        
        updateProgressBar();
        
        questionText.textContent = question.questionText;
        questionCounter.textContent = quiz.currentQuestionIndex + 1;
        currentScore.textContent = quiz.score;
        
        optionsContainer.innerHTML = '';
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'text-center text-lg font-semibold min-h-[30px] mb-4';

        quizContainer.classList.remove('shake', 'pop');
        
        if (quiz.reviewingSkipped) {
            skippedModeBanner.classList.remove('hidden');
        } else {
            skippedModeBanner.classList.add('hidden');
        }

        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.dataset.index = index;
            button.className = "w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500";
            button.addEventListener('click', handleOptionClick);
            optionsContainer.appendChild(button);
        });
        
        // --- THIS IS THE UPDATED LOGIC ---
        skipQuestionBtn.textContent = 'Skip'; // Always show "Skip"
        
        const existingAnswer = quiz.userAnswers[quiz.currentQuestionIndex];
        if (existingAnswer !== null) {
            showFeedback(existingAnswer, false);
            skipQuestionBtn.classList.add('hidden'); // HIDE if answered
        } else {
            nextQuestionBtn.classList.add('hidden');
            skipQuestionBtn.classList.remove('hidden'); // SHOW if not answered
            skipQuestionBtn.disabled = false; 
            Array.from(optionsContainer.children).forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-70');
            });
        }
        // --- END OF UPDATED LOGIC ---
        
        prevQuestionBtn.disabled = quiz.currentQuestionIndex === 0;
    }

    function handleOptionClick(e) {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        const { currentQuestionIndex, quizData } = quiz;
        const question = quizData[currentQuestionIndex];
        const correctIndex = question.correctAnswerIndex;
        
        const selectedButton = e.target;
        const selectedIndex = parseInt(selectedButton.dataset.index);

        const oldAnswerIndex = quiz.userAnswers[currentQuestionIndex];
        const wasCorrect = (oldAnswerIndex !== null) && (oldAnswerIndex === correctIndex);
        const isCorrect = (selectedIndex === correctIndex);

        if (!wasCorrect && isCorrect) {
            quiz.score++;
        } else if (wasCorrect && !isCorrect) {
            quiz.score--;
        }

        quiz.userAnswers[currentQuestionIndex] = selectedIndex;
        currentScore.textContent = quiz.score;

        showFeedback(selectedIndex, true);
        
        updateQuizProgress();
    }
    
    function showFeedback(selectedIndex, withAnimation) {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        const { currentQuestionIndex, quizData } = quiz;
        const question = quizData[currentQuestionIndex];
        const correctIndex = question.correctAnswerIndex;
        
        Array.from(optionsContainer.children).forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-70');
            btn.classList.remove('hover:bg-gray-600');
        });

        if (selectedIndex === correctIndex) {
            feedbackMessage.textContent = 'Correct!';
            feedbackMessage.className = 'text-center text-lg font-semibold min-h-[30px] mb-4 text-green-400';
            optionsContainer.querySelector(`[data-index="${selectedIndex}"]`).classList.add('!bg-green-600', 'text-white');
            if (withAnimation) quizContainer.classList.add('pop');
        } else {
            feedbackMessage.textContent = `Wrong! The correct answer was: ${question.options[correctIndex]}`;
            feedbackMessage.className = 'text-center text-lg font-semibold min-h-[30px] mb-4 text-red-400';
            optionsContainer.querySelector(`[data-index="${selectedIndex}"]`).classList.add('!bg-red-600', 'text-white');
            optionsContainer.querySelector(`[data-index="${correctIndex}"]`).classList.add('!bg-green-600', 'text-white');
            if (withAnimation) quizContainer.classList.add('shake');
        }
        
        skipQuestionBtn.classList.add('hidden'); 
        nextQuestionBtn.classList.remove('hidden');
    }
    
    function goToNextQuestion() {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);

        if (quiz.reviewingSkipped) {
            // Find the *next* null answer *after* the current one
            let nextSkippedIndex = quiz.userAnswers.indexOf(null, quiz.currentQuestionIndex + 1);
            
            if (nextSkippedIndex === -1) {
                // Didn't find one after. Check *before* (loop around).
                nextSkippedIndex = quiz.userAnswers.indexOf(null);
            }

            if (nextSkippedIndex !== -1 && nextSkippedIndex !== quiz.currentQuestionIndex) {
                quiz.currentQuestionIndex = nextSkippedIndex;
            } else {
                // All skips are done! (or we are on the last skipped question)
                // Double check if any *other* nulls exist
                const allSkipped = quiz.userAnswers.filter(a => a === null).length;
                if (allSkipped === 0) {
                    updateQuizProgress();
                    showResults();
                    return;
                } else {
                    // This can happen if you skip the *last* skipped question.
                    // Just stay on the current question. We'll find it again.
                    // To prevent an infinite loop, check if we're done.
                    quiz.currentQuestionIndex = nextSkippedIndex; // Go to the one we found
                }
            }
        } else {
            quiz.currentQuestionIndex++;
            
            if (quiz.currentQuestionIndex >= quiz.quizData.length) {
                const firstSkippedIndex = quiz.userAnswers.indexOf(null);
                if (firstSkippedIndex !== -1) {
                    quiz.reviewingSkipped = true;
                    quiz.currentQuestionIndex = firstSkippedIndex;
                } else {
                    updateQuizProgress();
                    showResults();
                    return;
                }
            }
        }
        
        updateQuizProgress();
        displayQuestion();
    }

    nextQuestionBtn.addEventListener('click', goToNextQuestion);
    
    prevQuestionBtn.addEventListener('click', () => {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        if (quiz.currentQuestionIndex > 0) {
            quiz.currentQuestionIndex--;
            updateQuizProgress();
            displayQuestion();
        }
    });
    
    // --- THIS IS THE UPDATED LISTENER ---
    skipQuestionBtn.addEventListener('click', () => {
        // Since the button is disabled when an answer is selected,
        // we don't need to check for an existing answer or update the score.
        // We just move to the next question, leaving the current one as 'null'.
        goToNextQuestion();
    });
    // --- END OF UPDATED LISTENER ---

    // --- SCREEN 4: RESULTS LOGIC ---
    
    function showResults() {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        if (!quiz) {
            renderQuizList();
            showScreen('list');
            return;
        }
        
        quiz.reviewingSkipped = false; // Reset for next time
        updateQuizProgress();
        
        const { score, quizData } = quiz;
        showScreen('results');
        
        scoreText.textContent = `${score} / ${quizData.length}`;
        const percentage = (score / quizData.length);
        if (percentage < 0.5) {
            scoreText.className = 'text-6xl font-extrabold text-red-400 mb-8';
        } else if (percentage < 0.8) {
            scoreText.className = 'text-6xl font-extrabold text-yellow-400 mb-8';
        } else {
            scoreText.className = 'text-6xl font-extrabold text-green-400 mb-8';
        }
    }
    
    // --- SCREEN 5: REVIEW LOGIC ---
    
    function renderReviewList() {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        if (!quiz) {
            showScreen('list');
            return;
        }
        
        reviewList.innerHTML = '';
        
        quiz.quizData.forEach((question, index) => {
            const userAnswerIndex = quiz.userAnswers[index];
            const correctIndex = question.correctAnswerIndex;
            
            let optionsHTML = '';
            question.options.forEach((option, optIndex) => {
                let optionClass = 'bg-gray-700';
                let indicator = '';

                if (optIndex === correctIndex) {
                    optionClass = 'bg-green-800 border-green-500';
                    indicator = '<span class="text-green-400 ml-2">(Correct)</span>';
                }
                
                if (optIndex === userAnswerIndex && userAnswerIndex !== correctIndex) {
                    optionClass = 'bg-red-800 border-red-500';
                    indicator = '<span class="text-red-400 ml-2">(Your Answer)</span>';
                } else if (optIndex === userAnswerIndex && userAnswerIndex === correctIndex) {
                    indicator = '<span class="text-green-400 ml-2">(Your Answer)</span>';
                }
                
                optionsHTML += `<li class="${optionClass} p-3 rounded-md border-l-4">${option}${indicator}</li>`;
            });
            
            if (userAnswerIndex === null) {
                 optionsHTML += `<li class="bg-yellow-800 border-l-4 border-yellow-500 text-yellow-300 p-3 rounded-md">You skipped this question.</li>`;
            }

            const reviewItem = document.createElement('div');
            reviewItem.className = 'bg-gray-900 p-4 rounded-lg';
            reviewItem.innerHTML = `
                <h3 class="font-semibold text-lg text-white mb-3">
                    ${index + 1}. ${question.questionText}
                </h3>
                <ul class="space-y-2 text-sm">
                    ${optionsHTML}
                </ul>
            `;
            reviewList.appendChild(reviewItem);
        });
        
        showScreen('review');
    }

    // --- TOC MODAL LOGIC ---

    function renderTocModal() {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        tocGrid.innerHTML = ''; // Clear old grid

        quiz.quizData.forEach((question, index) => {
            const button = document.createElement('button');
            button.textContent = index + 1;
            button.dataset.index = index;
            button.className = 'toc-btn';

            // Apply status styles
            const userAnswer = quiz.userAnswers[index];
            const isVisited = quiz.visited[index];
            
            if (userAnswer !== null) {
                // Answered
                if (userAnswer === question.correctAnswerIndex) {
                    button.classList.add('bg-green-600', 'text-white'); // Correct
                } else {
                    button.classList.add('bg-red-600', 'text-white'); // Wrong
                }
            } else if (isVisited) {
                // Skipped (visited but no answer)
                button.classList.add('bg-yellow-600', 'text-white');
            } else {
                // Not Visited
                button.classList.add('bg-gray-600', 'text-gray-200');
            }
            
            // Highlight current question
            if (index === quiz.currentQuestionIndex) {
                button.classList.add('ring-4', 'ring-blue-400');
            }
            
            button.addEventListener('click', () => jumpToQuestion(index));
            tocGrid.appendChild(button);
        });

        tocModalContainer.classList.remove('hidden');
    }

    function hideTocModal() {
        tocModalContainer.classList.add('hidden');
    }

    function jumpToQuestion(index) {
        const quiz = appState.activeQuizzes.find(q => q.id === currentQuizId);
        quiz.currentQuestionIndex = index;
        updateQuizProgress();
        displayQuestion();
        hideTocModal();
    }
    
    // --- INITIALIZATION & NAVIGATION LISTENERS ---

    loadNewQuizBtn.addEventListener('click', () => showScreen('setup'));
    backToListBtn.addEventListener('click', () => showScreen('list'));
    
    quizBackToListBtn.addEventListener('click', () => {
        updateQuizProgress();
        renderQuizList();
        showScreen('list');
    });
    
    resultsBackToListBtn.addEventListener('click', () => {
        deleteQuiz(currentQuizId);
        currentQuizId = null;
        renderQuizList();
        showScreen('list');
    });
    
    reviewAnswersBtn.addEventListener('click', renderReviewList);
    reviewBackToResultsBtn.addEventListener('click', () => showScreen('results'));

    // TOC Listeners
    showTocBtn.addEventListener('click', renderTocModal);
    closeTocBtn.addEventListener('click', hideTocModal);
    // Close modal by clicking overlay
    tocModalContainer.addEventListener('click', (e) => {
        if (e.target === tocModalContainer) {
            hideTocModal();
        }
    });

    /**
     * Main app initialization function
     */
    function initializeApp() {
        loadStateFromStorage();
        renderQuizList();
        showScreen('list'); // Start on the home screen
    }

    // Start the app!
    initializeApp();
});