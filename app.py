import os
import PyPDF2
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# 1. Load environment variables from .env file
load_dotenv()

# 2. Get the API key from the environment
API_KEY = os.getenv("GOOGLE_API_KEY")

# 3. Check if the API key is available and raise an error if not
if not API_KEY:
    raise ValueError("No GOOGLE_API_KEY found. Make sure you have a .env file with the key.")

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

def generate_quiz_from_text(text, num_questions):
    # CORRECTED to a known stable model. Change back if needed, but this is a safe default.
    model = genai.GenerativeModel('gemini-2.5-pro') 

    prompt = f"""
    Based on the following text, generate {num_questions} multiple-choice questions. The text is from lecture notes and the questions should be suitable for a student reviewing the material.

    For each question, provide:
    1. The question text.
    2. Four possible options (A, B, C, D).
    3. The letter of the correct answer.

    Return the output as a JSON array where each object in the array represents a single question and has the following keys: "question", "options", and "correct_answer".

    Here is the text:
    ---
    {text}
    ---
    """
    
    try:
        response = model.generate_content(prompt)
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

    try:
        num_questions = int(request.form.get('num_questions', 5))
        if not 1 <= num_questions <= 30:
             return jsonify({'error': 'Number of questions must be between 1 and 30.'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid number of questions provided.'}), 400

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
        
        print(f"Extracted text successfully! Now calling the AI for {num_questions} questions...")

        quiz_json_string = generate_quiz_from_text(text, num_questions)
        
        if quiz_json_string is None:
            return jsonify({'error': 'Failed to generate quiz from the AI.'}), 500

        return jsonify({'quiz_data': quiz_json_string})

    return jsonify({'error': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=True)