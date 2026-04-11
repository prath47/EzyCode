import { google } from "@ai-sdk/google";
import chalk from "chalk";

export const availableTools = [
    {
        id: "google_search",
        value: "Google Search",
        description: "Search the web for information",
        getTool: () => google.tools.googleSearch({}),
        enabled: false
    },
    {
        id: "code_execution",
        value: "Code Execution",
        description: "Execute code",
        getTool: () => google.tools.codeExecution({}),
        enabled: false
    },
    {
        id: "url_context",
        value: "URL Context",
        description: "Get context from a URL",
        getTool: () => google.tools.urlContext({}),
        enabled: false
    }
]

export function getEnabledTools() {
    const tools = {}

    try {
        for(const toolConfig of availableTools) {
            if(toolConfig.enabled) {
                tools[toolConfig.id] = toolConfig.getTool()
            }
        }

        // debug logging
        if(Object.keys(tools).length > 0) {
            console.log(chalk.green(
                `[DEBUG] ENABLED TOOLS: ${Object.keys(tools).join(', ')}`
            ))
        }

        return tools;
    } catch (error) {
        console.log(chalk.red('Error: ', error.message))
        throw error;
    }
}

export function ToggleTool(toolId) {
    const tool = availableTools.find(t=>t.id === toolId)

    if(!tool) {
        throw new Error(`Tool not found: ${toolId}`)
    }

    tool.enabled = !tool.enabled

    console.log(chalk.green(
        `[DEBUG] TOGGLED TOOL: ${toolId} - ${tool.enabled ? 'ENABLED' : 'DISABLED'}`
    ))

    return tool.enabled;
}

export function enableTools(toolIds = []) {
    console.log(chalk.gray(`Enable tools called with: ${toolIds.join(', ')}`))

    availableTools.forEach(tool => {
        if(toolIds.includes(tool.id)) {
            tool.enabled = true;
            console.log(chalk.green(`[DEBUG] ENABLED TOOL: ${tool.id}`))  
        }
    })
}

export const getEnabledToolNames = () => {
    const names = availableTools.filter(t=>t.enabled).map(t=>t.id)  
    console.log(chalk.gray(`[DEBUG] GET ENABLED TOOLS: ${names.join(', ')}`))
    return names;
}

export const resetTools = () => {
    console.log(chalk.gray(`[DEBUG] RESET TOOLS CALLED`))
    availableTools.forEach(tool => {
        tool.enabled = false;
    })
}

