import os
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# LangChain & Groq Imports
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 1. Load Environment Variables
load_dotenv()

# 2. Setup FastAPI App
app = FastAPI()

# 3. CORS Setup (Crucial for Next.js to talk to Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Only in Dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Setup Groq Model (Llama-3)
# Temperature 0.2 keeps it factual and architectural
model = ChatGroq(
    temperature=0.2, 
    model_name="llama-3.1-8b-instant", 
    api_key=os.getenv("GROQ_API_KEY")
)

# 5. System Prompt (The Architect Persona)
system_prompt = """You are a Senior Software Architect.
Analyze the user's requirements and recommend a complete tech stack (Frontend, Backend, Database, Cloud, DevOps).

Structure your answer in Markdown:
1. **The Stack**: List the technologies.
2. **The Why**: Explain the trade-offs and why you chose them.
3. **The Architecture**: Provide a Mermaid.js diagram code block.
   - Start the block with ```mermaid
   - End the block with ```
   - Use 'graph TD' (Top-Down) logic.

CRITICAL MERMAID SYNTAX RULES:
- Use ONLY standard arrows: A --> B or A -->|Label| B.
- DO NOT use special arrowheads like -->|text|> or -.->.
- Keep node names simple (No brackets [] inside node labels).
- Example: Client[Client] -->|Request| API[API Gateway]
"""

# 6. LangChain Pipeline
prompt_template = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("user", "App Type: {appType}, Scale: {scale}, Focus: {focus}")
])

chain = prompt_template | model | StrOutputParser()

# 7. Request Model
class StackRequest(BaseModel):
    appType: str
    scale: str
    focus: str

# 8. API Endpoint
@app.post("/api/recommend")
async def recommend_stack(req: StackRequest):
    async def generate():
        # Stream the chunks to the frontend
        async for chunk in chain.astream({
            "appType": req.appType,
            "scale": req.scale,
            "focus": req.focus
        }):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")

# Health Check Endpoint
@app.get("/")
def home():
    return {"message": "TechStack.io Brain is Active 🧠"}