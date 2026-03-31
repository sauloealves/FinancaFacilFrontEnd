import api from "./api";

type AskAiApiResponse = {
  descricao?: string;
  response?: string;
};

export async function askAi(prompt: string): Promise<string> {
  const { data } = await api.get<AskAiApiResponse>("/ai/summary", {
    params: { prompt },
  });

  return data.descricao ?? data.response ?? "Sem resposta da IA.";
}
