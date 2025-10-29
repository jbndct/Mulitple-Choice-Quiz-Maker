# 🧠 AI Quiz Generator

The AI Quiz Generator is a web application that automatically creates a multiple-choice quiz from your uploaded lecture notes. 📝 Simply provide a PDF or TXT file, and the app will generate a quiz to help you study and review the material. 💡

---

## ✨ Features

* **✍️ Generate Quizzes from Your Notes**: Upload your lecture notes in PDF or TXT format.
* **🔢 Customizable Number of Questions**: Choose how many questions you want in your quiz, from 1 to 30.
* **🖥️ Interactive Quiz Interface**: Take the quiz directly in your browser with instant feedback on your answers.
* **📊 Score Tracking**: See your score at the end of the quiz to gauge your understanding.
* **🔄 Regenerate Quizzes**: Get a new set of questions from the same document with a single click.

---

## ⚙️ How It Works

The application uses the Google Gemini API to read the text from your uploaded document and generate relevant multiple-choice questions. The backend is built with Flask, and the frontend is created with HTML, CSS, and JavaScript. 🚀

---

## 🏁 Getting Started

Follow these instructions to set up and run the project locally.

### ✅ Prerequisites

1.  Python 3.7+
2.  A Google AI API Key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 🛠️ Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/Quiz-Generator.git](https://github.com/your-username/Quiz-Generator.git)
    cd Quiz-Generator
    ```

2.  **Create a virtual environment and activate it:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the required dependencies:**
    *(Note: A `requirements.txt` file is not provided, but you can create one with the following content)*

    **`requirements.txt`:**
    ```
    Flask
    PyPDF2
    google-generativeai
    python-dotenv
    ```

    **Install the packages:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up your environment variables:**
    Create a file named `.env` in the root of the project directory and add your Google API key:
    ```
    GOOGLE_API_KEY=your_google_api_key_here
    ```
    *This file is listed in the `.gitignore` and will not be committed to your repository.* 🤫

---

## ▶️ Running the Application

1.  **Start the Flask server:**
    ```bash
    flask run
    ```

2.  **Open your browser:**
    Navigate to `http://127.0.0.1:5000` to start using the application. 🌐

---

## 🕹️ How to Use

1.  Click the "Choose File" button to select a `.pdf` or `.txt` file from your computer. 📁
2.  Select the number of questions you want to generate.
3.  Click the "Generate Quiz" button.
4.  The application will process the file and display the first question.
5.  After answering a question, click "Next Question" to proceed.
6.  At the end of the quiz, your final score will be displayed. 🏆
7.  You can then choose to "Regenerate Quiz" from the same file or "Try Another File".
