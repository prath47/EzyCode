import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { logger } from "better-auth"
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins"
import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from 'zod/v4';
import dotenv from 'dotenv';
import prisma from '../../../lib/db.js';
dotenv.config({ path: path.join(import.meta.dirname, '../../../../.env') });

const URL = 'http://localhost:3005';
export const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const CONFIG_DIR = path.join(os.homedir(), '.better-auth');
export const TOKEN_FILE = path.join(CONFIG_DIR, 'token.json');

////// token methods

export async function getStoredToken() {
    try {
        const data = await fs.readFile(TOKEN_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }
        throw error;
    }
}

export async function storeToken(token) {
    try {
        // Ensure config directory exists
        await fs.mkdir(CONFIG_DIR, { recursive: true });

        // Store token with metadata
        const tokenData = {
            access_token: token.access_token,
            refresh_token: token.refresh_token, // Store if available
            token_type: token.token_type || "Bearer",
            scope: token.scope,
            expires_at: token.expires_in
                ? new Date(Date.now() + token.expires_in * 1000).toISOString()
                : null,
            created_at: new Date().toISOString(),
        };

        await fs.writeFile(
            TOKEN_FILE,
            JSON.stringify(tokenData, null, 2),
            "utf-8"
        );
        return true;
    } catch (error) {
        console.error(chalk.red("Failed to store token:"), error.message);
        return false;
    }
}

export const clearStoredToken = async () => {
    try {
        await fs.unlink(TOKEN_FILE);
        return true;
    } catch (error) {
        if (error.code === "ENOENT") {
            return true;
        }
        throw error;
    }
}

export const isTokenExpired = async () => {
    try {
        const tokenData = await getStoredToken();
        if (!tokenData || !tokenData.expires_at) {
            return true;
        }
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        return now >= expiresAt;
    } catch (error) {
        console.error(chalk.red("Failed to check token expiration:"), error.message);
        return true;
    }
}

export async function requireAuth() {
    const token = getStoredToken();

    if (!token) {
        console.log(
            chalk.red("Not authenticated. Please run 'ezycode login' first.")
        );
        process.exit(1);
    }

    if (isTokenExpired()) {
        console.log(
            chalk.red("Token expired. Please run 'ezycode login' to refresh.")
        );
        process.exit(1);
    }

    return token;
}

export async function loginAction(opts) {
    const options = z.object({
        serverUrl: z.string().optional(),
        clientId: z.string().optional(),
    })

    const serverUrl = options.serverUrl || URL;
    const clientId = options.clientId || CLIENT_ID;

    intro(chalk.bold('🔐 Better Auth CLI Login'));

    // Change this with token management utils
    const existingToken = await getStoredToken();
    const expired = await isTokenExpired();

    if (existingToken && !expired) {
        const shouldReAuth = await confirm({
            message: "You are already logged in. Do you want to login again ?",
            initialValue: false
        })

        if (isCancel(shouldReAuth) || !shouldReAuth) {
            cancel("Login Cancelled.");
            process.exit(0);
        }
    }

    const authClient = createAuthClient({
        baseURL: serverUrl,
        plugins: [deviceAuthorizationClient()]
    });

    const spinner = yoctoSpinner({ text: 'Requesting device authorization...' });
    spinner.start();

    try {
        const { data, error } = await authClient.device.code({
            client_id: clientId,
            scope: 'openid profile email'
        });
        spinner.stop();

        if (error || !data) {
            logger.error(`Failed to request device authorization: ${JSON.stringify(error)}`);
            process.exit(1);
        }

        const {
            device_code,
            user_code,
            verification_uri,
            verification_uri_complete,
            interval,
            expires_in
        } = data;


        console.log(chalk.cyan("Device authorization Required"));

        console.log(chalk.underline.blue(`Please visit ${chalk.underline.blue(verification_uri || verification_uri_complete)}`));

        console.log(`Enter Code: ${chalk.bold.green(user_code)}`);

        const shouldOpen = await confirm({
            message: "Open browser automatically",
            initialValue: true
        })

        if (!isCancel(shouldOpen) && shouldOpen) {
            const urlToOpen = verification_uri_complete || verification_uri;
            await open(urlToOpen);
        }

        console.log(chalk.gray(
            `Waiting for authorization (expired in ${Math.floor(
                expires_in / 60
            )} minutes)...`
        ))

        const token = await pollForToken(authClient, device_code, clientId, interval);

        if (token) {
            const saved = await storeToken(token);

            if (!saved) {
                console.log(chalk.yellow('warning: Could not save auth token'));
                console.log(chalk.yellow('you may need to login on next use'));
            }

            // get user data
            outro(chalk.green("login successfull"));
            console.log(chalk.gray(`\n Token saved to ${TOKEN_FILE}`));
            console.log(chalk.gray(`\n You can now use EzyCode CLI`));

            // TODO: get the user data
            outro(chalk.green("Login Successful !"));
            console.log(chalk.gray(`\n Token saved to ${TOKEN_FILE}`));
            console.log(chalk.green("\n User can start using the AI tool"));
        }
    } catch (error) {
        spinner.stop();
        console.log(chalk.red(`\nLogin Failed ${error.message}`));
        process.exit(1);
    }
}

async function pollForToken(authClient, deviceCode, clientId, initialIntervalue) {
    let pollingInterval = initialIntervalue
    const spinner = yoctoSpinner({ text: "", color: "cyan" });
    let dots = 0;
    return new Promise((resolve, reject) => {
        const poll = async () => {
            dots = (dots + 1) % 4;
            spinner.text = chalk.gray(
                `Polling for authorization${".".repeat(dots)}${" ".repeat(3, dots)}`
            );
            if (!spinner.isSpinning) spinner.start();
            try {
                const { data, error } = await authClient.device.token({
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code: deviceCode,
                    client_id: clientId,
                    fetchOptions: {
                        headers: {
                            "user-agent": `My CLI`,
                        },
                    },
                });

                const token = data?.access_token || data?.token || data?.session?.token;
                if (data && token) {
                    console.log(
                        chalk.bold.yellow("Authorization successful!")
                    );

                    spinner.stop();
                    // Ensure the token is in the format expected by the rest of the app
                    const normalizedData = {
                        ...data,
                        access_token: token
                    };
                    resolve(normalizedData);
                    return;
                } else if (error) {
                    switch (error.error) {
                        case "authorization_pending":
                            // Continue polling
                            break;
                        case "slow_down":
                            pollingInterval += 5;
                            break;
                        case "access_denied":
                            spinner.stop();
                            console.error(chalk.red("Access was denied by the user"));
                            reject(new Error("Access denied"));
                            return;
                        case "expired_token":
                            spinner.stop();
                            console.error(chalk.red("The device code has expired. Please try again."));
                            reject(new Error("Token expired"));
                            return;
                        default:
                            spinner.stop();
                            console.error(chalk.red(`Error: ${error.error_description || error.message || JSON.stringify(error)}`));
                            reject(new Error(error.error_description || "Unknown error"));
                            return;
                    }
                }
            } catch (error) {
                spinner.stop();
                logger.error(`Error: ${error.message}`);
                process.exit(1);
            }

            setTimeout(poll, pollingInterval * 1000);
        };

        setTimeout(poll, pollingInterval * 1000);
    })
}

export async function logoutAction() {
    intro(chalk.bold("Logout...."));
    const token = await getStoredToken();

    if (!token) {
        console.log("You are not logged in....");
        process.exit(0);
    }

    const shouldLogout = await confirm({
        message: "Are you sure you want to logout ?",
        initialValue: false,
    });

    if (isCancel(shouldLogout) || !shouldLogout) {
        cancel("Logout Cancelled");
        process.exit(0);
    }

    const cleared = await clearStoredToken();

    if (cleared) {
        outro(chalk.green("Successfully logged out"));
    } else {
        console.log(chalk.yellow("Could not clear token file."));
    }
}

export const whoamiAction = async () => {
    const token = await getStoredToken();

    if (!token?.access_token) {
        console.log("No access token found. Please login");
        process.exit(1);
    }

    const user = await prisma.user.findFirst({
        where: {
            sessions: {
                some: {
                    token: token.access_token
                },
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true
        },
    });

    if (!user) {
        console.log(chalk.red("User not found in database. The session might be invalid."));
        process.exit(1);
    }

    console.log(chalk.greenBright(`User: ${user.name || "N/A"}, Email: ${user.email}, id: ${user.id}`));

}
// Command Setup

export const login = new Command("login")
    .description("Login to better auth")
    .option("--server-url <url>", "The better auth server url", URL)
    .option("--client-id <id>", "The better auth client id", CLIENT_ID)
    .action(loginAction);

export const logout = new Command("logout")
    .description("Logout the user out")
    .action(logoutAction);

export const whoami = new Command("whoami")
    .description("Who Am I ?")
    .action(whoamiAction);


