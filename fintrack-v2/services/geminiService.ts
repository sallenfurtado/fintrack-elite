import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Correct model name — gemini-2.0-flash is stable and fast
const MODEL = 'gemini-2.0-flash';

const withTimeout = <T>(promise: Promise<T>, ms = 90_000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: A IA demorou mais de ${ms / 1000}s para responder.`)), ms)
    ),
  ]);

export async function getFinancialInsights(
  summary: unknown,
  recentTransactions: unknown[],
  isFiltered = false
) {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: `
          Analise o resumo financeiro e transações recentes abaixo.
          ${isFiltered
            ? 'ATENÇÃO: Os dados estão FILTRADOS pelo usuário. Foque seus insights neste subconjunto específico.'
            : 'Estes são os dados financeiros gerais do usuário.'}

          Resumo: ${JSON.stringify(summary)}
          Transações recentes: ${JSON.stringify(recentTransactions.slice(0, 10))}

          Forneça exatamente 3 insights financeiros concisos e acionáveis em Português do Brasil.
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                  },
                  required: ['title', 'description', 'severity'],
                },
              },
            },
            required: ['insights'],
          },
        },
      })
    );
    return JSON.parse(response.text).insights ?? [];
  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    return [];
  }
}

export async function parseInvoiceData(rawText: string) {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: `
          Extraia os dados de transação do texto bruto abaixo (fatura de cartão de crédito).

          --- INÍCIO DO TEXTO ---
          ${rawText}
          --- FIM DO TEXTO ---

          Campos esperados:
          - date (formato ISO YYYY-MM-DD)
          - description (MUITO IMPORTANTE: retorne a descrição EXATA e COMPLETA, sem remover números de parcelas como '01/12', '05/10')
          - amount (número, negativo para despesas, positivo para reembolsos/pagamentos)

          Ignore cabeçalhos e linhas que não sejam transações.
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                  },
                  required: ['date', 'description', 'amount'],
                },
              },
            },
            required: ['transactions'],
          },
        },
      })
    );

    const text = (response.text ?? '{}').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(text).transactions ?? [];
  } catch (error) {
    console.error('Erro ao processar fatura:', error);
    if (error instanceof Error && error.message.includes('Timeout')) throw error;
    throw new Error('Não foi possível processar os dados da fatura. Verifique o formato e tente novamente.');
  }
}

export async function parseStatementData(rawText: string) {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: `
          Extraia os dados de transação do texto bruto abaixo (extrato bancário).

          --- INÍCIO DO TEXTO ---
          ${rawText}
          --- FIM DO TEXTO ---

          Campos esperados:
          - date (formato ISO YYYY-MM-DD)
          - description (descrição completa; para linhas de saldo, inclua o texto como "Saldo do dia")
          - amount (número; débito/saída = negativo, crédito/entrada = positivo; para saldo, use o valor do saldo)
          - is_balance_line (boolean: true SOMENTE para linhas que representam saldo disponível do dia)

          Ignore cabeçalhos, mas NÃO ignore linhas de saldo.
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    is_balance_line: { type: Type.BOOLEAN },
                  },
                  required: ['date', 'description', 'amount', 'is_balance_line'],
                },
              },
            },
            required: ['transactions'],
          },
        },
      })
    );

    const text = (response.text ?? '{}').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(text).transactions ?? [];
  } catch (error) {
    console.error('Erro ao processar extrato:', error);
    if (error instanceof Error && error.message.includes('Timeout')) throw error;
    throw new Error('Não foi possível processar os dados do extrato. Verifique o formato e tente novamente.');
  }
}

export async function predictBalance(
  transactions: unknown[],
  currentBalance: number,
  isFiltered = false
) {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: `
          Com base no histórico de transações dos últimos 3 meses, preveja a tendência financeira para os próximos 3 meses.
          ${isFiltered
            ? 'ATENÇÃO: Dados filtrados. Preveja o futuro especificamente para este subconjunto.'
            : 'Dados gerais. Preveja o saldo futuro.'}

          Valor/Saldo atual: ${currentBalance}
          Histórico: ${JSON.stringify(transactions.slice(-50))}

          Forneça a previsão para cada um dos próximos 3 meses em Português do Brasil.
          O valor previsto deve representar o fluxo líquido esperado, despesas ou saldo para aquele mês.
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.STRING },
                    predictedBalance: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['month', 'predictedBalance', 'explanation'],
                },
              },
            },
            required: ['predictions'],
          },
        },
      })
    );
    return JSON.parse(response.text).predictions ?? [];
  } catch (error) {
    console.error('Erro ao prever saldo:', error);
    return [];
  }
}
