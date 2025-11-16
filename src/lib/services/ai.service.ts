import type { FlashcardCandidateDTO } from "@/types";

/**
 * Custom error for AI service unavailability
 */
export class ServiceUnavailableError extends Error {
  constructor(message = "AI service temporarily unavailable") {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Custom error for AI generation failures
 */
export class GenerationError extends Error {
  constructor(message = "Failed to generate flashcards") {
    super(message);
    this.name = "GenerationError";
  }
}

/**
 * AI Service for generating flashcards using OpenRouter.ai
 * Currently using mock implementation - will integrate with OpenRouter.ai API later
 */
export class AIService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly timeout = 30000; // 30 seconds

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Generate flashcards from provided text
   * @param text - User-provided text (1000-10000 characters)
   * @returns Array of flashcard candidates (minimum 5)
   */
  async generateFlashcards(text: string): Promise<FlashcardCandidateDTO[]> {
    try {
      const response = await this.callOpenRouterAPI(text);
      const candidates = this.parseResponse(response);

      if (candidates.length < 5) {
        throw new GenerationError("Generated fewer than 5 flashcards");
      }

      return candidates;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      if (error instanceof GenerationError) {
        throw error;
      }
      throw new GenerationError("Failed to generate flashcards");
    }
  }

  /**
   * Mock flashcard generation for development
   * Generates 8 flashcard candidates based on text length
   */
  private mockGenerateFlashcards(text: string): FlashcardCandidateDTO[] {
    // Simulate processing delay
    const wordCount = text.split(/\s+/).length;
    const candidateCount = Math.min(Math.max(Math.floor(wordCount / 50), 5), 12);

    const mockCandidates: FlashcardCandidateDTO[] = [];

    for (let i = 0; i < candidateCount; i++) {
      mockCandidates.push({
        front: `Question ${i + 1}: What is the key concept discussed in section ${i + 1}?`,
        back: `Answer ${i + 1}: This is a generated answer based on the provided text. It contains relevant information extracted from the content.`,
      });
    }

    return mockCandidates;
  }

  /**
   * Build the prompt for OpenRouter.ai API
   * @param text - User-provided text
   * @returns Formatted prompt string
   */
  private buildPrompt(text: string): string {
    return `You are an expert flashcard creator. Your task is to generate high-quality flashcards from the provided text.

Requirements:
- Generate at least 5 flashcards, preferably 8-12
- Each flashcard must have a "front" (question) and "back" (answer)
- Questions should be clear, specific, and test understanding
- Answers should be concise but complete
- Cover key concepts, definitions, facts, and relationships
- Vary question types (what, why, how, when, who)
- Return JSON format: { "flashcards": [{ "front": "...", "back": "..." }] }

Text to analyze:
${text}`;
  }

  /**
   * Call OpenRouter.ai API (future implementation)
   * @param text - User-provided text
   * @returns API response
   */
  private async callOpenRouterAPI(text: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": import.meta.env.APP_URL,
          "X-Title": "10xCards",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are a flashcard generator. Generate flashcards from provided text.",
            },
            {
              role: "user",
              content: this.buildPrompt(text),
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 503) {
        throw new ServiceUnavailableError();
      }

      if (!response.ok) {
        throw new GenerationError(`API returned status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableError("Request timeout");
      }

      throw new GenerationError("API request failed");
    }
  }

  /**
   * Parse and validate OpenRouter.ai API response
   * @param response - Raw API response
   * @returns Array of validated flashcard candidates
   */
  private parseResponse(response: unknown): FlashcardCandidateDTO[] {
    try {
      const apiResponse = response as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      if (!apiResponse.choices || !Array.isArray(apiResponse.choices) || apiResponse.choices.length === 0) {
        throw new GenerationError("Invalid API response format");
      }

      const content = apiResponse.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new GenerationError("Missing content in API response");
      }

      const data = JSON.parse(content) as { flashcards: FlashcardCandidateDTO[] };

      if (!data.flashcards || !Array.isArray(data.flashcards)) {
        throw new GenerationError("Invalid flashcards format");
      }

      // Filter and validate candidates
      const validCandidates = data.flashcards
        .filter(
          (card) =>
            card.front &&
            card.back &&
            typeof card.front === "string" &&
            typeof card.back === "string" &&
            card.front.trim().length > 0 &&
            card.back.trim().length > 0
        )
        .map((card) => ({
          front: card.front.trim(),
          back: card.back.trim(),
        }));

      return validCandidates;
    } catch (error) {
      if (error instanceof GenerationError) {
        throw error;
      }
      throw new GenerationError("Failed to parse AI response");
    }
  }
}

/**
 * Singleton AI service instance
 * Initialized with environment variables
 */
export const aiService = new AIService(
  import.meta.env.OPENROUTER_API_KEY || "",
  import.meta.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet"
);
