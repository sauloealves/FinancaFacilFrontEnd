import api from "./api";

type AskAiApiResponse = {
  response: string;
};

export async function askAi(query: string): Promise<string> {
  const { data } = await api.get<AskAiApiResponse>("/ai", {
    params: { query },
  });

  return data.response ?? "Sem resposta da IA.";
}
