// Import necessary libraries
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs'); // Import the fs module for synchronous methods
const fsp = fs.promises; // Use fs.promises for asynchronous methods
const allowedChannels = ['Frequency Funhouse'];
require('dotenv').config();

let fetch;

(async () => {
    fetch = (await import('node-fetch')).default;
})();


// Create a new Discord client with the specified intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Keep this if needed
    ]
});

// Initialize the recently played songs log
client.recentlyPlayed = [];

// Command collection
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log(`Loaded command: ${command.name}`); // Add this line

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

// Additional variables from the new script
const recentMessages = new Map();
const maxMessages = 10;
const cooldown = 60000;
let lastResponseTime = 0;


client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!allowedChannels.includes(message.channel.name)) return;

    // Split the message into lines for individual command processing
    const lines = message.content.split('\n');

    for (const line of lines) {
        // Process each line that starts with '!'
        if (line.startsWith('!')) {
            const args = line.slice(1).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (!client.commands.has(commandName)) continue;
            const command = client.commands.get(commandName);

            try {
                await command.execute(message, args, client);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second
            } catch (error) {
                console.error(error);
                await message.reply('There was an error trying to execute that command!');
            }
        }
    }

    if (message.mentions.has(client.user.id)) {
        // Special handling when the bot is mentioned
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastResponseTime;

        if (timeElapsed > cooldown) {
            lastResponseTime = currentTime;

            const userMessage = { role: "user", content: `${message.author.username}: ${message.content}` };
            const fetchedResponse = await fetchOpenAIResponse([userMessage], message.channelId);
            console.log("Fetched response: ", fetchedResponse); // Log the fetched response

        const { commands, restOfResponse } = processResponse(fetchedResponse);

        for (const { command, commandArgs } of commands) {
            console.log(`Executing command: ${command} with arguments: ${commandArgs.join(" ")}`);
            const commandToExecute = client.commands.get(command.toLowerCase());
            if (commandToExecute) {
                try {
                    // Properly format arguments for the play command
                    const formattedArgs = formatArgumentsForCommand(command, commandArgs);
                    await commandToExecute.execute(message, formattedArgs, client);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second
                } catch (error) {
                    console.error(error);
                    await message.reply(`There was an error trying to execute the ${command} command!`);
                }
            }
        }


            // Send the rest of the response as a message
            if (restOfResponse) {
                await message.reply(restOfResponse);
            }
        } else {
            await message.reply(`Busy messing with equipment. Give me a sec and let me know what I can do to help! <3`);
        }
    }
    // Additional handling for other types of messages can be added here
});


function processResponse(response) {
    const commandRegex = /!(\w+)\s*([\s\S]*?)(?=$|!\w+)/g; // Regex to match multiple commands
    let matches;
    let commands = [];
    let restOfResponse = response;

    while ((matches = commandRegex.exec(response)) !== null) {
        let commandName = matches[1];
        let commandArgs = matches[2].split(/ +/).filter(arg => arg.length > 0);
        commands.push({ command: commandName, commandArgs: commandArgs });
        restOfResponse = restOfResponse.replace(matches[0], '').trim(); // Remove the matched command from restOfResponse
    }

    return { commands, restOfResponse };
}




async function fetchOpenAIResponse(messages, channelId) {
    // Read the system message from file
    const systemMessageContent = await fsp.readFile('systemMessage.txt', 'utf8');
    const systemMessage = {
        role: "system",
        content: systemMessageContent
    };

        // Include recently played songs in the conversation
    const recentlyPlayedMessages = client.recentlyPlayed.map(song => {
        return { role: "system", content: `Recently played: ${song}` };
    });

    const conversation = [systemMessage, ...recentlyPlayedMessages, ...messages];
	console.log(conversation);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-1106-preview",
                messages: conversation,
                temperature: 0.9,
                max_tokens: 150
            })
        });

        const data = await response.json();
        console.log(data);

        if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
            return 'Sorry, I could not generate a response.';
        }

        // Process the response
        return data.choices[0].message.content.trim().replace(/^[^:]*:\s*/, '');
    } catch (error) {
        console.error('Error fetching response from OpenAI:', error);
        return 'An error occurred while fetching the response.';
    }
}


function formatArgumentsForCommand(command, args) {
    if (command.toLowerCase() === 'play' && args.length) {
        // If it's the play command, join the arguments as they represent a song name or URL
        return [args.join(' ')];
    }
    return args;
}

// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);
