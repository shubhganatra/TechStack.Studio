import os
import re
import json
from datetime import datetime
from pathlib import Path
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

# 2. Setup Logging Directory
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 3. Setup FastAPI App
app = FastAPI()

# 4. CORS Setup (Crucial for Next.js to talk to Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Only in Dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Setup Groq Models
# Model 1: For generating custom prompts based on user inputs
prompt_engineer_model = ChatGroq(
    temperature=0.7,  # Higher creativity for prompt generation
    model_name="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

# Model 2: For tech stack recommendation (keep conservative)
stack_model = ChatGroq(
    temperature=0.2, 
    model_name="llama-3.1-8b-instant", 
    api_key=os.getenv("GROQ_API_KEY")
)

# 6. Logging Function
def log_request_response(user_inputs: dict, response: str, model_type: str = "stack", custom_prompt: str = None, master_prompt: str = None):
    """
    Log API requests and responses for learning and analysis
    """
    try:
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "model_type": model_type,
            "inputs": user_inputs,
            "master_prompt": master_prompt,  # Store the complete master prompt (custom + system)
            "response_preview": response[:500],  # Store first 500 chars as preview
            "response_length": len(response)
        }
        
        log_file = LOG_DIR / f"{model_type}_responses.jsonl"
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Logging error: {e}")

# 7. Prompt Engineering System Prompt
prompt_engineer_system = """You are an AI that generates expert system prompts for technical architecture decisions.

Given user inputs about:
- App Type (e.g., E-commerce, SaaS, Dating App, Real-time Chat)
- Scale (e.g., MVP, 10K users, 1M users, 100M users)
- Focus (e.g., Cost, Performance, Scalability, Security, Time-to-market)
- Additional Constraints (e.g., Team size, Budget, Tech preferences)

Generate a detailed, contextual prompt that will help an AI architect make optimal tech stack recommendations.

The generated prompt should:
1. Be specific to the user's context
2. Include relevant market trends and best practices
3. Consider trade-offs and their impact
4. Guide toward practical, implementable solutions
5. NOT include mermaid diagram rules - those will be handled separately

Output ONLY the custom prompt text, no explanations or formatting."""

# 8. System Prompt for Tech Stack Recommendation (WITH MERMAID RULES - DO NOT MODIFY)
system_prompt = """Structure your answer EXACTLY as follows with MINIMAL text and MAXIMUM diagrams:

## Architecture Diagram
Provide a Mermaid.js diagram showing the complete system architecture for the PRIMARY recommended stack.

## PRIMARY Technology Stack

IMPORTANT: Recommend ONE cohesive tech stack that works well together. Choose technologies that:
- Are proven to work well with each other
- Match the user's requirements
- Have good community support and documentation
- Are production-ready

### Frontend
**Tech_Name** - emoji_or_icon
Pros: • Benefit1 • Benefit2 • Benefit3
Cons: • Drawback1 • Drawback2
Why: One sentence explaining this choice.

### Backend
**Tech_Name** - emoji_or_icon
Pros: • Benefit1 • Benefit2 • Benefit3
Cons: • Drawback1 • Drawback2
Why: One sentence explaining this choice.

### Database
**Tech_Name** - emoji_or_icon
Pros: • Benefit1 • Benefit2 • Benefit3
Cons: • Drawback1 • Drawback2
Why: One sentence explaining this choice.

### DevOps/Infrastructure
**Tech_Name** - emoji_or_icon
Pros: • Benefit1 • Benefit2 • Benefit3
Cons: • Drawback1 • Drawback2
Why: One sentence explaining this choice.

### Additional Services
**Tech_Name** - emoji_or_icon
Pros: • Benefit1 • Benefit2 • Benefit3
Cons: • Drawback1 • Drawback2
Why: One sentence explaining this choice.

## ALTERNATIVE Technology Stacks

Provide up to 3 alternative tech stack options with the SAME format as above. Each alternative should:
- Solve the same problem differently
- Have different trade-offs (e.g., cost vs performance, simplicity vs scalability)
- Still be cohesive and production-ready

Use headers like:
## ALTERNATIVE STACK #1
### Frontend
...
### Backend
...
etc.

## ALTERNATIVE STACK #2
...

## ALTERNATIVE STACK #3
...

NOTE: Do NOT suggest multiple options in the same category within a single stack. Pick the BEST option for the given requirements.

CRITICAL MERMAID SYNTAX RULES - FOLLOW THESE STRICTLY:

1. Start diagram with: graph TD

2. Node Definition Rules - MUST FOLLOW EXACTLY:
   - Node IDs: ONLY letters, numbers, underscores (NO spaces, NO hyphens, NO slashes)
   - Examples of VALID node IDs: Client, API, DB, Cache, Queue, Frontend, Backend, WebServer, AppServer
   - EVERY node definition MUST have BOTH opening and closing brackets: NodeID[Label]
   - Node labels (inside brackets): Use UNDERSCORES instead of spaces
   - Example: APIGateway[API_Gateway] or WebServer[Web_Server]
   - NEVER generate incomplete nodes like: Worker[Worker_Service (MUST BE Worker[Worker_Service])
   - NO special characters in labels except underscores
   - NO HTML entities, no Unicode special chars
   - Max label: 40 chars

3. Connection Rules - STRICT:
   - Use ONLY: A --> B (simple connection)
   - Labels on arrows: A -->|Label_Text| B - MUST HAVE target node after pipe
   - Arrow labels MUST use UNDERSCORES for multiple words
   - Example: Client -->|HTTP_Request| API
   - NEVER generate incomplete arrows like: Service -->|Cache| (MUST have target node)
   - NO spaces in arrow labels
   - NO dotted lines, NO special arrows

4. Node Styling:
   - Rectangles: NodeID[Node_Label]
   - Rounded: NodeID([Node_Label])
   - Diamonds: NodeID[Decision]
   - Circles: NodeID((Round_Node))

5. Structure:
   - Maximum 10 nodes
   - Clear hierarchy
   - Every connection must have both source and target nodes

6. EXACT VALID EXAMPLE:
   graph TD
       Client[Client]
       APIGateway[API_Gateway]
       Backend[Backend_Service]
       DB[(Database)]
       Cache[Cache]
       
       Client -->|HTTP_Request| APIGateway
       APIGateway -->|Route| Backend
       Backend -->|Query| DB
       Backend -->|Cache| Cache

CRITICAL - DO NOT GENERATE:
- Incomplete node definitions: Worker[Worker_Service (MUST END WITH BRACKET])
- Incomplete arrows with labels but no target: Backend -->|Cache| (MUST HAVE TARGET NODE)
- Incomplete arrows at all: A --> (MUST HAVE TARGET)
- Arrows ending with pipe: A -->| (THIS BREAKS MERMAID)
- Node names with spaces: A Name (MUST USE AName or A_Name)
- Arrow labels with spaces: A -->|My Label| B (MUST BE A -->|My_Label| B)

DO NOT:
- Use spaces in node IDs or labels - USE UNDERSCORES INSTEAD
- Use: A -->|>B or A -.-|> B or A ====> B
- Use square brackets inside labels
- Use HTML entities
- Create incomplete anything - EVERY line must be complete and valid
- Use special characters except underscores

Output ONLY the mermaid code block:
```mermaid
graph TD
    [YOUR DIAGRAM HERE]
```
"""

# 6. LangChain Pipeline
prompt_template = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("user", "App Type: {appType}, Scale: {scale}, Focus: {focus}")
])

# Function to extract and validate mermaid code from response
def process_response_stream(text: str) -> str:
    """
    Extract mermaid blocks, validate them, and return cleaned response
    """
    # Find mermaid code blocks
    mermaid_pattern = r'```mermaid\n(.*?)\n```'
    matches = re.finditer(mermaid_pattern, text, re.DOTALL)
    
    cleaned_text = text
    for match in matches:
        mermaid_code = match.group(1)
        is_valid, message = validate_mermaid_syntax(mermaid_code)
        
        if not is_valid:
            # Replace invalid mermaid block with error message
            cleaned_text = cleaned_text.replace(
                match.group(0),
                f"```\n⚠️ Architecture diagram could not be generated.\nReason: {message}\n```"
            )
    
    return cleaned_text

# Function to create master prompt by mixing custom context with system rules
def create_master_prompt(custom_prompt: str) -> str:
    """
    Mix the custom prompt from prompt generation with system prompt 
    to create a master prompt that includes both user context and mermaid syntax rules
    """
    return f"""{custom_prompt}

{system_prompt}"""

# LangChain Pipelines
stack_prompt_template = ChatPromptTemplate.from_messages([
    ("user", "{custom_prompt}")
])

stack_chain = stack_prompt_template | stack_model | StrOutputParser()

# Prompt Engineering Prompt Template
prompt_engineer_template = ChatPromptTemplate.from_messages([
    ("system", prompt_engineer_system),
    ("user", "App Type: {appType}, Scale: {scale}, Focus: {focus}, Team Size: {teamSize}, Budget: {budget}, Time to Market: {timeToMarket}, Security Level: {securityLevel}, Additional: {customConstraints}")
])

prompt_engineer_chain = prompt_engineer_template | prompt_engineer_model | StrOutputParser()

# 7. Request Models
class StackRequest(BaseModel):
    appType: str
    scale: str
    focus: str
    teamSize: str = "not specified"
    budget: str = "not specified"
    timeToMarket: str = "not specified"
    securityLevel: str = "standard"
    customConstraints: str = ""

class PromptGenerationRequest(BaseModel):
    appType: str
    scale: str
    focus: str
    teamSize: str = "not specified"
    budget: str = "not specified"
    timeToMarket: str = "not specified"
    securityLevel: str = "standard"
    customConstraints: str = ""

# Mermaid Sanitizer and Validator
def sanitize_mermaid_code(code: str) -> str:
    """
    Clean up mermaid code to fix common generation issues
    """
    lines = []
    for line in code.split('\n'):
        # Strip leading/trailing whitespace
        line = line.strip()
        if not line or line.startswith('graph'):
            if line:
                lines.append(line)
            continue
        
        # SKIP completely incomplete arrows - these will break mermaid anyway
        # Skip: A -->|Label| (no target) 
        if line.endswith('-->|') or line.endswith('-->') or re.search(r'-->\|[^|]*\|?\s*$', line):
            # Incomplete arrow, skip it
            continue
        
        # Fix unclosed brackets - add closing bracket if needed
        # Pattern: NodeID[Label without closing bracket (not on arrow lines)
        if '[' in line and ']' not in line and '-->' not in line:
            line = line + ']'
        
        # For arrow lines with unclosed brackets in target
        # Pattern: A -->|Label| B[ should become A -->|Label| B[]
        if '-->' in line and '[' in line and ']' not in line:
            # Only add bracket if the line ends with an incomplete bracket
            if line.rstrip().endswith('['):
                line = line + ']'
            # But if it has content after bracket that's not valid, skip the line
            elif not re.search(r'\[[a-zA-Z0-9_]*\]', line):
                # Can't fix this, skip it
                continue
        
        # Fix spaces in node labels - replace spaces with underscores in brackets
        # Pattern: NodeID[Label With Spaces] -> NodeID[Label_With_Spaces]
        line = re.sub(r'(\[)([^\]]+)(\])', 
                      lambda m: m.group(1) + m.group(2).replace(' ', '_') + m.group(3), 
                      line)
        
        # Fix spaces in arrow labels - replace spaces with underscores
        # Pattern: -->|Label With Spaces| -> -->|Label_With_Spaces|
        line = re.sub(r'(\|)([^\|]+)(\|)', 
                      lambda m: m.group(1) + m.group(2).replace(' ', '_') + m.group(3), 
                      line)
        
        # Verify line is valid after processing
        # Must have balanced brackets and pipes if this is an arrow
        if '-->' in line:
            # Arrow line - must have target node or be removed
            if not re.search(r'-->\s*[a-zA-Z0-9_]+\[\w*\]', line) and not re.search(r'-->\|[^|]+\|\s*[a-zA-Z0-9_]+', line):
                # Can't find valid target node, skip this line
                continue
        
        lines.append(line)
    
    return '\n'.join(lines)

def validate_mermaid_syntax(code: str) -> tuple[bool, str]:
    """
    Validate mermaid diagram syntax and return (is_valid, error_message)
    """
    if not code or len(code.strip()) < 10:
        return False, "Code too short"
    
    # Sanitize first
    code = sanitize_mermaid_code(code)
    lines = code.strip().split('\n')
    
    # Check if starts with graph TD
    if not any('graph TD' in line for line in lines[:3]):
        return False, "Must start with 'graph TD'"
    
    # Check for bracket matching - count brackets per line
    for line in lines:
        if line.strip() and not line.strip().startswith('graph'):
            open_brackets = line.count('[')
            close_brackets = line.count(']')
            if open_brackets != close_brackets:
                return False, f"Unmatched brackets in line: {line[:40]}"
            
            open_pipes = line.count('|')
            if open_pipes > 0 and open_pipes % 2 != 0:
                return False, f"Unmatched pipes in arrow label: {line[:40]}"
    
    # Check for invalid arrow patterns
    invalid_patterns = [
        (r'--\.-+', 'Dotted arrows not allowed'),
        (r'-+\|>', 'Special arrowheads not allowed'),
        (r'===+>', 'Thick arrows not allowed'),
        (r'-->+\*', 'Invalid symbols in arrows'),
        (r'\]\[', 'Consecutive brackets error'),
        (r'-->\|\s*$', 'Incomplete arrow statement'),
        (r'-->\|$', 'Missing arrow label target'),
    ]
    
    for pattern, reason in invalid_patterns:
        if re.search(pattern, code, re.MULTILINE):
            return False, reason
    
    # Check for HTML entities
    if '&lt;' in code or '&gt;' in code or '&amp;' in code:
        return False, "HTML entities not allowed"
    
    # Check for spaces in node IDs (should be underscores)
    # Valid: NodeID[Label] or -->|Label_Text|
    # Invalid: Node ID[Label] or -->|Label Text|
    if re.search(r'\s+\[', code):
        return False, "Spaces in node definitions"
    
    # Check node definitions exist
    node_pattern = r'[a-zA-Z0-9_]+\['
    if not re.search(node_pattern, code):
        return False, "No valid nodes found"
    
    # Check connections exist
    arrow_pattern = r'-->'
    if not re.search(arrow_pattern, code):
        return False, "No valid connections found"
    
    return True, code


# 9. API Endpoints

# Endpoint 1: Generate Custom Prompt Based on User Inputs
@app.post("/api/generate-prompt")
async def generate_prompt(req: PromptGenerationRequest):
    """
    Generate a custom prompt for tech stack recommendation based on user context
    """
    try:
        custom_prompt = await prompt_engineer_chain.ainvoke({
            "appType": req.appType,
            "scale": req.scale,
            "focus": req.focus,
            "teamSize": req.teamSize,
            "budget": req.budget,
            "timeToMarket": req.timeToMarket,
            "securityLevel": req.securityLevel,
            "customConstraints": req.customConstraints
        })
        
        # Log the prompt generation - save both the generated prompt and system prompt
        log_request_response(req.dict(), custom_prompt, "prompt_engineering", 
                            custom_prompt=custom_prompt)
        
        return {"success": True, "prompt": custom_prompt}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Endpoint 2: Recommend Tech Stack Using Generated Prompt
@app.post("/api/recommend")
async def recommend_stack(req: StackRequest):
    """
    Generate tech stack recommendation using master prompt (custom context + system rules)
    """
    async def generate():
        # First, generate a custom prompt based on user inputs
        try:
            custom_prompt = await prompt_engineer_chain.ainvoke({
                "appType": req.appType,
                "scale": req.scale,
                "focus": req.focus,
                "teamSize": req.teamSize,
                "budget": req.budget,
                "timeToMarket": req.timeToMarket,
                "securityLevel": req.securityLevel,
                "customConstraints": req.customConstraints
            })
        except Exception as e:
            custom_prompt = f"App Type: {req.appType}, Scale: {req.scale}, Focus: {req.focus}, Team: {req.teamSize}, Budget: {req.budget}, TTM: {req.timeToMarket}, Security: {req.securityLevel}, Custom: {req.customConstraints}"
            yield f"Note: Using basic context due to prompt generation error.\n\n"
        
        # Create master prompt by mixing custom context with system rules
        master_prompt = create_master_prompt(custom_prompt)
        
        full_response = ""
        # Stream the tech stack recommendation using master prompt
        async for chunk in stack_chain.astream({"custom_prompt": master_prompt}):
            full_response += chunk
            yield chunk
        
        # Validate mermaid blocks at the end
        cleaned_response = process_response_stream(full_response)
        if cleaned_response != full_response:
            yield "\n\n" + cleaned_response.replace(full_response, "")
        
        # Log the response with custom prompt, master prompt, and final response
        log_request_response(req.dict(), full_response, "stack_recommendation",
                            custom_prompt=custom_prompt, master_prompt=master_prompt)

    return StreamingResponse(generate(), media_type="text/plain")

# Endpoint 3: Health Check
@app.get("/")
def home():
    return {
        "message": "TechStack.io Brain is Active 🧠",
        "version": "2.0",
        "features": ["prompt_engineering", "tech_stack_recommendation", "mermaid_diagrams", "logging"]
    }