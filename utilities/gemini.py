from google import genai
import sys
from dotenv import load_dotenv
import os
import mistune
import json

class Gemini:
    @staticmethod
    def extract_json_from_markdown(markdown_text):
        class SimpleJSONRenderer(mistune.HTMLRenderer):
            def __init__(self):
                super().__init__()
                self.json_blocks = []
            
            def block_code(self, code, info=None):
                code = code.strip()
                if code:
                    try:
                        json_data = json.loads(code)
                        self.json_blocks.append(json_data)
                    except json.JSONDecodeError:
                        pass
                return ""
        
        renderer = SimpleJSONRenderer()
        mistune.create_markdown(renderer=renderer)(markdown_text)
        return renderer.json_blocks
    @classmethod
    def generate_question(cls, context):
        load_dotenv()
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        try:
            with open('./resources/prompts/question.txt', 'r', encoding='utf-8') as file:
                content = file.read() # Change the file path if needed later please
        except FileNotFoundError:
            raise FileNotFoundError("question.txt file not found")
        content = content + context
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=content,
        )
        print("Đáp án:",response.text)
        return cls.extract_json_from_markdown(response.text)