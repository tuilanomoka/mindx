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
        print(repr(markdown_text))
        print("=== END RAW RESPONSE ===")
        
        # Method 1: Đơn giản nhất - tìm JSON trong markdown
        try:
            # Tìm nội dung JSON trong code block
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', markdown_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Nếu không có code block, tìm JSON trực tiếp
                json_match = re.search(r'\{.*\}', markdown_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    raise ValueError("No JSON found")
            
            # Parse trực tiếp - KHÔNG xử lý escape phức tạp
            json_data = json.loads(json_str)
            print("✅ Successfully parsed JSON directly")
            return [json_data]
            
        except Exception as e:
            print(f"❌ Method 1 failed: {e}")
        
        # Method 2: Xử lý escape sequences đơn giản
        try:
            # Tìm JSON
            json_match = re.search(r'\{.*\}', markdown_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                
                # Chỉ fix các escape sequence cơ bản
                json_str = json_str.replace('\\\\', '\\')  # \\ -> \
                json_str = json_str.replace('\\n', '\n')
                json_str = json_str.replace('\\t', '\t')
                json_str = json_str.replace('\\"', '"')
                
                json_data = json.loads(json_str)
                print("✅ Successfully parsed with simple escape fix")
                return [json_data]
                
        except Exception as e:
            print(f"❌ Method 2 failed: {e}")
        
        # Method 3: Manual reconstruction đơn giản
        try:
            print("🛠️ Simple manual reconstruction...")
            
            result = {"loigiai": []}
            
            # Tìm tất cả các bước
            step_pattern = r'\{\s*"buoc"\s*:\s*"([^"]*)"\s*,\s*"chitiet"\s*:\s*"([^"]*)"\s*\}'
            step_matches = re.findall(step_pattern, markdown_text)
            
            for buoc, chitiet in step_matches:
                # Đơn giản: chỉ replace double backslash
                chitiet = chitiet.replace('\\\\', '\\')
                result["loigiai"].append({
                    "buoc": buoc,
                    "chitiet": chitiet
                })
            
            # Tìm đáp án
            dapan_match = re.search(r'"dapan"\s*:\s*"([^"]*)"', markdown_text)
            if dapan_match:
                dapan = dapan_match.group(1).replace('\\\\', '\\')
                result["dapan"] = dapan
            else:
                result["dapan"] = "Không có đáp án"
            
            if result["loigiai"]:
                print("✅ Successfully reconstructed manually")
                return [result]
                
        except Exception as e:
            print(f"❌ Method 3 failed: {e}")
        
        # Final fallback
        print("🚨 Using fallback response")
        return [{
            "loigiai": [{
                "buoc": "1",
                "chitiet": "Lỗi phân tích phản hồi từ AI. Vui lòng thử lại."
            }],
            "dapan": "Lỗi xử lý dữ liệu"
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
                model="gemini-2.5-flash",
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