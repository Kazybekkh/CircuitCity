import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing!");
            return NextResponse.json({ error: "GEMINI_API_KEY is missing in environment variables" }, { status: 500 });
        }

        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const systemPrompt = `You are an electrical engineering assistant. Analyze this circuit schematic. 
    Identify the components and their connections. 
    You MUST return ONLY a raw JSON object matching this exact structure, with no markdown formatting or code blocks: 
    { 
      "components": [
        { "id": "node-1", "type": "powerPlant" | "tollRoad" | "district" | "switch" | "ground", "label": "string" }
      ], 
      "edges": [
        { "id": "e1-2", "source": "node-id", "target": "node-id" }
      ] 
    }.
    Place components in a logical top-to-bottom layout (start with powerPlant at top, ground at bottom). 
    Assign reasonable x/y coordinates in the data if possible, but the client will mostly handle default positioning.`;

        // Initialize with the fresh key and force stable v1
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

        // Robust base64 extraction
        const base64Data = image.includes(",") ? image.split(",")[1] : image;

        const parts = [
            { text: systemPrompt },
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/png",
                },
            },
        ];

        console.log("Calling Gemini Vision API (v1)...");
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text().trim();

        console.log("Gemini Response received.");

        // Aggressive JSON extraction: find the first { and last }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : text;

        try {
            const parsedData = JSON.parse(cleanJson);
            return NextResponse.json(parsedData);
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON. Raw text:", text);
            return NextResponse.json({
                error: "AI response was not valid JSON. Please try again.",
                raw: text
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Vision Analysis Error Details:", error);
        return NextResponse.json({ error: error.message || "Unknown error during analysis" }, { status: 500 });
    }
}
