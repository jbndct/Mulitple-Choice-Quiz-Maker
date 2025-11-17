const firebaseConfig = {
  apiKey: "AIzaSyDk9qs4OlzUKlPKB2TZvRJqqAeeApeHgtc",
  authDomain: "quiz-manager-e39be.firebaseapp.com",
  projectId: "quiz-manager-e39be",
  storageBucket: "quiz-manager-e39be.firebasestorage.app",
  messagingSenderId: "739408414646",
  appId: "1:739408414646:web:0be12679191aad40d2e317",
  measurementId: "G-R80HWKGNL6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create a reference to the Firestore database
const db = firebase.firestore();
// Create a reference to our "quizzes" collection
const quizCollection = db.collection('quizzes');


document.addEventListener('DOMContentLoaded', () => {

    // --- STATE VARIABLES ---
    const STORAGE_KEY = 'quizManagerStorage_v2'; // Upped version for new structure
    
    // appState now holds local quizzes AND progress for all quizzes
    let appState = {
        localQuizzes: [], // Stores full quiz definitions { id, name, quizData }
        quizProgress: []  // Stores progress { id, currentQuestionIndex, ... }
    };
    
    // This map will store the public quiz definitions
    // fetched from Firebase, so we don't have to re-fetch them.
    let publicQuizMap = new Map();
    
    let currentQuizId = null; // Can be a local ID ('local_...') or Firebase ID
    let currentLoadTab = 'json'; // 'json' or 'text'
    let currentExtractTab = 'json'; // 'json' or 'text'
    let isAdmin = false; // Flag for admin delete privileges
    
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
    const activeQuizList = document.getElementById('active-quiz-list'); // Local quizzes
    const noQuizzesMessage = document.getElementById('no-quizzes-message');
    const publicQuizList = document.getElementById('public-quiz-list'); // Public quizzes
    const noPublicQuizzesMessage = document.getElementById('no-public-quizzes-message');
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
    // *** NEW ELEMENT REFERENCE ***
    const publicCheckbox = document.getElementById('public-checkbox');
    const quizNameInput = document.getElementById('quiz-name-input');

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

    // Extract Modal Elements
    const extractModalContainer = document.getElementById('extract-modal-container');
    const closeExtractBtn = document.getElementById('close-extract-btn');
    const extractQuizName = document.getElementById('extract-quiz-name');
    const extractTabBtnJson = document.getElementById('extract-tab-btn-json');
    const extractTabBtnText = document.getElementById('extract-tab-btn-text');
    const extractTabContentJson = document.getElementById('extract-tab-content-json');
    const extractTabContentText = document.getElementById('extract-tab-content-text');
    const extractJsonTextarea = document.getElementById('extract-json-textarea');
    const extractTextTextarea = document.getElementById('extract-text-textarea');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    
    // --- STORAGE FUNCTIONS ---
    // Save/load the entire appState (local quizzes + all progress)

    function loadStateFromStorage() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            appState = JSON.parse(storedData);
            
            // Migrate from old structure if necessary
            if (appState.activeQuizzes) {
                appState.quizProgress = appState.activeQuizzes;
                delete appState.activeQuizzes;
            }

            // Ensure new structure is initialized
            if (!appState.localQuizzes) {
                appState.localQuizzes = [];
            }
            if (!appState.quizProgress) {
                appState.quizProgress = [];
            }
        } else {
            appState = { localQuizzes: [], quizProgress: [] };
        }
    }

    function saveStateToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }
    
    // Saves progress for the *current* quiz
    function updateQuizProgress() {
        saveStateToStorage();
    }

    // Deletes only the *progress* for a quiz
    function deleteQuizProgress(quizId) {
        appState.quizProgress = appState.quizProgress.filter(q => q.id !== quizId);
        saveStateToStorage();
    }

    // --- NEW: Functions to manage local quiz definitions ---
    function saveLocalQuiz(quizDefinition) {
        appState.localQuizzes.push(quizDefinition);
        saveStateToStorage();
    }

    function deleteLocalQuiz(quizId) {
        // Delete the quiz definition
        appState.localQuizzes = appState.localQuizzes.filter(q => q.id !== quizId);
        // Also delete its progress
        deleteQuizProgress(quizId);
        // saveStateToStorage() is called by deleteQuizProgress
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
    
    // --- Render *Local* Quizzes ---
    function renderLocalQuizzes() {
        activeQuizList.innerHTML = ''; // Clear local list
        const localQuizzes = appState.localQuizzes;

        if (localQuizzes.length === 0) {
            noQuizzesMessage.classList.remove('hidden'); // Show "You have no active quizzes"
        } else {
            noQuizzesMessage.classList.add('hidden');
            
            localQuizzes.forEach(localQuiz => {
                const quizItem = document.createElement('div');
                quizItem.className = 'bg-gray-800 p-4 rounded-lg shadow-lg ring-1 ring-gray-700/50';
                
                const totalQuestions = localQuiz.quizData.length;
                
                // Check if we have local progress for this quiz
                const localProgress = appState.quizProgress.find(q => q.id === localQuiz.id);
                
                let progressText = '';
                let buttonText = 'Start';
                let buttonIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
                let isFinished = false;

                if (localProgress) {
                    const answeredCount = localProgress.userAnswers.filter(a => a !== null).length;
                    isFinished = answeredCount === totalQuestions;
                    
                    if (isFinished) {
                        progressText = `Finished! (Score: ${localProgress.score})`;
                        buttonText = 'Review';
                        buttonIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>';
                    } else {
                        progressText = `Progress: ${localProgress.currentQuestionIndex} / ${totalQuestions} (Score: ${localProgress.score})`;
                        buttonText = 'Continue';
                    }
                } else {
                    progressText = `Not started (${totalQuestions} questions)`;
                }

                // Local quiz gets a FULL delete button
                quizItem.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-semibold text-lg text-white" data-id="${localQuiz.id}" data-type="name">${localQuiz.name}</h3>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">
                        ${progressText}
                    </p>
                    <div class="flex space-x-2">
                        <button data-id="${localQuiz.id}" class="continue-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                            ${buttonIcon}<span>${buttonText}</span>
                        </button>
                        <button data-id="${localQuiz.id}" class="extract-btn bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
                            </svg>
                            <span>Extract</span>
                        </button>
                        <button data-id="${localQuiz.id}" class="delete-local-btn bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete Quiz</span>
                        </button>
                    </div>
                `;
                activeQuizList.appendChild(quizItem);
            });

            // Add event listeners to local quiz buttons
            activeQuizList.querySelectorAll('.continue-btn').forEach(btn => {
                btn.addEventListener('click', (e) => startQuiz(e.currentTarget.dataset.id));
            });
            activeQuizList.querySelectorAll('.delete-local-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (confirm('Are you sure you want to permanently delete this local quiz?')) {
                        deleteLocalQuiz(e.currentTarget.dataset.id);
                        renderLocalQuizzes(); // Re-render local list
                    }
                });
            });
            activeQuizList.querySelectorAll('.extract-btn').forEach(btn => {
                btn.addEventListener('click', (e) => showExtractModal(e.currentTarget.dataset.id));
            });
        }
    }

    // --- Load Public Quizzes from Firebase ---
    async function fetchAndRenderPublicQuizzes() {
        publicQuizList.innerHTML = '<p class="text-gray-400">Loading public quizzes...</p>';
        noPublicQuizzesMessage.classList.add('hidden');
        
        publicQuizMap.clear(); // Clear the cache
        let publicQuizzes = [];
        
        try {
            const snapshot = await quizCollection.get();
            if (snapshot.empty) {
                noPublicQuizzesMessage.classList.remove('hidden');
                publicQuizList.innerHTML = '';
                return;
            }
            
            snapshot.forEach(doc => {
                const quizData = doc.data();
                if (quizData.name && quizData.quizData) {
                    publicQuizzes.push({
                        id: doc.id,
                        name: quizData.name,
                        quizData: quizData.quizData
                    });
                    publicQuizMap.set(doc.id, {
                        id: doc.id,
                        name: quizData.name,
                        quizData: quizData.quizData
                    });
                }
            });
            
            renderPublicQuizList(publicQuizzes); // Pass to new render function
            
        } catch (error) {
            console.error("Error loading public quizzes:", error);
            publicQuizList.innerHTML = '<p class="text-red-400">Error loading public quizzes. Check console.</p>';
            noPublicQuizzesMessage.classList.remove('hidden');
        }
    }

    // --- Render *Public* Quiz List ---
    function renderPublicQuizList(publicQuizzes) {
        publicQuizList.innerHTML = ''; // Clear existing list
        
        if (publicQuizzes.length === 0) {
            noPublicQuizzesMessage.classList.remove('hidden');
        } else {
            noPublicQuizzesMessage.classList.add('hidden');
            
            publicQuizzes.forEach(publicQuiz => {
                const quizItem = document.createElement('div');
                quizItem.className = 'bg-gray-800 p-4 rounded-lg shadow-lg ring-1 ring-gray-700/50';
                
                const totalQuestions = publicQuiz.quizData.length;
                const localProgress = appState.quizProgress.find(q => q.id === publicQuiz.id);
                
                let progressText = '';
                let buttonText = 'Start';
                let buttonIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
                let isFinished = false;

                if (localProgress) {
                    const answeredCount = localProgress.userAnswers.filter(a => a !== null).length;
                    isFinished = answeredCount === totalQuestions;
                    
                    if (isFinished) {
                        progressText = `Finished! (Score: ${localProgress.score})`;
                        buttonText = 'Review';
                        buttonIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round"d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>';
                    } else {
                        progressText = `Progress: ${localProgress.currentQuestionIndex} / ${totalQuestions} (Score: ${localProgress.score})`;
                        buttonText = 'Continue';
                    }
                } else {
                    progressText = `Not started (${totalQuestions} questions)`;
                }

                // --- Admin Delete Button ---
                const adminDeleteButton = `
                    <button data-id="${publicQuiz.id}" class="delete-public-btn bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>ADMIN DELETE</span>
                    </button>
                `;

                quizItem.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-semibold text-lg text-white" data-id="${publicQuiz.id}" data-type="name">${publicQuiz.name}</h3>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">
                        ${progressText}
                    </p>
                    <div class="flex space-x-2">
                        <button data-id="${publicQuiz.id}" class="continue-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                            ${buttonIcon}<span>${buttonText}</span>
                        </button>
                        <button data-id="${publicQuiz.id}" class="extract-btn bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
                            </svg>
                            <span>Extract</span>
                        </button>
                        <button data-id="${publicQuiz.id}" class="delete-progress-btn bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 ${!localProgress ? 'hidden' : ''}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete Progress</span>
                        </button>
                        ${isAdmin ? adminDeleteButton : ''} 
                    </div>
                `;
                publicQuizList.appendChild(quizItem);
            });

            // Add event listeners to public quiz buttons
            publicQuizList.querySelectorAll('.continue-btn').forEach(btn => {
                btn.addEventListener('click', (e) => startQuiz(e.currentTarget.dataset.id));
            });
            publicQuizList.querySelectorAll('.delete-progress-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    deleteQuizProgress(e.currentTarget.dataset.id);
                    fetchAndRenderPublicQuizzes(); // Re-render public list
                });
            });
            publicQuizList.querySelectorAll('.extract-btn').forEach(btn => {
                btn.addEventListener('click', (e) => showExtractModal(e.currentTarget.dataset.id));
            });

            // --- Admin Delete Listener ---
            if (isAdmin) {
                publicQuizList.querySelectorAll('.delete-public-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const quizId = e.currentTarget.dataset.id;
                        if (confirm(`ADMIN: Are you sure you want to permanently delete this PUBLIC quiz (${quizId}) from Firebase? This cannot be undone.`)) {
                            try {
                                btn.textContent = 'Deleting...';
                                btn.disabled = true;
                                await quizCollection.doc(quizId).delete();
                                console.log("Admin deleted quiz:", quizId);
                                deleteQuizProgress(quizId); // Also delete local progress
                                fetchAndRenderPublicQuizzes(); // Refresh list
                            } catch (error) {
                                console.error("Error admin-deleting quiz:", error);
                                alert("Error deleting quiz. Check console.");
                                btn.textContent = 'ADMIN DELETE';
                                btn.disabled = false;
                            }
                        }
                    });
                });
            }
        }
    }
    
    // --- SCREEN 2: SETUP LOGIC ---

    function switchSetupTab(tab) {
        // (Unchanged)
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
        // (Unchanged)
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            jsonTextInput.value = '';
            simpleTextInput.value = '';
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    });

    // --- *** MODIFIED: loadQuizBtn (Now saves LOCALLY or PUBLICLY) *** ---
    loadQuizBtn.addEventListener('click', async () => {
        loadQuizBtn.disabled = true;
        
        // --- NEW: Checkbox logic ---
        const isPublic = publicCheckbox.checked;
        loadQuizBtn.textContent = isPublic ? 'Saving to Public Library...' : 'Saving locally...';
        // ---

        let quizName = ""; // Declared here
        let quizData = null;

        try {
            // --- NEW: Get Quiz Name from input ---
            quizName = quizNameInput.value.trim();
            if (!quizName) {
                throw new Error('Please enter a name for your quiz.');
            }
            // ---

            if (currentLoadTab === 'json') {
                const file = fileInput.files[0];
                const pastedText = jsonTextInput.value;

                if (file) {
                    const fileText = await file.text();
                    quizData = JSON.parse(fileText);
                } else if (pastedText) {
                    quizData = JSON.parse(pastedText);
                } else {
                    throw new Error('Please paste JSON data or upload a file.');
                }
            } else { // 'text' tab
                const simpleText = simpleTextInput.value;
                if (!simpleText) {
                    throw new Error('Please paste your simple text data.');
                }
                quizData = parseSimpleText(simpleText);
            }

            if (validateQuizData(quizData)) {
                
                let newQuizId;
                
                // --- NEW: Conditional Save ---
                if (isPublic) {
                    // Save to Firebase
                    const newPublicQuiz = {
                        name: quizName,
                        quizData: quizData
                    };
                    const docRef = await quizCollection.add(newPublicQuiz);
                    newQuizId = docRef.id; // Use the ID from Firebase
                    console.log("Quiz saved to Firebase with ID:", newQuizId);
                } else {
                    // Save Locally
                    newQuizId = `local_${Date.now()}`;
                    const newLocalQuiz = {
                        id: newQuizId,
                        name: quizName,
                        quizData: quizData
                    };
                    saveLocalQuiz(newLocalQuiz); // Saves to appState.localQuizzes
                }
                // ---
                
                // Create the local progress (for *both* types)
                const newQuizProgress = {
                    id: newQuizId, // Use the new ID (local or public)
                    currentQuestionIndex: 0,
                    score: 0,
                    userAnswers: new Array(quizData.length).fill(null),
                    visited: new Array(quizData.length).fill(false),
                    reviewingSkipped: false
                };
                
                appState.quizProgress.push(newQuizProgress);
                saveStateToStorage();
                
                resetSetupForm();
                startQuiz(newQuizId); // Start the quiz

            } else {
                throw new Error('Invalid quiz data structure.');
            }
        } catch (error) {
            showSetupError(error.message);
        } finally {
            loadQuizBtn.disabled = false;
            loadQuizBtn.textContent = 'Create Quiz'; // Reset button text
        }
    });
    // --- *** MODIFIED: resetSetupForm (resets checkbox and new name input) *** ---
    function resetSetupForm() {
        jsonTextInput.value = '';
        simpleTextInput.value = '';
        fileInput.value = null;
        fileNameDisplay.textContent = 'No file chosen';
        setupError.classList.add('hidden');
        publicCheckbox.checked = false; // Reset the checkbox
        quizNameInput.value = ''; // *** NEW: Reset the name input ***
    }

    function parseSimpleText(text) {
        // (Unchanged)
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
        // (Unchanged)
        setupError.textContent = message;
        setupError.classList.remove('hidden');
    }

    function validateQuizData(data) {
        // (Unchanged)
        if (!Array.isArray(data) || data.length === 0) return false;
        const firstQuestion = data[0];
        return firstQuestion.hasOwnProperty('questionText') &&
               firstQuestion.hasOwnProperty('options') &&
               Array.isArray(firstQuestion.options) &&
               firstQuestion.hasOwnProperty('correctAnswerIndex') &&
               typeof firstQuestion.correctAnswerIndex === 'number';
    }


    // --- SCREEN 3: QUIZ LOGIC ---

    // --- MODIFIED: startQuiz (Handles local and public IDs) ---
    async function startQuiz(quizId) {
        let quizDefinition = null;

        // Step 1: Get the Quiz Definition
        if (quizId.startsWith('local_')) {
            // It's a local quiz
            quizDefinition = appState.localQuizzes.find(q => q.id === quizId);
        } else {
            // It's a public (Firebase) quiz
            quizDefinition = publicQuizMap.get(quizId);
            if (!quizDefinition) {
                try {
                    const doc = await quizCollection.doc(quizId).get();
                    if (doc.exists) {
                        quizDefinition = { id: doc.id, ...doc.data() };
                        publicQuizMap.set(quizId, quizDefinition);
                    } else {
                        console.error("No public quiz found with that ID!");
                        // Progress is orphaned. Delete it.
                        deleteQuizProgress(quizId);
                        renderLocalQuizzes();
                        fetchAndRenderPublicQuizzes();
                        showScreen('list');
                        return;
                    }
                } catch (err) {
                    console.error("Error fetching quiz definition:", err);
                    showScreen('list');
                    return;
                }
            }
        }

        if (!quizDefinition) {
             console.error("Could not find quiz definition for ID:", quizId);
             showScreen('list');
             return;
        }

        // Step 2: Find or create the Local Progress
        let quizProgress = appState.quizProgress.find(q => q.id === quizId);
        
        if (!quizProgress) {
            // User hasn't started this quiz. Create a new progress object.
            quizProgress = {
                id: quizId,
                currentQuestionIndex: 0,
                score: 0,
                userAnswers: new Array(quizDefinition.quizData.length).fill(null),
                visited: new Array(quizDefinition.quizData.length).fill(false),
                reviewingSkipped: false
            };
            appState.quizProgress.push(quizProgress);
            saveStateToStorage();
        }
        
        // Step 3: Check if this quiz is finished
        const answeredCount = quizProgress.userAnswers.filter(a => a !== null).length;
        const isFinished = answeredCount === quizDefinition.quizData.length;
        
        if (isFinished) {
            currentQuizId = quizId;
            showResults();
            return;
        }

        // Step 4: Show the quiz screen
        currentQuizId = quizId;
        
        quizTitle.textContent = quizDefinition.name;
        quizTitle.title = quizDefinition.name;
        totalQuestions.textContent = quizDefinition.quizData.length;
        
        showScreen('quiz');
        displayQuestion();
    }

    // --- MODIFIED: Helper function to get the current quiz ---
    function getCurrentQuiz() {
        if (!currentQuizId) return null;
        
        const progress = appState.quizProgress.find(q => q.id === currentQuizId);
        let definition = null;

        if (currentQuizId.startsWith('local_')) {
            definition = appState.localQuizzes.find(q => q.id === currentQuizId);
        } else {
            definition = publicQuizMap.get(currentQuizId);
        }
        
        if (!progress || !definition) {
            console.error("Could not find quiz state for ID:", currentQuizId);
            // This can happen if quiz was deleted from another tab or by admin
            return null;
        }
        
        return { progress, definition };
    }

    // --- MODIFIED: updateProgressBar (Uses new helper) ---
    function updateProgressBar() {
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        
        const answeredCount = quiz.progress.userAnswers.filter(a => a !== null).length;
        const percent = (answeredCount / quiz.definition.quizData.length) * 100;
        progressBar.style.width = `${percent}%`;
    }

    // --- MODIFIED: displayQuestion (Uses new helper) ---
    function displayQuestion() {
        const quiz = getCurrentQuiz();
        if (!quiz) {
            // Quiz data is missing (e.g., deleted), boot to list
            renderLocalQuizzes();
            fetchAndRenderPublicQuizzes();
            showScreen('list');
            return;
        }
        
        const { progress, definition } = quiz;
        
        // (rest of function is unchanged)
        
        if (progress.visited.length !== definition.quizData.length) {
            progress.visited = new Array(definition.quizData.length).fill(false);
            progress.userAnswers.forEach((a, i) => { 
                if (a !== null) progress.visited[i] = true;
            });
        }
        
        progress.visited[progress.currentQuestionIndex] = true;
        const question = definition.quizData[progress.currentQuestionIndex];
        updateProgressBar();
        questionText.textContent = question.questionText;
        questionCounter.textContent = progress.currentQuestionIndex + 1;
        currentScore.textContent = progress.score;
        optionsContainer.innerHTML = '';
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'text-center text-lg font-semibold min-h-[30px] mb-4';
        quizContainer.classList.remove('shake', 'pop');
        
        if (progress.reviewingSkipped) {
            skippedModeBanner.classList.remove('hidden');
        } else {
            skippedModeBanner.classList.add('hidden');
        }

        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = `${index + 1}. ${option}`;
            button.dataset.index = index;
            button.className = "w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md";
            button.addEventListener('click', handleOptionClick);
            optionsContainer.appendChild(button);
        });
        
        skipQuestionBtn.textContent = 'Skip';
        const existingAnswer = progress.userAnswers[progress.currentQuestionIndex];
        if (existingAnswer !== null) {
            showFeedback(existingAnswer, false);
            skipQuestionBtn.disabled = true;
        } else {
            nextQuestionBtn.classList.add('hidden');
            skipQuestionBtn.disabled = false;
            Array.from(optionsContainer.children).forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-70');
            });
        }
        prevQuestionBtn.disabled = progress.currentQuestionIndex === 0;
    }

    // --- MODIFIED: handleOptionClick (Uses new helper) ---
    function handleOptionClick(e) {
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        
        // (rest of function is unchanged)
        const { progress, definition } = quiz;
        const { currentQuestionIndex, quizData } = {
            currentQuestionIndex: progress.currentQuestionIndex,
            quizData: definition.quizData
        };
        const question = quizData[currentQuestionIndex];
        const correctIndex = question.correctAnswerIndex;
        const selectedButton = e.currentTarget;
        const selectedIndex = parseInt(selectedButton.dataset.index);
        const oldAnswerIndex = progress.userAnswers[currentQuestionIndex];
        const wasCorrect = (oldAnswerIndex !== null) && (oldAnswerIndex === correctIndex);
        const isCorrect = (selectedIndex === correctIndex);
        if (!wasCorrect && isCorrect) {
            progress.score++;
        } else if (wasCorrect && !isCorrect) {
            progress.score--;
        }
        progress.userAnswers[currentQuestionIndex] = selectedIndex;
        currentScore.textContent = progress.score;
        showFeedback(selectedIndex, true);
        updateQuizProgress();
    }
    
    // --- MODIFIED: showFeedback (Uses new helper) ---
    function showFeedback(selectedIndex, withAnimation) {
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        
        // (rest of function is unchanged)
        const { progress, definition } = quiz;
        const { currentQuestionIndex, quizData } = {
            currentQuestionIndex: progress.currentQuestionIndex,
            quizData: definition.quizData
        };
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
            optionsContainer.querySelector(`[data-index="${selectedIndex}"]`).classList.add('!bg-green-600', 'text-white', 'ring-2', 'ring-green-400');
            if (withAnimation) quizContainer.classList.add('pop');
        } else {
            feedbackMessage.textContent = `Wrong! The correct answer was: ${question.options[correctIndex]}`;
            feedbackMessage.className = 'text-center text-lg font-semibold min-h-[30px] mb-4 text-red-400';
            optionsContainer.querySelector(`[data-index="${selectedIndex}"]`).classList.add('!bg-red-600', 'text-white', 'ring-2', 'ring-red-400');
            optionsContainer.querySelector(`[data-index="${correctIndex}"]`).classList.add('!bg-green-600', 'text-white');
            if (withAnimation) quizContainer.classList.add('shake');
        }
        
        skipQuestionBtn.disabled = true;
        nextQuestionBtn.classList.remove('hidden');
    }
    
    // --- MODIFIED: goToNextQuestion (Uses new helper) ---
    function goToNextQuestion() {
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        
        // (rest of function is unchanged)
        const { progress, definition } = quiz;
        if (progress.reviewingSkipped) {
            let nextSkippedIndex = progress.userAnswers.indexOf(null, progress.currentQuestionIndex + 1);
            if (nextSkippedIndex === -1) {
                nextSkippedIndex = progress.userAnswers.indexOf(null);
            }
            if (nextSkippedIndex !== -1 && nextSkippedIndex !== progress.currentQuestionIndex) {
                progress.currentQuestionIndex = nextSkippedIndex;
            } else {
                const allSkipped = progress.userAnswers.filter(a => a === null).length;
                if (allSkipped === 0) {
                    updateQuizProgress();
                    showResults();
                    return;
                } else {
                    progress.currentQuestionIndex = nextSkippedIndex;
                }
            }
        } else {
            progress.currentQuestionIndex++;
            if (progress.currentQuestionIndex >= definition.quizData.length) {
                const firstSkippedIndex = progress.userAnswers.indexOf(null);
                if (firstSkippedIndex !== -1) {
                    progress.reviewingSkipped = true;
                    progress.currentQuestionIndex = firstSkippedIndex;
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
        // (Unchanged)
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        if (quiz.progress.currentQuestionIndex > 0) {
            quiz.progress.currentQuestionIndex--;
            updateQuizProgress();
            displayQuestion();
        }
    });
    
    skipQuestionBtn.addEventListener('click', () => {
        goToNextQuestion();
    });

    // --- SCREEN 4: RESULTS LOGIC ---
    
    // --- MODIFIED: showResults (Uses new helper) ---
    function showResults() {
        const quiz = getCurrentQuiz();
        if (!quiz) {
            renderLocalQuizzes();
            fetchAndRenderPublicQuizzes();
            showScreen('list');
            return;
        }
        
        // (rest of function is unchanged)
        const { progress, definition } = quiz;
        progress.reviewingSkipped = false;
        updateQuizProgress();
        const { score } = progress;
        const { quizData } = definition;
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
    
    // --- MODIFIED: renderReviewList (Uses new helper) ---
    function renderReviewList() {
        const quiz = getCurrentQuiz();
        if (!quiz) {
            showScreen('list');
            return;
        }

        // (rest of function is unchanged)
        const { progress, definition } = quiz;
        reviewList.innerHTML = '';
        definition.quizData.forEach((question, index) => {
            const userAnswerIndex = progress.userAnswers[index];
            const correctIndex = question.correctAnswerIndex;
            let optionsHTML = '';
            question.options.forEach((option, optIndex) => {
                let optionClass = 'bg-gray-700';
                let indicator = '';
                if (optIndex === correctIndex) {
                    optionClass = 'bg-green-800/50 border-green-500';
                    indicator = '<span class="text-green-400 ml-2 font-medium">(Correct)</span>';
                }
                if (optIndex === userAnswerIndex && userAnswerIndex !== correctIndex) {
                    optionClass = 'bg-red-800/50 border-red-500';
                    indicator = '<span class="text-red-400 ml-2 font-medium">(Your Answer)</span>';
                } else if (optIndex === userAnswerIndex && userAnswerIndex === correctIndex) {
                    indicator = '<span class="text-green-400 ml-2 font-medium">(Your Answer)</span>';
                }
                optionsHTML += `<li class="${optionClass} p-3 rounded-md border-l-4">${option}${indicator}</li>`;
            });
            if (userAnswerIndex === null) {
                 optionsHTML += `<li class="bg-yellow-800/50 border-l-4 border-yellow-500 text-yellow-300 p-3 rounded-md font-medium">You skipped this question.</li>`;
            }
            const reviewItem = document.createElement('div');
            reviewItem.className = 'bg-gray-800 p-4 rounded-lg shadow-lg ring-1 ring-gray-700/50';
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

    // --- MODIFIED: renderTocModal (Uses new helper) ---
    function renderTocModal() {
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        
        // (rest of function is unchanged)
        const { progress, definition } = quiz;
        tocGrid.innerHTML = '';
        definition.quizData.forEach((question, index) => {
            const button = document.createElement('button');
            button.textContent = index + 1;
            button.dataset.index = index;
            button.className = 'h-10 w-10 flex items-center justify-center font-bold rounded-full transition-all';
            const userAnswer = progress.userAnswers[index];
            const isVisited = progress.visited[index];
            if (userAnswer !== null) {
                if (userAnswer === question.correctAnswerIndex) {
                    button.classList.add('bg-green-600', 'text-white');
                } else {
                    button.classList.add('bg-red-600', 'text-white');
                }
            } else if (isVisited) {
                button.classList.add('bg-yellow-600', 'text-white');
            } else {
                button.classList.add('bg-gray-600', 'text-gray-200');
            }
            if (index === progress.currentQuestionIndex) {
                button.classList.add('ring-4', 'ring-blue-400');
            }
            button.addEventListener('click', () => jumpToQuestion(index));
            tocGrid.appendChild(button);
        });
        tocModalContainer.classList.remove('hidden');
    }

    function hideTocModal() {
        // (Unchanged)
        tocModalContainer.classList.add('hidden');
    }

    // --- MODIFIED: jumpToQuestion (Uses new helper) ---
    function jumpToQuestion(index) {
        const quiz = getCurrentQuiz();
        if (!quiz) return;
        
        // (rest of function is unchanged)
        quiz.progress.currentQuestionIndex = index;
        updateQuizProgress();
        displayQuestion();
        hideTocModal();
    }

    // --- EXTRACT MODAL LOGIC (MODIFIED) ---

    function switchExtractTab(tab) {
        // (Unchanged)
        currentExtractTab = tab;
        if (tab === 'json') {
            extractTabBtnJson.classList.add('text-white', 'border-blue-500');
            extractTabBtnJson.classList.remove('text-gray-400', 'border-transparent');
            extractTabBtnText.classList.add('text-gray-400', 'border-transparent');
            extractTabBtnText.classList.remove('text-white', 'border-blue-500');
            extractTabContentJson.classList.remove('hidden');
            extractTabContentText.classList.add('hidden');
        } else {
            extractTabBtnText.classList.add('text-white', 'border-blue-500');
            extractTabBtnText.classList.remove('text-gray-400', 'border-transparent');
            extractTabBtnJson.classList.add('text-gray-400', 'border-transparent');
            extractTabBtnJson.classList.remove('text-white', 'border-blue-500');
            extractTabContentText.classList.remove('hidden');
            extractTabContentJson.classList.add('hidden');
        }
    }

    function convertQuizDataToSimpleText(quizData) {
        // (Unchanged)
        const textBlocks = quizData.map(question => {
            const qText = question.questionText;
            const optionsText = question.options.map((option, index) => {
                if (index === question.correctAnswerIndex) {
                    return `*${option}`;
                }
                return option;
            }).join('\n');
            return `${qText}\n${optionsText}`;
        });
        return textBlocks.join('\n\n');
    }

    // --- MODIFIED: showExtractModal (Handles local and public) ---
    function showExtractModal(quizId) {
        let quizDefinition = null;

        if (quizId.startsWith('local_')) {
            quizDefinition = appState.localQuizzes.find(q => q.id === quizId);
        } else {
            quizDefinition = publicQuizMap.get(quizId);
        }

        if (!quizDefinition) {
            console.error("Could not find quiz to extract");
            return;
        }

        // (rest of function is unchanged)
        switchExtractTab('json');
        extractQuizName.textContent = quizDefinition.name;
        const jsonString = JSON.stringify(quizDefinition.quizData, null, 2);
        extractJsonTextarea.value = jsonString;
        const textString = convertQuizDataToSimpleText(quizDefinition.quizData);
        extractTextTextarea.value = textString;
        copyJsonBtn.textContent = 'Copy JSON to Clipboard';
        copyTextBtn.textContent = 'Copy Text to Clipboard';
        extractModalContainer.classList.remove('hidden');
    }

    function hideExtractModal() {
        // (Unchanged)
        extractModalContainer.classList.add('hidden');
    }

    function copyToClipboard(textarea, button) {
        // (Unchanged)
        navigator.clipboard.writeText(textarea.value).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => {
                if (button.id === 'copy-json-btn') {
                    button.textContent = 'Copy JSON to Clipboard';
                } else {
                    button.textContent = 'Copy Text to Clipboard';
                }
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            button.textContent = 'Failed to copy';
        });
    }

    extractTabBtnJson.addEventListener('click', () => switchExtractTab('json'));
    extractTabBtnText.addEventListener('click', () => switchExtractTab('text'));
    closeExtractBtn.addEventListener('click', hideExtractModal);
    extractModalContainer.addEventListener('click', (e) => {
        if (e.target === extractModalContainer) {
            hideExtractModal();
        }
    });
    copyJsonBtn.addEventListener('click', () => copyToClipboard(extractJsonTextarea, copyJsonBtn));
    copyTextBtn.addEventListener('click', () => copyToClipboard(extractTextTextarea, copyTextBtn));


    // --- INITIALIZATION & NAVIGATION LISTENERS ---

    function refreshAllLists() {
        renderLocalQuizzes();
        fetchAndRenderPublicQuizzes();
        showScreen('list');
    }

    loadNewQuizBtn.addEventListener('click', () => showScreen('setup'));
    backToListBtn.addEventListener('click', () => showScreen('list'));
    
    quizBackToListBtn.addEventListener('click', () => {
        updateQuizProgress(); // Save progress
        refreshAllLists();
    });
    
    resultsBackToListBtn.addEventListener('click', () => {
        currentQuizId = null;
        refreshAllLists();
    });
    
    reviewAnswersBtn.addEventListener('click', renderReviewList);
    reviewBackToResultsBtn.addEventListener('click', () => showScreen('results'));

    // TOC Listeners
    showTocBtn.addEventListener('click', renderTocModal);
    closeTocBtn.addEventListener('click', hideTocModal);
    tocModalContainer.addEventListener('click', (e) => {
        if (e.target === tocModalContainer) {
            hideTocModal();
        }
    });

    // --- KEYBOARD SHORTCUTS ---
    // (Unchanged)
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; 
        }

        if (!tocModalContainer.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                hideTocModal();
            }
            return;
        }

        if (!extractModalContainer.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                hideExtractModal();
            }
            return;
        }

        if (!screenContainers.quiz.classList.contains('hidden')) {
            switch (e.key) {
                case 'Enter':
                    if (!nextQuestionBtn.classList.contains('hidden') && !nextQuestionBtn.disabled) {
                        e.preventDefault();
                        goToNextQuestion();
                    } else if (!skipQuestionBtn.classList.contains('hidden') && !skipQuestionBtn.disabled) {
                        e.preventDefault();
                        goToNextQuestion();
                    }
                    break;
                case 'Backspace':
                    if (!prevQuestionBtn.disabled) {
                        e.preventDefault();
                        prevQuestionBtn.click();
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    const optionIndex = parseInt(e.key) - 1;
                    const optionButtons = optionsContainer.querySelectorAll('button');
                    if (optionButtons.length > optionIndex && optionIndex >= 0) {
                        const targetButton = optionButtons[optionIndex];
                        if (targetButton && !targetButton.disabled) {
                            e.preventDefault();
                            targetButton.click();
                        }
                    }
                    break;
            }
        }
    });

    /**
     * Main app initialization function
     */
    function initializeApp() {
        // --- Check for admin mode ---
        isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
        if (isAdmin) {
            console.log("Admin mode enabled. Public delete buttons will be visible.");
        }
        
        loadStateFromStorage(); // Load local quizzes and all progress
        renderLocalQuizzes(); // Render local quizzes first
        fetchAndRenderPublicQuizzes(); // Then fetch and render public quizzes
        showScreen('list'); // Start on the home screen
    }

    // Start the app!
    initializeApp();
});