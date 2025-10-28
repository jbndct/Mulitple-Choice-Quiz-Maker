document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const numQuestionsInput = document.getElementById('num-questions');
    const loader = document.querySelector('.loader-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackText = document.getElementById('feedback-text');
    const nextBtn = document.getElementById('next-btn');
    const scoreSpan = document.getElementById('score');
    const restartBtn = document.getElementById('restart-btn');
    const regenerateBtn = document.getElementById('regenerate-btn'); // NEW: Regenerate button

    // --- State Variables ---
    let quizData = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let lastUploadedFile = null; // NEW: Variable to store the last used file

    // --- Main Function to Handle Quiz Generation ---
    function generateQuiz(file, numQuestions) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('num_questions', numQuestions);

        // Hide UI elements and show loader
        uploadForm.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loader.classList.remove('hidden');

        fetch('/generate-quiz', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
                resetToUpload(); // Go back to the upload screen on error
                return;
            }
            
            try {
                quizData = JSON.parse(data.quiz_data);
                if (quizData.length === 0) {
                    alert("The AI could not generate a quiz from this file. Please try another.");
                    resetToUpload();
                    return;
                }
                startQuiz();
            } catch (error) {
                alert("Failed to parse quiz data from the AI. Please try a different file.");
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
        const file = fileInput.files[0];
        if (file) {
            lastUploadedFile = file; // Store the file for regeneration
            const numQuestions = numQuestionsInput.value;
            generateQuiz(lastUploadedFile, numQuestions);
        } else {
            alert("Please select a file.");
        }
    });

    regenerateBtn.addEventListener('click', () => {
        if (lastUploadedFile) {
            const numQuestions = numQuestionsInput.value; // Use the current number in the input
            console.log("Regenerating quiz with the same file.");
            generateQuiz(lastUploadedFile, numQuestions);
        } else {
            alert("No file has been uploaded yet.");
        }
    });
    
    restartBtn.addEventListener('click', resetToUpload);
    nextBtn.addEventListener('click', handleNextQuestion);

    // --- Quiz Logic Functions ---
    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        loader.classList.add('hidden');
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
        fileInput.value = ''; // Clear the file input
        lastUploadedFile = null;
    }
});