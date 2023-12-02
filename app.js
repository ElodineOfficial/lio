// Import necessary libraries
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// Create a new Discord client with the specified intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // This line is crucial
        GatewayIntentBits.GuildVoiceStates // Add this line
    ]
});


// Command collection
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// Load events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Message listener for commands
client.on('messageCreate', message => {
	    console.log(`Received message: ${message.content}`);
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;
    const command = client.commands.get(commandName);

    try {
        // Pass the client object here
        command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});



for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    console.log(`Loading command: ${command.name}`);
    client.commands.set(command.name, command);
}


// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);
