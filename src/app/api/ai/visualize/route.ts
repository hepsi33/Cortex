import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: NextRequest) {
    try {
        const { content } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const prompt = `Based on the following study notes, create a concise Mermaid.js diagram (flowchart, sequence diagram, or mindmap) that visualizes the core concepts. 
        Only provide the Mermaid code itself, without markdown code blocks.
        
        Notes:
        ${content}`;

        let diagram = "";
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            diagram = response.text().trim();
        } catch (geminiError) {
            console.warn("Direct Gemini failed for visualization, trying OpenRouter fallback...");
            const { openai, modelName } = await import("@/lib/openrouter");
            const completion = await openai.chat.completions.create({
                model: modelName || "google/gemini-2.0-flash-001",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
            });
            diagram = completion.choices?.[0]?.message?.content?.trim() ?? "";
        }

        if (!diagram) {
            console.warn("[Visualize] All APIs failed, generating local flowchart...");
            // Simple Local Flowchart Fallback
            const lines = content.split('\n').filter((l: string) => l.startsWith('*') || l.startsWith('-')).slice(0, 8);
            if (lines.length > 0) {
                diagram = "graph TD\n  Root((Study Notes))\n";
                lines.forEach((line: string, i: number) => {
                    const clean = line.replace(/^[*-\s]+/, '').substring(0, 30).replace(/[()]/g, '');
                    diagram += `  Root --> Node${i}["${clean}"]\n`;
                });
            } else {
                throw new Error("Could not generate diagram with any model");
            }
        }

        // Strip any accidental markdown blocks
        diagram = diagram.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');
        
        return NextResponse.json({ diagram });

    } catch (error: any) {
        console.error('Visualization error:', error);
        return NextResponse.json({ error: 'Failed to generate visualization' }, { status: 500 });
    }
}
