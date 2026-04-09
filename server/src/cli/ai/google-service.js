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

            const result = streamText(streamConfig)
            
            let fullResponse = '';

            for await (const textChunk of result.textStream) {
                fullResponse += textChunk;
                if (onChunk) {
                    onChunk(textChunk)
                }
            }

            const fullResult = result;

            return {
                content: fullResponse,
                finishResponse: fullResult.finishReason,
                usage: fullResult.usage,
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

    async getMessage(message, tools=undefined) {
        let fullResponse = '';
        await this.sendMessage(message, (chunk) => {
            fullResponse += chunk;
        })

        return fullResponse;
    }
}