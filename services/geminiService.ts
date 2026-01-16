import { Player, MatchHistory, Match, Gender } from '../types';

const API_KEY = 'AIzaSyDoXTgbVGQXgLl6X2Wfvl8zkc7Rf3hosys';
// Updated to gemini-2.5-flash as requested by user
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

// Helper to make API calls
const callGemini = async (prompt: string, responseMimeType: string = "application/json") => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("Gemini API returned unexpected format (No candidates)");
    }
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error("Gemini Request Failed", e);
    throw e;
  }
};

export const generateAiMatches = async (
  players: Player[],
  history: MatchHistory[],
  userInstruction: string,
  matchCount: number = 2
): Promise<Match[]> => {
  const activePlayers = players.filter(p => !p.isPaused);

  const prompt = `
    You are a professional badminton match scheduler.
    
    Current Players (Name / Level / Gender / GamesPlayed):
    ${activePlayers.map(p => `- ${p.id} (${p.name}): Lv${p.level} / ${p.gender} / Played ${p.gamesPlayed}`).join('\n')}
    
    Recent Match History (Pairs):
    ${history.slice(0, 50).map(h => `[${h.teams[0].join(',')}] vs [${h.teams[1].join(',')}]`).join('\n')}
    
    USER INSTRUCTION: "${userInstruction}"
    
    Task:
    Generate ${matchCount} matches based on the user's instruction and fairness (level balance).
    If the user instruction is vague, prioritize mixing levels and ensuring everyone plays.
    
    Output Format:
    Strictly return a JSON object with a "matches" key containing an array of matches. 
    Each match has "team1" and "team2" arrays of Player IDs.
    
    Example JSON:
    {
      "matches": [
        { "team1": ["id1", "id2"], "team2": ["id3", "id4"] },
        { "team1": ["id5", "id6"], "team2": ["id7", "id8"] }
      ]
    }
    `;

  try {
    const text = await callGemini(prompt);
    const result = JSON.parse(text);

    if (!result.matches || !Array.isArray(result.matches)) {
      throw new Error("Invalid JSON format from AI");
    }

    const validIds = new Set(activePlayers.map(p => p.id));
    const cleanMatches: Match[] = [];

    for (const m of result.matches) {
      if (m.team1?.length === 2 && m.team2?.length === 2) {
        if ([...m.team1, ...m.team2].every(id => validIds.has(id))) {
          cleanMatches.push({ team1: m.team1, team2: m.team2 });
        }
      }
    }
    return cleanMatches;

  } catch (error) {
    console.error("AI Generation Failed:", error);
    throw error;
  }
};

const parsePlayers = async (text: string): Promise<Partial<Player>[]> => {
  const prompt = `
    You are a helper to parse badminton player list text into JSON.
    
    Input Text:
    """
    ${text}
    """
    
    Task:
    Extract player names, gender (Male/Female), and level (1-15 estimate) if available.
    If no gender specified, guess based on name or default to Male.
    If no level specified, default to 7.
    
    Return JSON array of objects with keys: name, gender (enum: "男", "女"), level (number).
    
    Example Output:
    [
      { "name": "Alice", "gender": "女", "level": 6 },
      { "name": "Bob", "gender": "男", "level": 8 }
    ]
    `;

  try {
    const responseText = await callGemini(prompt);
    // Clean up markdown if present, though responseMimeType usually forces JSON
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((p: any) => ({
      name: p.name,
      gender: p.gender === '女' ? Gender.FEMALE : Gender.MALE,
      level: Number(p.level) || 7
    }));
  } catch (e) {
    console.error("Parse Players Failed", e);
    throw e;
  }
};

export const geminiService = {
  generateAiMatches, // Alias for backward compatibility if needed, though mostly used directly via named import
  suggestPairings: async (players: Player[], history: MatchHistory[], rounds: number, queue: string[][]): Promise<string[][]> => {
    // Adapter for old App.tsx usage if it still exists somewhere, maps to new logic roughly or just generates matches
    const matches = await generateAiMatches(players, history, "Generate standard balanced matches", rounds);
    return matches.map(m => [...m.team1, ...m.team2]);
  },
  parsePlayers
};
