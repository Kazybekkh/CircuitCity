from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Dict, Any, List
import cv2
import numpy as np
import networkx as nx
import google.generativeai as genai
from elevenlabs.client import ElevenLabs
import os
import json
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

app = FastAPI(title="CircuitCity AI Microservice")

class SimulationState(BaseModel):
    components: List[Dict[str, Any]]
    events: List[str]

def preprocess_image(image_bytes: bytes) -> bytes:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    processed = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    _, encoded_img = cv2.imencode('.png', processed)
    return encoded_img.tobytes()

@app.post("/api/parse-schematic")
async def parse_schematic(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        processed_image_bytes = preprocess_image(image_bytes)
        
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = """
        Analyze this circuit diagram. Identify all components (resistors, batteries, LEDs, switches) 
        and their wiring connections. Return ONLY a valid JSON object with the following structure:
        {
            "nodes": [{"id": "n1", "type": "battery", "value": "9V", "label": "Power Station"}, ...],
            "edges": [{"source": "n1", "target": "n2"}, ...]
        }
        Do not include any markdown formatting or extra text.
        """
        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/png", "data": processed_image_bytes}
        ])
        
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
            
        circuit_data = json.loads(response_text)
        
        G = nx.Graph()
        for node in circuit_data.get("nodes", []):
            G.add_node(node["id"], **node)
        for edge in circuit_data.get("edges", []):
            G.add_edge(edge["source"], edge["target"])
            
        return {
            "status": "success",
            "graph": circuit_data,
            "stats": {
                "node_count": G.number_of_nodes(),
                "edge_count": G.number_of_edges()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse schematic: {str(e)}")

@app.post("/api/narrate")
async def narrate(state: SimulationState):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are the dramatic 'Mayor' of Circuit City, a town powered entirely by a circuit diagram.
        Here is the current state of the city's power grid:
        Events: {state.events}
        Components: {state.components}
        
        Write a 1-2 sentence dramatic announcement explaining what just happened in the circuit.
        Keep it highly entertaining, brief, and educational about electronics.
        """
        
        chat_response = model.generate_content(prompt)
        narration_text = chat_response.text.strip()
        
        audio_generator = elevenlabs_client.generate(
            text=narration_text,
            voice="Rachel", 
            model="eleven_monolingual_v1"
        )
        
        audio_bytes = b"".join([chunk for chunk in audio_generator])
        
        return Response(content=audio_bytes, media_type="audio/mpeg", headers={
            "X-Narration-Text": narration_text
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate narration: {str(e)}")
