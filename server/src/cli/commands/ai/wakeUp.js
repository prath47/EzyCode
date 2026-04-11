import { Command } from "commander";
import { getStoredToken } from "../auth/login.js";
import prisma from "../../../lib/db.js";
import chalk from "chalk";
import { select } from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { startChat } from "../../chat/chat-with-ai.js";
import { startToolChat } from "../../chat/chat-with-ai-tools.js";
import { startAgentChat } from "../../chat/chat-with-ai-agent.js";

const wakeUpAction = async () => {
    const token = await getStoredToken();

    if (!token) {
        console.log(chalk.red('No token found. Please login first.'))
        return;
    }

    const spinner = yoctoSpinner({text: 'Waking up EzyCode AI...'});
    spinner.start();

    const user = await prisma.user.findFirst({
        where: {
            sessions: {
                some: {
                    token: token.access_token
                }
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
        }
    });

    if (!user) {
        spinner.error('Failed to find user.');
        return;
    }

    spinner.success(`Welcome back, ${user.name}!`);
    console.log(chalk.green(`You are now logged in as ${user.email}`));

    const choice = await select({
        message: "Select an Option",
        options: [
            {
                value: "chat",
                label: "Chat",
                hint: "Simple chat with AI",
            },
            {
                value: "tool",
                label: "Tool Calling",
                hint: "Chat with tools",
            },
            {
                value: "agent",
                label: "Agentic Mode",
                hint: "Advanced AI Agent",
            }
        ]
    });

    switch (choice) {
        case "chat":
            await startChat('chat')
            break;
        case "tool":
            await startToolChat()
            break;
        case "agent":
            await startAgentChat()
            break;
    }
}

export const wakeUp = new Command("wakeup")
    .description("Wake up EzyCode AI")
    .action(wakeUpAction);