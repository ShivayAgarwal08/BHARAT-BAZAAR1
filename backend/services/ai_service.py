import os
import json
import random
import google.generativeai as genai
from typing import Dict, Any, List

# Setup API Key (to be provided by user or set in env)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Fallback simulation logic (if no API key)
CATEGORIES = {
    "handloom": ["silk", "cotton", "linen", "wool"],
    "pottery": ["clay", "terracotta", "ceramic"],
    "jewelry": ["silver", "beads", "terracotta-jewelry", "brass"],
    "food": ["organic", "homemade", "traditional", "spices"]
}

GREETINGS = {
    "hi": "नमस्ते! आपका प्रोडक्ट बहुत ही शानदार लग रहा है।",
    "en": "Hello! Your product looks amazing and high-quality."
}

async def analyze_product_input(description: str, language: str = "hi") -> Dict[str, Any]:
    """
    Analyzes product description using Gemini Pro or fallback logic.
    Extracts name, category, material, and estimates market price.
    """
    if not GEMINI_API_KEY:
        return await simulate_analysis(description, language)

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Act as a product market expert for rural products in India.
        Analyze the following product description: "{description}"
        Language of description: {language}

        Respond in strictly JSON format with these fields:
        - product_name: (Short specific name)
        - category: (One of: handloom, pottery, jewelry, food, other)
        - material: (Primary material)
        - min_price: (Estimated minimum market price in INR)
        - max_price: (Estimated maximum market price in INR)
        - quantity: (Extracted quantity, default 1)
        - tags: (List of 5 SEO tags)
        - greeting: (A warm conversational greeting for the artisan in {language})
        
        Example JSON:
        {{
            "product_name": "Blue Silk Dupatta",
            "category": "handloom",
            "material": "Silk",
            "min_price": 500,
            "max_price": 800,
            "quantity": 5,
            "tags": ["handmade", "silk", "handloom", "ethnic", "traditional"],
            "greeting": "नमस्ते! आपके पास बहुत सुंदर रेशमी दुपट्टा है।"
        }}
        """
        response = model.generate_content(prompt)
        # Clean up possible markdown in response
        raw_text = response.text.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        
        data = json.loads(raw_text)
        
        # Calculate suggested price and profit margin
        avg_price = (data["min_price"] + data["max_price"]) / 2
        data["suggested_price"] = int(avg_price * 1.1)  # 10% premium for quality listing
        data["profit_margin"] = int(data["suggested_price"] * 0.4) # Typical 40% margin for local goods
        
        return data

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return await simulate_analysis(description, language)

async def generate_product_listing(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a professional marketing title and description.
    """
    if not GEMINI_API_KEY:
        return await simulate_listing_gen(analysis)

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Generate a professional e-commerce listing for this product:
        Name: {analysis['product_name']}
        Category: {analysis['category']}
        Material: {analysis['material']}
        Tags: {', '.join(analysis['tags'])}

        Respond in JSON:
        - title: (Catchy, SEO-friendly title)
        - description: (Story-based description highlighting the rural craftsmanship and quality)
        """
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        
        listing = json.loads(raw_text)
        return {**analysis, **listing}

    except Exception as e:
        print(f"Gemini API Error in listing: {e}")
        return await simulate_listing_gen(analysis)

# --- Fallback / Simulation Functions ---

async def simulate_analysis(description: str, language: str = "hi") -> Dict[str, Any]:
    # (Existing simulation logic simplified or reused)
    category = "other"
    material = "natural"
    low_desc = description.lower()
    
    if any(k in low_desc for k in ["दुपट्टा", "dupatta", "woven", "loom", "silk", "cotton"]):
        category = "handloom"
        material = "silk" if "silk" in low_desc or "रेशम" in low_desc else "cotton"
    elif any(k in low_desc for k in ["pot", "clay", "धड़ा", "मिट्टी"]):
        category = "pottery"
        material = "clay"
    
    min_p = random.randint(200, 500)
    max_p = min_p + random.randint(200, 400)
    suggested = int(max_p * 0.9)
    
    return {
        "product_name": "Handmade Product",
        "category": category,
        "material": material,
        "min_price": min_p,
        "max_price": max_p,
        "suggested_price": suggested,
        "profit_margin": int(suggested * 0.35),
        "quantity": 1,
        "tags": ["handmade", "rural-business", category, "local-craft"],
        "greeting": GREETINGS.get(language, GREETINGS["en"])
    }

async def simulate_listing_gen(analysis: Dict[str, Any]) -> Dict[str, Any]:
    return {
        **analysis,
        "title": f"Authentic {analysis['material'].title()} {analysis['category'].title()}",
        "description": f"This beautiful {analysis['category']} item is handcrafted by local artisans using traditional {analysis['material']} techniques. Perfect for those who value authenticity and social impact."
    }
