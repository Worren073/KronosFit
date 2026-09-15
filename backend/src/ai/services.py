import json
import os
import time
from typing import Any, Dict, List

from google import genai
from google.genai import errors, types

from .prompts import ROUTINE_GENERATION_PROMPT, TRAINER_SYSTEM_PROMPT


DEFAULT_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.5-flash')
FALLBACK_MODELS = [
    m.strip()
    for m in os.environ.get('GEMINI_FALLBACK_MODELS', 'gemini-3.5-flash,gemini-3.7-flash').split(',')
    if m.strip()
]
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1


def _get_client() -> genai.Client:
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY no esta configurada')
    return genai.Client(api_key=api_key)


def _contents_from_messages(messages: List[Dict[str, str]]) -> List[types.Content]:
    contents = []
    for msg in messages:
        role = 'user' if msg.get('role') == 'user' else 'model'
        contents.append(
            types.Content(role=role, parts=[types.Part(text=msg.get('content', ''))])
        )
    return contents


def _clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith('```'):
        text = text.strip('`')
        if text.lower().startswith('json'):
            text = text[4:].strip()
    return text


def _send_chat_with_retry(
    client: genai.Client,
    model: str,
    history: List[types.Content],
    last_message: str,
    system_prompt: str,
) -> types.GenerateContentResponse:
    """Send a chat message with retries on server errors."""
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            chat = client.chats.create(
                model=model,
                history=history,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            return chat.send_message(last_message)
        except errors.ServerError as exc:
            last_error = exc
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_BASE * (2 ** attempt))
    raise last_error or RuntimeError(f'El modelo {model} no respondio despues de {MAX_RETRIES} intentos.')


def chat_with_trainer(messages: List[Dict[str, str]], workout_history: str = '') -> str:
    """Send a conversation to Gemini using chat sessions and return the assistant reply."""
    client = _get_client()

    if not messages:
        return ''

    system_prompt = TRAINER_SYSTEM_PROMPT
    if workout_history:
        system_prompt += f'\n\nHistorial de entrenamiento del atleta (usa estos datos para asesorar sobre cargas y progresión):\n{workout_history}'

    history = _contents_from_messages(messages[:-1])
    last_message = messages[-1].get('content', '')
    models = [DEFAULT_MODEL] + [m for m in FALLBACK_MODELS if m != DEFAULT_MODEL]
    last_error: Exception | None = None

    for model in models:
        try:
            response = _send_chat_with_retry(client, model, history, last_message, system_prompt)
            return response.text.strip()
        except errors.ServerError as exc:
            last_error = exc
            continue

    raise last_error or RuntimeError('Ningun modelo de IA respondio. Intenta de nuevo en unos segundos.')


def _generate_content_with_retry(client: genai.Client, model: str, prompt: str) -> types.GenerateContentResponse:
    """Call Gemini with retries on server errors (e.g. 503 high demand)."""
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            return client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction='Eres un entrenador personal experto. Responde exclusivamente con JSON valido.',
                    temperature=0.4,
                    response_mime_type='application/json',
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
        except errors.ServerError as exc:
            last_error = exc
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_BASE * (2 ** attempt))
    raise last_error or RuntimeError(f'El modelo {model} no respondio despues de {MAX_RETRIES} intentos.')


def generate_routine(profile_data: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a workout routine using Gemini and return {message, routine}."""
    client = _get_client()
    prompt = ROUTINE_GENERATION_PROMPT.format(
        age=profile_data.get('age') or 'no especificada',
        weight=profile_data.get('weight') or 'no especificado',
        height=profile_data.get('height') or 'no especificada',
        gender=profile_data.get('gender') or 'no especificado',
        experience=profile_data.get('experience') or 'no especificada',
        injuries=profile_data.get('injuries') or 'ninguna',
        goal=preferences.get('goal'),
        days_per_week=preferences.get('days_per_week'),
        minutes_per_session=preferences.get('minutes_per_session'),
        equipment=preferences.get('equipment'),
        split_style=preferences.get('split_style'),
        notes=preferences.get('notes') or 'ninguna',
    )

    models = [DEFAULT_MODEL] + [m for m in FALLBACK_MODELS if m != DEFAULT_MODEL]
    last_error: Exception | None = None

    for model in models:
        try:
            response = _generate_content_with_retry(client, model, prompt)
            text = _clean_json_response(response.text)
            try:
                data = json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(f'La respuesta de la IA no es un JSON valido: {exc}') from exc

            message = data.pop('message', '')
            if 'days' not in data:
                raise ValueError('La respuesta de la IA no contiene la estructura de rutina esperada.')

            return {'message': message, 'routine': data}
        except errors.ServerError as exc:
            last_error = exc
            continue

    raise last_error or RuntimeError('Ningun modelo de IA respondio. Intenta de nuevo en unos segundos.')
