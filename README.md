# Quiz Manager

A web application for creating, taking, and managing quizzes. It features a hybrid storage model, allowing users to save quizzes privately in your browser's localStorage or share them in a public library powered by Firebase.

## ✨ Features

### Hybrid Storage Model

**Local Quizzes:** Create and store quizzes that are saved only in your browser's local storage. These are fully private to you and appear under *My Local Quizzes*.

**Public Quiz Library:** Access a shared library of quizzes stored in a public Firebase database.

**Persistent Progress:** Your progress (current question, score, and answers) is automatically saved locally for both local and public quizzes, letting you stop and resume anytime.

### Flexible Quiz Creation

* **Name Your Quiz:** Assign a custom name when creating a quiz.
* **Multiple Input Formats:** Load quizzes via pasted JSON, uploaded `.json` files, or simple text format.
* **Choose Your Audience:** Decide whether to save a quiz privately or publish it to the public quiz library.

### Full-Featured Quiz Experience

* **Full Navigation:** Move between questions with Next/Previous.
* **Skip Questions:** Skip questions and revisit them automatically at the end.
* **Question List (TOC):** A modal shows a color-coded grid of all questions for quick navigation.
* **Instant Feedback:** See correctness of answers immediately.
* **Answer Review:** After finishing, review all questions, your answers, and correct answers.

### Quiz Management

* **Extract Data:** Export any quiz (local or public) into JSON or simple text format.
* **Targeted Deletion:**

  * *Local Quizzes:* Permanently delete quiz and progress.
  * *Public Quizzes:* Delete progress only—quiz stays available.

## 🚀 How to Use

1. On the main screen, view your library divided into *My Local Quizzes* and the *Public Quiz Library*.
2. Click **+ Load New Quiz**.
3. Enter a quiz name (e.g., "Chapter 1 Review").
4. Choose your input format and paste or upload your quiz data.
5. Choose where to save your quiz:

   * Unchecked box → saved locally.
   * Checked box → added to the public Firebase library.
6. Click **Create Quiz** to begin.
7. Use **Save & Exit** anytime to return later with your progress intact.

## 🔐 Admin Mode

Admin tools are available for managing the public quiz library.

**Activation:** Add `?admin=true` to the URL.

**Features:** A red **ADMIN DELETE** button appears on all public quizzes.

**Warning:** This permanently deletes the quiz from Firebase for all users.

## 📜 Quiz Formats

You can load quizzes in two formats.

### 1. JSON Format

Provide a JSON array of question objects with keys:

* `questionText` (string)
* `options` (array of strings)
* `correctAnswerIndex` (0-based number)

**Example:**

```json
[
  {
    "questionText": "What is the capital of France?",
    "options": ["Berlin", "Madrid", "Paris", "Rome"],
    "correctAnswerIndex": 2
  },
  {
    "questionText": "What is 2 + 2?",
    "options": ["3", "4", "5"],
    "correctAnswerIndex": 1
  }
]
```

### 2. Simple Text Format

Rules:

* First line is the question.
* Following lines are answer choices.
* Mark the correct answer with a leading `*`.
* Separate question blocks with a blank line.

**Example:**

```
What is the capital of France?
Berlin
Madrid
*Paris
Rome

What is 2 + 2?
3
*4
5
```

## 💻 How to Run Locally

1. Clone the repository or download `index.html`, `script.js`, and `style.css`.
2. Because the app uses JavaScript modules, run it using a local web server (not by opening the file directly).

### Using VS Code

* Install **Live Server** → Right-click `index.html` → *Open with Live Server*.

### Using Python

```bash
python3 -m http.server
```

Open `http://localhost:8000`.

**Note:** Public quiz features require internet access for Firebase. Local quizzes work offline after the initial load.
