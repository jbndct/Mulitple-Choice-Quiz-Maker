# Offline Quiz Manager

This is a simple, self-contained, offline-first web application for creating, taking, and managing quizzes. It runs entirely in your browser and uses `localStorage` to save your progress, so no database or internet connection (after the first load) is required.

This app was built to be a simple, portable tool for studying and self-testing.

## ✨ Features

  * **Runs 100% Offline:** After loading the page once, the app is fully functional offline.
  * **Persistent State:** All active quizzes and progress are saved in your browser's `localStorage`.
  * **Multiple Input Formats:** Load quizzes by pasting JSON, uploading a JSON file, or pasting a simple text format.
  * **Quiz Management:** See all your active quizzes in one list.
  * **Rename & Delete:** Easily rename quizzes for better organization or delete them when you're done.
  * **Full Quiz Navigation:**
      * Move between questions with "Next" and "Previous" buttons.
      * "Skip" questions to come back to them later.
      * Automatically loops through skipped questions at the end.
  * **Question List (TOC):** Jump to any question from a color-coded table of contents modal.
  * **Answer Review:** After completing a quiz, review all your answers against the correct ones.

## 🚀 How to Use (on GitHub Pages)

1.  Click the **+ Load New Quiz** button.
2.  Choose your input format: **JSON** or **Simple Text**.
3.  Paste or upload your quiz data.
4.  Click **Load and Start Quiz**.
5.  Your quiz will begin and will now be saved to your "Active Quizzes" list.

### Quiz Formats

You can provide quiz data in two ways:

#### 1\. JSON Format

Paste a JSON array of question objects. Each object must have:

  * `questionText` (string)
  * `options` (array of strings)
  * `correctAnswerIndex` (number, 0-based index)

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
    "options": ["3", "4", "5", "6"],
    "correctAnswerIndex": 1
  }
]
```

#### 2\. Simple Text Format

Paste plain text following this format:

  * The question is the first line.
  * Each answer is on a new line.
  * The correct answer is marked with an asterisk (`*`) at the beginning.
  * Separate questions with a blank line.

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
6
```

## 💻 How to Run Locally

1.  Clone this repository:
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    ```
2.  Navigate to the directory:
    ```bash
    cd your-repo-name
    ```
3.  For the best experience (and to avoid browser security issues with `file://`):
      * If you have **VS Code**, install the **Live Server** extension, right-click `index.html`, and choose "Open with Live Server".
      * If you have Python, run `python3 -m http.server` (or `python -m SimpleHTTPServer` for Python 2) and open `http://localhost:8000` in your browser.

<!-- end list -->

```
```