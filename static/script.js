document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the HTML elements
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const loader = document.querySelector('.loader-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackText = document.getElementById('feedback-text');
    const nextBtn = document.getElementById('next-btn');
    const scoreSpan = document.getElementById('score');
    const restartBtn = document.getElementById('restart-btn');

    // Global variables to hold quiz state
    let quizData = [];
    let currentQuestionIndex = 0;
    let score = 0;

    // --- FORM SUBMISSION LOGIC ---
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        // Hide form and show loader
        uploadForm.classList.add('hidden');
        loader.classList.remove('hidden');

        fetch('/generate-quiz', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
                resetQuiz();
                return;
            }
            
            // The AI returns a JSON *string*, so we need to parse it
            try {
                quizData = JSON.parse(data.quiz_data);
                startQuiz();
            } catch (error) {
                alert("Failed to parse quiz data from the AI. Please try a different file.");
                resetQuiz();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please check the console and try again.');
            resetQuiz();
        });
    });

    // --- QUIZ LOGIC FUNCTIONS ---
    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        loader.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        displayQuestion();
    }

    function displayQuestion() {
        feedbackText.textContent = '';
        nextBtn.classList.add('hidden');
        
        // Clear previous options
        optionsContainer.innerHTML = ''; 

        const question = quizData[currentQuestionIndex];
        questionText.textContent = question.question;

        // Create a button for each option
        for (const [key, value] of Object.entries(question.options)) {
            const button = document.createElement('button');
            button.textContent = `${key}: ${value}`;
            button.classList.add('option-btn');
            button.dataset.answer = key; // Store the option letter (A, B, C, D)
            button.addEventListener('click', checkAnswer);
            optionsContainer.appendChild(button);
        }
    }

    function checkAnswer(e) {
        const selectedButton = e.target;
        const selectedAnswer = selectedButton.dataset.answer;
        const correctAnswer = quizData[currentQuestionIndex].correct_answer;

        // Disable all buttons after an answer is chosen
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            // Highlight the correct answer
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
        
        // Show the 'Next' button
        nextBtn.classList.remove('hidden');
    }

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < quizData.length) {
            displayQuestion();
        } else {
            showResults();
        }
    });

    function showResults() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        scoreSpan.textContent = `${score} / ${quizData.length}`;
    }

    function resetQuiz() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loader.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        fileInput.value = ''; // Clear the file input
    }

    restartBtn.addEventListener('click', resetQuiz);
});