from google import genai
import sys
from dotenv import load_dotenv
import os
import json, re

class Gemini:
    @staticmethod
    def extract_json_from_markdown(markdown_text):
        """
        Extract JSON from markdown text with robust error handling
        """
        print("=== RAW GEMINI RESPONSE ===")
        print(markdown_text)
        print("=== END RAW RESPONSE ===")
        
        # Method 1: Direct JSON parsing with proper escaping
        try:
            # Remove markdown code blocks first
            clean_text = re.sub(r'```json|```', '', markdown_text).strip()
            
            # Fix ALL escape sequences - this is the key fix!
            # Replace double backslashes with single backslashes for LaTeX
            clean_text = clean_text.replace('\\\\', '\\')
            # Handle other escape sequences
            clean_text = clean_text.replace('\\n', '\n')
            clean_text = clean_text.replace('\\t', '\t')
            
            # Parse JSON
            json_data = json.loads(clean_text)
            print("✅ Successfully parsed JSON with escape fixing")
            return [json_data]
            
        except json.JSONDecodeError as e:
            print(f"❌ Method 1 failed: {e}")
        
        # Method 2: Try parsing the raw text as-is (sometimes it works)
        try:
            json_data = json.loads(markdown_text)
            print("✅ Successfully parsed raw text")
            return [json_data]
        except json.JSONDecodeError:
            print("❌ Method 2 failed")
        
        # Method 3: Extract JSON from code blocks with aggressive cleaning
        try:
            # Find code blocks
            code_blocks = re.findall(r'```(?:json)?\s*(\{.*?\})\s*```', markdown_text, re.DOTALL)
            for block in code_blocks:
                try:
                    # Aggressive cleaning
                    clean_block = block.strip()
                    clean_block = clean_block.replace('\\\\', '\\')
                    clean_block = clean_block.replace('\\n', '\n')
                    clean_block = clean_block.replace('\\t', '\t')
                    # Remove any trailing commas
                    clean_block = re.sub(r',\s*([}\]])', r'\1', clean_block)
                    
                    json_data = json.loads(clean_block)
                    print("✅ Successfully parsed cleaned code block")
                    return [json_data]
                except json.JSONDecodeError:
                    continue
        except Exception as e:
            print(f"❌ Method 3 failed: {e}")
        
        # Method 4: Manual reconstruction from the text
        try:
            print("🛠️ Attempting manual reconstruction...")
            
            # Extract loigiai array
            loigiai_section = re.search(r'"loigiai"\s*:\s*\[(.*?)\]', markdown_text, re.DOTALL)
            dapan_match = re.search(r'"dapan"\s*:\s*"([^"]*)"', markdown_text)
            acstatus_match = re.search(r'"acstatus"\s*:\s*"([^"]*)"', markdown_text)
            explain_match = re.search(r'"explain"\s*:\s*"([^"]*)"', markdown_text)
            
            result = {}
            
            # Handle different response types
            if loigiai_section:
                # This is a process-question response
                steps_text = loigiai_section.group(1)
                steps = []
                
                # Find individual steps
                step_pattern = r'\{\s*"buoc"\s*:\s*"([^"]*)"\s*,\s*"chitiet"\s*:\s*"([^"]*)"\s*\}'
                step_matches = re.findall(step_pattern, steps_text)
                
                for buoc, chitiet in step_matches:
                    # Fix escape sequences in the content
                    chitiet = chitiet.replace('\\\\', '\\')
                    steps.append({
                        "buoc": buoc,
                        "chitiet": chitiet
                    })
                
                if steps:
                    result["loigiai"] = steps
                
                if dapan_match:
                    dapan = dapan_match.group(1).replace('\\\\', '\\')
                    result["dapan"] = dapan
                else:
                    result["dapan"] = "Không có đáp án"
                    
            elif acstatus_match or explain_match:
                # This is a process-answer response
                if acstatus_match:
                    result["acstatus"] = acstatus_match.group(1)
                if explain_match:
                    explain = explain_match.group(1).replace('\\\\', '\\')
                    result["explain"] = explain
            
            if result:
                print("✅ Successfully reconstructed JSON manually")
                return [result]
                
        except Exception as e:
            print(f"❌ Method 4 failed: {e}")
        
        # Final fallback
        print("🚨 Using fallback response")
        return [{
            "loigiai": [{
                "buoc": "1",
                "chitiet": "Lỗi phân tích phản hồi từ AI. Vui lòng thử lại."
            }],
            "dapan": "Lỗi xử lý dữ liệu",
            "error": "JSON parsing failed"
        }]

    @classmethod
    def generate_question(cls, context):
        load_dotenv()
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=context,
            )
            
            print("=== GEMINI API RESPONSE ===")
            print(response.text)
            print("=== END GEMINI RESPONSE ===")
            
            extracted_json = cls.extract_json_from_markdown(response.text)
            
            print("=== EXTRACTED JSON ===")
            print(extracted_json)
            print("=== END EXTRACTED JSON ===")
            
            return extracted_json
            
        except Exception as e:
            print(f"Gemini API error: {e}")
            return [{
                "loigiai": [{
                    "buoc": "1", 
                    "chitiet": f"Lỗi kết nối AI: {str(e)}"
                }],
                "dapan": "Lỗi hệ thống AI"
            }]