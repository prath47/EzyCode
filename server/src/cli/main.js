#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import figlet from 'figlet';

import { Command } from 'commander';
import { login } from './commands/auth/login.js';

dotenv.config();

async function main() {
    // Display Banner
    console.log(chalk.cyan(figlet.textSync('EzyCode CLI', {
        font: 'Standard',
        horizontalLayout: 'default'
    })));
    console.log('\n');
    console.log(chalk.red("A CLI Based AI Tool \n"));

    const program = new Command('ezycode');

    program.version('0.0.1')
    .description('EzyCode CLI - A CLI Based AI Tool')
    .addCommand(login)

    // default action show help
    program.action(() => {
        program.help();
    });

    program.parse();

}

main().catch((error) => {
    console.error(chalk.red(error));
    process.exit(1);
});