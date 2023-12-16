const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');
const fs = require('fs');

const commands = [];

// Load only the 'back.js' command
console.log(`Loading command from file: ping.js`); // Debug: Log the file being loaded
const command = require(`./commands/ping.js`);
commands.push(command.data.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log('Successfully registered application command: back.'))
    .catch(console.error);
