import { config } from "../../config/google.config.js";
import { convertToModelMessages, streamText } from 'ai'
import chalk from "chalk";
import { google } from "@ai-sdk/google";

export class AIService {
    constructor() {
        if (!config.googleApiKey) {
            throw new Error("Google API Key is not configured");
        }

        this.model = google(config.model, {
            apiKey: config.googleApiKey
        })
    }

    /**
     * @param {Array} messages
     * @param {Function} onChunk
     * @param {Object} tools
     * @param {Function} onToolCall
     * @return {Promise<Object>}
    */

    async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
        try {
            const streamConfig = {
                model: this.model,
                messages: messages
            }

            if (tools && Object.keys(tools).length > 0) {
                streamConfig.tools = tools;
                streamConfig.maxSteps = 5;

                console.log(chalk.grey(
                    `[DEBUG] TOOLS ENABLED: ${Object.keys(tools).join(', ')}`
                ));
            }



            const result = streamText(streamConfig)

            let fullResponse = '';

            for await (const textChunk of result.textStream) {
                fullResponse += textChunk;
                if (onChunk) {
                    onChunk(textChunk)
                }
            }

            const fullResult = result;

            const toolCalls = [];
            const toolResults = [];

            if (fullResult.steps && Array.isArray(fullResult.steps)) {
                for (const step of fullResult.steps) {
                    if (step.toolCalls && step.toolCalls.length > 0) {
                        for (const toolCall of step.toolCalls) {
                            toolCalls.push(toolCall);

                            if (onToolCall) {
                                onToolCall(toolCall);
                            }
                        }
                    }

                    if (step.toolResults && step.toolResults.length > 0) {
                        toolResults.push(...step.toolResults);
                    }
                }
            }

            return {
                content: fullResponse,
                finishResponse: fullResult.finishReason,
                usage: fullResult.usage,
                toolCalls,
                toolResults,
                steps: fullResult.steps
            }
        } catch (error) {
            console.log(chalk.red('Error: ', error.message))
            throw error;
        }
    }

    /**
     * @param {Array} messages
     * @param {Object} tools
     * @returns {Promise<string>}
    */

    async getMessage(message, tools = undefined) {
        let fullResponse = '';
        const result = await this.sendMessage(message, (chunk) => {
            fullResponse += chunk;
        }, tools)

        return result.content;
    }

    /**
 * @param {Object} schema - Zod Schema
 * @param {string} prompt - Prompt for generation
 * @returns {Promise<Object>} Parsed object matching the schema
 *
 */
    async generateStructured(schema, prompt) {
        try {
            const result = await generateObject({
                model: this.model,
                schema: schema,
                prompt: prompt
            })
            return result.object
        } catch (error) {
            console.error(chalk.red("AI Structured Generation Error:"), error.message);
            throw error;
        }
    }
}