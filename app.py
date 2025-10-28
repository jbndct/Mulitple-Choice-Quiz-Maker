import os
import PyPDF2
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify

# --- NEW: CONFIGURE YOUR API KEY ---
# Replace "YOUR_API_KEY" with the key you got from Google AI Studio
# It's better to use an environment variable for security, but this is fine for a personal project.
API_KEY = "AIzaSyBNp7yeKSQlG0vP3dZdf6qUs3V81dQ8BPk" 
genai.configure(api_key=API_KEY)

app = Flask(__name__)

def extract_text_from_pdf(file_stream):
    try:
        pdf_reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

# --- NEW: FUNCTION TO CALL THE GEMINI AI ---
def generate_quiz_from_text(text):
    model = genai.GenerativeModel('gemini-2.5-pro')

    # This is our prompt. It tells the AI exactly what we want.
    prompt = f"""
    Based on the following text, generate 5 multiple-choice questions. The text is from lecture notes and the questions should be suitable for a student reviewing the material.

    For each question, provide:
    1. The question text.
    2. Four possible options (A, B, C, D).
    3. The letter of the correct answer.

    Return the output as a JSON array where each object in the array represents a single question and has the following keys: "question", "options", and "correct_answer".

    Example format:
    [
        {{
            "question": "What is the capital of France?",
            "options": {{
                "A": "Berlin",
                "B": "Madrid",
                "C": "Paris",
                "D": "Rome"
            }},
            "correct_answer": "C"
        }}
    ]

    Here is the text:
    ---
    {text}
    ---
    """
    
    try:
        response = model.generate_content(prompt)
        # The AI might return the JSON inside a markdown block, so we clean it up.
        cleaned_json = response.text.strip().replace("```json", "").replace("```", "")
        return cleaned_json
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return None


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        text = ""
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(file.stream)
        elif file.filename.endswith('.txt'):
            text = file.stream.read().decode('utf-8')
        else:
            return jsonify({'error': 'Unsupported file type'}), 400

        if text is None or len(text.strip()) < 100:
            return jsonify({'error': 'Could not extract enough text from the file. A minimum of 100 characters is needed.'}), 400
        
        print("Extracted text successfully! Now calling the AI...")

        # --- MODIFIED: CALL THE AI INSTEAD OF THE PLACEHOLDER ---
        quiz_json_string = generate_quiz_from_text(text)
        
        if quiz_json_string is None:
            return jsonify({'error': 'Failed to generate quiz from the AI.'}), 500

        # The AI returns a string, so we send it to the frontend as a proper JSON response
        return jsonify({'quiz_data': quiz_json_string})

    return jsonify({'error': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=True)