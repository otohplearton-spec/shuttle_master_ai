
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Player, MatchHistory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const geminiService = {
  async parsePlayers(text: string): Promise<Partial<Player>[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `從以下這段文字中提取羽球球友名單。
      請識別：姓名(name)、性別(gender: "男" 或 "女")、強度等級(level: 1-15 之間)。
      如果沒提到性別，請預設為 "男"。
      如果沒提到強度，請預設為 7。
      
      文字內容：
      """
      ${text}
      """`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            players: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  gender: { type: Type.STRING, enum: ["男", "女", "其他"] },
                  level: { type: Type.INTEGER }
                },
                required: ["name", "gender", "level"]
              }
            }
          },
          required: ["players"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '{}');
      return data.players || [];
    } catch (e) {
      return [];
    }
  },

  async suggestPairings(
    availablePlayers: Player[], 
    history: MatchHistory[], 
    rounds: number = 5,
    currentQueue: string[][] = []
  ): Promise<string[][]> {
    if (availablePlayers.length < 4) return [];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `你是一位具備高度數據感與心理學背景的羽球俱樂部排點經理。你的目標是創造出既公平又充滿驚喜的對戰組合。

      請生成 ${rounds} 場組合，每場 4 人。

      【排點演算法權重分配】：
      1. 場次平衡 (Weight 50%): 必須優先選擇 gamesPlayed 最少的人。任何人之間的場次差距不得超過 2。
      2. 社交新鮮感 (Weight 30%): 
         - 檢查 history 和 currentQueue，盡可能避免「剛搭檔過」或「剛對戰過」的人再次相遇。
         - 每一位球員都應該有機會跟名單上的「每個人」搭檔到。
      3. 強度對等 (Weight 15%): 
         - 確保兩隊 level 加總後的差距最小化。
         - 如果場次較多，偶爾可以安排「強強對決」或「混合教學賽」。
      4. 驚喜隨機性 (Weight 5%): 
         - 在符合前三項大原則的前提下，請隨機打破慣性，不要每次都用最優解，讓排點更有趣。

      【當前球員數據】：${JSON.stringify(availablePlayers)}
      【對戰歷史紀錄】：${JSON.stringify(history.slice(-30))}
      【已在隊列中的場次】：${JSON.stringify(currentQueue)}
      `,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedRounds: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "一組 4 個球員 ID，前兩個一組，後兩個一組"
              }
            }
          },
          required: ["suggestedRounds"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '{}');
      return data.suggestedRounds || [];
    } catch (e) {
      // --- 本地強化後備演算法 (Local Fallback Algorithm) ---
      console.log("AI failed, using local fallback with weighted randomness.");
      const result: string[][] = [];
      const tempPlayers = availablePlayers.map(p => ({ ...p }));
      
      for (let r = 0; r < rounds; r++) {
        // 1. 根據場次排序，增加隨機擾動避免每次都是同一批人
        const sortedPool = [...tempPlayers].sort((a, b) => {
          const gameDiff = a.gamesPlayed - b.gamesPlayed;
          if (gameDiff !== 0) return gameDiff;
          return Math.random() - 0.5; // 場次相同時完全隨機
        });

        // 2. 挑選前 6-8 位作為候選區（增加多樣性）
        const candidates = sortedPool.slice(0, Math.min(tempPlayers.length, 8));
        
        // 3. 從候選區隨機抽 4 位
        const selected: string[] = [];
        const pool = [...candidates];
        for (let i = 0; i < 4; i++) {
          const randIdx = Math.floor(Math.random() * pool.length);
          const picked = pool.splice(randIdx, 1)[0];
          selected.push(picked.id);
          // 更新虛擬場次
          const pIdx = tempPlayers.findIndex(tp => tp.id === picked.id);
          if (pIdx !== -1) tempPlayers[pIdx].gamesPlayed++;
        }
        result.push(selected);
      }
      return result;
    }
  },

  async broadcastAnnouncement(playerNames: string[], courtName: string) {
    const prompt = `廣播：請 ${playerNames.join('、')}，這四位球友到 ${courtName} 準備上場。`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedBytes, audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (error) {
      const utterance = new SpeechSynthesisUtterance(prompt);
      utterance.lang = 'zh-TW';
      window.speechSynthesis.speak(utterance);
    }
  }
};
