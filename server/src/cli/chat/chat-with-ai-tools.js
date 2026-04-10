import chalk from "chalk";
import boxen from "boxen";
import { text, isCancel, cancel, intro, outro, multiselect } from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { AIService } from "../ai/google-service.js";
import { ChatService } from "../../service/chat.service.js";
import { getStoredToken } from "../commands/auth/login.js";
import prisma from "../../lib/db.js";
import {
	availableTools,
	getEnabledTools,
	ToggleTool,
	enableTools,
	getEnabledToolNames,
	resetTools
} from "../../config/tool.config.js";
// import { chatLoop } from "../chat/chat-loop.js";

marked.use(
	markedTerminal({
		code: chalk.cyan,
		blockquote: chalk.gray.italic,
		heading: chalk.green.bold,
		firstHeading: chalk.magenta.underline.bold,
		hr: chalk.reset,
		listitem: chalk.reset,
		list: chalk.reset,
		paragraph: chalk.reset,
		strong: chalk.bold,
		em: chalk.italic,
		codespan: chalk.yellow.bgBlack,
		del: chalk.dim.gray.strikethrough,
		link: chalk.blue.underline,
		href: chalk.blue.underline,
	})
);

const aiService = new AIService();
const chatService = new ChatService();

async function getUserFromToken() {
	const token = await getStoredToken();
	if (!token) {
		throw new Error("No token found. Please login first.");
	}

	const spinner = yoctoSpinner({
		text: "Authenticating...."
	});
	spinner.start();

	const user = await prisma.user.findFirst({
		where: {
			sessions: {
				some: {
					token: token.access_token
				}
			}
		}
	});

	if (!user) {
		spinner.error("User not found");
		throw new Error("User not found.");
	}
	spinner.success(`Welcome back ${user.name}`);
	return user;
}

export async function startToolChat(conversationId = null) {
	try {
		intro(boxen(chalk.bold("Calling ezycode tools mode..."), {
			title: "EzyCode",
			borderColor: "cyan",
			borderStyle: "round",
			padding: 1
		}));

		const user = await getUserFromToken()

		await selectTools()

		const conversation = await initConversation(user.id, conversationId, "tool")
		await chatLoop(conversation)

		resetTools()

		outro(chalk.green("Thanks"))

	} catch (error) {
		console.log(chalk.red("Error: ", error.message))
	}
}

async function selectTools() {
	const toolOptions = availableTools.map(tool => ({
		value: tool.id,
		label: tool.name,
		hint: tool.description
	}))

	const selectedTools = await multiselect({
		message: chalk.cyan("Select tool to enable (Space to select, Enter to confirm): "),
		options: toolOptions,
		required: false
	})

	if (isCancel(selectedTools)) {
		cancel(chalk.yellow("Tool selection cancelled"))
		process.exit(0)
	}

	enableTools(selectedTools)
	if (selectedTools.length === 0) {
		console.log(chalk.yellow("No tools selected. Using default mode."))
	} else {
		const toolsBox = boxen(
			chalk.green(`Enabled Tools: ${selectedTools.map(id => {
				const tool = availableTools.find(t => t.id === id);
				return ` . ${tool.name}`
			}).join('\n')}`),
			{
				padding: 1,
				margin: { top: 1, bottom: 1 },
				borderStyle: "round",
				borderColor: "green",
				title: "Active Tools",
				titleAlignment: "center"
			}
		)
		console.log(toolsBox)
	}

	return selectedTools.length > 0
}

async function initConversation(userId, conversationId = null, mode = "tool") {
	const spinner = yoctoSpinner({ text: "Loading Conversation..." }).start()

	const conversation = await chatService.getOrCreateConversation(
		userId,
		conversationId,
		mode
	);

	spinner.success("Conversation Loaded")

	const enabledToolNames = getEnabledToolNames();

	const toolsDisplay = enabledToolNames.length > 0 ? `
    ${chalk.green('Enabled Tools:')}
    ${enabledToolNames.map(name => `  • ${name}`).join('\n')}
    ` : 'No tools enabled';

	const conversationInfo = boxen(
		chalk.green(`Conversation ID: ${conversation.id}\n${toolsDisplay}`),
		{
			padding: 1,
			margin: { top: 1, bottom: 1 },
			borderStyle: "round",
			borderColor: "green",
			title: "Conversation Info",
			titleAlignment: "center"
		}
	)

	console.log(conversationInfo)

	if (conversation.messages?.length > 0) {
		console.log(chalk.yellow("Previous Messages: \n"))
		displayMessages(conversation.messages)
	}

	return conversation;
}

function displayMessages(messages) {
	messages.forEach(message => {
		const sender = message.sender === "user" ? "You" : "EzyCode";
		const timestamp = new Date(message.timestamp).toLocaleString();
		const content = message.content;

		const messageBox = boxen(
			chalk.green(`Sender: ${sender}\nTimestamp: ${timestamp}\nContent: ${content}`),
			{
				padding: 1,
				margin: { top: 1, bottom: 1 },
				borderStyle: "round",
				borderColor: "green",
				title: "Message",
				titleAlignment: "center"
			}
		)
		console.log(messageBox)
	})
}

async function saveMessage(conversationId, role, content) {
	const message = await chatService.addMessage(conversationId, role, content)
	return message;
}

async function updateConversationTitle(conversationId, userInput, messageCount) {
	if (messageCount === 1) {
		const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "");
		await chatService.updateTitle(conversationId, title);
	}
}

async function chatLoop(conversation) {
	const enabledToolNames = getEnabledToolNames()
	const helpBox = boxen(`${chalk.gray('. Type your message and press Enter')}\n${chalk.gray('. AI has accessto:')} ${enabledToolNames.length > 0 ? enabledToolNames.join(",") : "No tools"}\n${chalk.gray('. Type "exit" to end conversation')}\n${chalk.gray('. Press Ctrl+C to quit anytime')}`,
		{
			padding: 1,
			margin: { bottom: 1 },
			borderStyle: "round",
			borderColor: "gray",
			dimBorder: true,
		}
	)

	console.log(helpBox);

	while (true) {
		const userInput = await text({
			message: chalk.blue(" Your message"),
			placeholder: "Type your message...",
			validate(value) {
				if (!value || value.trim().length === 0) {
					return "Message cannot be empty";
				}
			},
		});

		if (isCancel(userInput)) {
			const exitBox = boxen(chalk.yellow("Chat session ended. Goodbye! 👋"), {
				padding: 1,
				margin: 1,
				borderStyle: "round",
				borderColor: "yellow",
			});
			console.log(exitBox);
			process.exit(0);
		}

		if (userInput && userInput.toLowerCase() === "exit") {
			const exitBox = boxen(chalk.yellow("Chat session ended. Goodbye! 👋"), {
				padding: 1,
				margin: 1,
				borderStyle: "round",
				borderColor: "yellow",
			});
			console.log(exitBox);
			break;
		}

		const userBox = boxen(chalk.white(userInput), {
			padding: 1,
			margin: { left: 2, bottom: 1 },
			borderStyle: "round",
			borderColor: "blue",
			title: "👤 You",
			titleAlignment: "left",
		});
		console.log(userBox);

		await saveMessage(conversation.id, "user", userInput);

		const messages = await chatService.getMessage(conversation.id);

		const aiResponse = await getAIResponse(conversation.id);

		await saveMessage(conversation.id, "assistant", aiResponse);

		await updateConversationTitle(conversation.id, userInput, messages.length);
	}
}

async function getAIResponse(conversationId) {
	const spinner = yoctoSpinner({
		text: "AI is thinking...",
		color: "cyan"
	}).start();
	const dbMessages = await chatService.getMessage(conversationId);
	const aiMessages = chatService.formatMessagesForAI(dbMessages);
	const tools = getEnabledTools();
	let fullResponse = "";
	let isFirstChunk = true;
	const toolCallsDetected = []

	try {
		const result = await aiService.sendMessage(
			aiMessages,
			(chunk) => {
				if (isFirstChunk) {
					spinner.stop();
					console.log("\n");
					const header = chalk.green.bold(" Assistant:");
					console.log(header);
					console.log(chalk.gray("-".repeat(60)));
					isFirstChunk = false;
				}
				fullResponse += chunk;
			},
			tools,
			(toolCall) => {
				toolCallsDetected.push(toolCall);
			}
		)

		if (toolCallsDetected.length > 0) {
			console.log("\n");
			const toolCallBox = boxen(
				toolCallsDetected.map(tc =>
					`${chalk.cyan("Tool:")} ${tc.toolName}\n${chalk.gray("Args:")} ${JSON.stringify
						(tc.args, null, 2)}`
				).join("\n\n"),
				{
					padding: 1,
					margin: 1,
					borderStyle: "round",
					borderColor: "cyan",
					title: " Tool Calls",
				}
			);
			console.log(toolCallBox);
		}

		// Display tool results if any
		if (result.toolResults && result.toolResults.length > 0) {
			const toolResultBox = boxen(
				result.toolResults.map(tr =>
					`${chalk.green(" Tool:")} ${tr.toolName}\n${chalk.gray("Result:")} ${JSON.stringify
						(tr.result, null, 2).slice(0, 200)}....`
				).join("\n\n"),
				{
					padding: 1,
					margin: 1,
					borderStyle: "round",
					borderColor: "green",
					title: " Tool Results",
				}
			);
			console.log(toolResultBox);
		}
		console.log("\n");
		const renderedMarkdown = marked.parse(fullResponse);
		console.log(renderedMarkdown);
		console.log(chalk.gray("-".repeat(60)));
		console.log("\n");
		return result.content;

	} catch (error) {
		spinner.error("Failed to get AI response")
		throw error
	}
}