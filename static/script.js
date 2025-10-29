document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const numQuestionsInput = document.getElementById('num-questions');
    const rawTextInput = document.getElementById('raw-text-input');
    
    const loader = document.querySelector('.loader-container');
    const loaderText = document.getElementById('loader-text');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackText = document.getElementById('feedback-text');
    
    const nextBtn = document.getElementById('next-btn');
    const scoreSpan = document.getElementById('score');
    const restartBtn = document.getElementById('restart-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');

    // Mode switching elements
    const modeSwitcher = document.getElementById('mode-switcher');
    const modeUploadBtn = document.getElementById('mode-upload-btn');
    const modeManualBtn = document.getElementById('mode-manual-btn');
    const uploadModeContainer = document.getElementById('upload-mode-container');
    const manualModeContainer = document.getElementById('manual-mode-container');
    const mainActionBtn = document.getElementById('main-action-btn');
    const uploadP = document.getElementById('upload-p');
    const manualP = document.getElementById('manual-p');

    // --- State Variables ---
    let quizData = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let lastUploadedFile = null;
    let currentMode = 'upload'; // 'upload' or 'manual'

    // --- Main Function to Handle Quiz Generation/Formatting ---
    function handleFormSubmit() {
        const formData = new FormData();
        let error = false;

        // Hide UI elements and show loader
        uploadForm.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loader.classList.remove('hidden');

        if (currentMode === 'upload') {
            const file = fileInput.files[0];
            if (!file) {
                alert("Please select a file.");
                error = true;
                return;
            }
            lastUploadedFile = file; // Store the file for regeneration
            const numQuestions = numQuestionsInput.value;
            formData.append('file', file);
            formData.append('num_questions', numQuestions);
            formData.append('mode', 'upload');
            loaderText.textContent = "Generating your quiz, please wait...";
        } else { // Manual mode
            const rawText = rawTextInput.value;
            if (rawText.trim().length < 10) {
                alert("Please enter your questions in the text area.");
                error = true;
                return;
            }
            formData.append('raw_text', rawText);
            formData.append('mode', 'manual');
            loaderText.textContent = "Formatting your quiz, please wait...";
        }

        if (error) {
            resetToUpload();
            return;
        }

        fetch('/generate-quiz', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
                resetToUpload();
                return;
            }
            
            try {
                quizData = JSON.parse(data.quiz_data);
                if (quizData.length === 0) {
                    alert("The AI could not process your input. Please check the format or try a different file.");
                    resetToUpload();
                    return;
                }
                startQuiz();
            } catch (error) {
                alert("Failed to parse quiz data from the AI. Please try again.");
                resetToUpload();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please check the console and try again.');
            resetToUpload();
        });
    }

    // --- Event Listeners ---
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit();
    });

    modeUploadBtn.addEventListener('click', () => {
        currentMode = 'upload';
        modeUploadBtn.classList.add('active');
        modeManualBtn.classList.remove('active');
        uploadModeContainer.classList.remove('hidden');
        manualModeContainer.classList.add('hidden');
        mainActionBtn.textContent = "Generate Quiz";
        uploadP.classList.remove('hidden');
        manualP.classList.add('hidden');
    });

    modeManualBtn.addEventListener('click', () => {
        currentMode = 'manual';
        modeManualBtn.classList.add('active');
        modeUploadBtn.classList.remove('active');
        manualModeContainer.classList.remove('hidden');
        uploadModeContainer.classList.add('hidden');
        mainActionBtn.textContent = "Create Interactive Quiz";
        manualP.classList.remove('hidden');
        uploadP.classList.add('hidden');
    });

    regenerateBtn.addEventListener('click', () => {
        if (lastUploadedFile) {
            returnToUploadWithFile();
        } else {
            // If there was no file (i.e., manual mode was used), just go back to the start
            resetToUpload();
        }
    });
    
    restartBtn.addEventListener('click', resetToUpload);
    nextBtn.addEventListener('click', handleNextQuestion);

    // --- Quiz Logic Functions (no changes here) ---
    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        loader.classList.add('hidden');
        modeSwitcher.classList.add('hidden');
        uploadP.classList.add('hidden');
        manualP.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        displayQuestion();
    }

    function displayQuestion() {
        feedbackText.textContent = '';
        nextBtn.classList.add('hidden');
        optionsContainer.innerHTML = ''; 

        const question = quizData[currentQuestionIndex];
        questionText.textContent = question.question;

        for (const [key, value] of Object.entries(question.options)) {
            const button = document.createElement('button');
            button.textContent = `${key}: ${value}`;
            button.classList.add('option-btn');
            button.dataset.answer = key;
            button.addEventListener('click', checkAnswer);
            optionsContainer.appendChild(button);
        }
    }

    function checkAnswer(e) {
        const selectedButton = e.target;
        const selectedAnswer = selectedButton.dataset.answer;
        const correctAnswer = quizData[currentQuestionIndex].correct_answer;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            }
        });
        
        if (selectedAnswer === correctAnswer) {
            score++;
            feedbackText.textContent = "Correct!";
            feedbackText.style.color = "#2ecc71";
        } else {
            selectedButton.classList.add('wrong');
            feedbackText.textContent = `Wrong! The correct answer was ${correctAnswer}.`;
            feedbackText.style.color = "#e74c3c";
        }
        
        nextBtn.classList.remove('hidden');
    }

    function handleNextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < quizData.length) {
            displayQuestion();
        } else {
            showResults();
        }
    }

    function showResults() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        scoreSpan.textContent = `${score} / ${quizData.length}`;
    }

    function resetToUpload() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loader.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        modeSwitcher.classList.remove('hidden');
        fileInput.value = ''; 
        rawTextInput.value = '';
        lastUploadedFile = null;
        // Reset to default upload mode
        modeUploadBtn.click();
    }

    function returnToUploadWithFile() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loader.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        modeSwitcher.classList.remove('hidden');
        modeUploadBtn.click();
    }
});