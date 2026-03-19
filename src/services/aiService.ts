import api from "./api";

type AskAiApiResponse = {
  descricao?: string;
  response?: string;
};

export async function askAi(query: string): Promise<string> {
  const { data } = await api.get<AskAiApiResponse>("/ai", {
    params: { query },
  });

  return data.descricao ?? data.response ?? "Sem resposta da IA.";
}
