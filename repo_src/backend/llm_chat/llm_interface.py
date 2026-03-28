import os
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from the .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DO_GRADIENT_KEY = os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL_NAME = os.getenv("OPENROUTER_MODEL_NAME", "anthropic/claude-3.5-sonnet")
GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"
DO_GRADIENT_DEFAULT_MODEL = "llama3.3-70b-instruct"

# These are optional but recommended for OpenRouter tracking
YOUR_SITE_URL = os.getenv("YOUR_SITE_URL", "http://localhost:5173")
YOUR_APP_NAME = os.getenv("YOUR_APP_NAME", "AI-Friendly Repo Template")

def _get_current_datetime() -> str:
    """Get the current date and time formatted for system prompts"""
    return datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

# --- Gemini client (preferred if GEMINI_API_KEY is set) ---
gemini_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("Gemini client initialised (google-genai).")
    except ImportError:
        print("Warning: GEMINI_API_KEY is set but google-genai package is not installed. Falling back to OpenRouter.")

# --- DO Gradient client (second priority — uses DO credits) ---
gradient_client = None
if not gemini_client and DO_GRADIENT_KEY:
    try:
        from openai import OpenAI
        gradient_client = OpenAI(
            base_url="https://inference.do-ai.run/v1/",
            api_key=DO_GRADIENT_KEY,
        )
        print("DO Gradient client initialised (OpenAI-compatible).")
    except ImportError:
        print("Warning: DIGITAL_OCEAN_MODEL_ACCESS_KEY is set but openai package is not installed.")

# --- OpenRouter client (fallback) ---
openrouter_client = None
if not gemini_client and not gradient_client:
    if OPENROUTER_API_KEY:
        from openai import OpenAI
        openrouter_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    else:
        print("Warning: No LLM key found (GEMINI_API_KEY, DIGITAL_OCEAN_MODEL_ACCESS_KEY, or OPENROUTER_API_KEY).")

# Backwards-compatible alias used by older callers that imported `client` directly
client = openrouter_client

async def ask_llm(
    prompt_text: str,
    system_message: str = "You are a helpful assistant.",
    model_override: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.7
) -> str:
    """
    Sends a prompt to the configured LLM and returns the response.

    Preference order:
      1. Google Gemini       — if GEMINI_API_KEY is set (free hackathon credits)
      2. DO Gradient         — if DIGITAL_OCEAN_MODEL_ACCESS_KEY is set (DO credits)
      3. OpenRouter          — if OPENROUTER_API_KEY is set (paid fallback)

    Args:
        prompt_text: The user prompt to send to the LLM
        system_message: The system message to set context for the LLM
        model_override: Optional model to use instead of the default
        max_tokens: Maximum tokens in the response (default: 2048)
        temperature: Sampling temperature 0-1 (default: 0.7)

    Returns:
        The LLM's response text, or an error message if the call fails
    """
    # Add current date/time to system message if not already present
    if "Current date and time:" not in system_message:
        current_datetime = _get_current_datetime()
        system_message = f"Current date and time: {current_datetime}\n\n{system_message}"

    # --- Gemini path ---
    if gemini_client is not None:
        model_to_use = model_override or GEMINI_DEFAULT_MODEL
        try:
            response = gemini_client.models.generate_content(
                model=model_to_use,
                contents=prompt_text,
                config={
                    "system_instruction": system_message,
                    "max_output_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            return response.text
        except Exception as e:
            print(f"Error calling Gemini API with model {model_to_use}: {e}")
            return f"Error: Failed to get response from Gemini. Details: {str(e)}"

    # --- DO Gradient path (with smart model routing) ---
    if gradient_client is not None:
        if model_override:
            model_to_use = model_override
            route_reason = f"explicit override: {model_override}"
        else:
            try:
                from repo_src.backend.services.model_router import route_model
                model_to_use, route_reason = route_model(prompt_text, system_message)
            except ImportError:
                model_to_use = DO_GRADIENT_DEFAULT_MODEL
                route_reason = "fallback (router not available)"
        print(f"[model-router] → {model_to_use} ({route_reason})")
        try:
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt_text}
            ]
            response = gradient_client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling DO Gradient with model {model_to_use}: {e}")
            return f"Error: Failed to get response from DO Gradient. Details: {str(e)}"

    # --- OpenRouter fallback path ---
    if openrouter_client is not None:
        model_to_use = model_override or DEFAULT_MODEL_NAME
        try:
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt_text}
            ]

            response = openrouter_client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                extra_headers={
                    "HTTP-Referer": YOUR_SITE_URL,
                    "X-Title": YOUR_APP_NAME
                }
            )

            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling OpenRouter API with model {model_to_use}: {e}")
            return f"Error: Failed to get response from LLM. Details: {str(e)}"

    return "Error: No LLM client initialised. Set GEMINI_API_KEY or OPENROUTER_API_KEY in .env."
