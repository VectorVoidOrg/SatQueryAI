import os
from dotenv import load_dotenv
from google import genai
from PIL import Image

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

MODEL_NAME = "gemini-3.6-flash"

def query_text_only(prompt: str) -> str:
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )
    return response.text

def query_with_image(image_path: str, prompt: str) -> str:
    img = Image.open(image_path)
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[prompt, img],
    )
    return response.text

if __name__ == "__main__":
    print("Testing Gemini API...")
    res = query_text_only("Explain what satellite remote sensing imagery is in 2 sentences.")
    print("Response:\n", res)
