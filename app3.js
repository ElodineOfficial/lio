// Import necessary libraries
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const fsp = fs.promises;
const allowedChannels = ['Frequency Funhouse'];
require('dotenv').config();
const testevent = require('./events/testevent');
const path = require('path');
const { scheduleYouTubePlayback } = require('./events/testevent');
const { Readable } = require('stream');
const { playSong, playDownloadedSong, handleEmptyQueue } = require('./commands/play');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');





let fetch;
(async () => {
    fetch = (await import('node-fetch')).default;
})();

// Create a new Discord client with the specified intents and partials
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Initialize client.queue here
client.queue = new Map();
global.lastPlayedSong = null;
client.isFetchingOpenAIPlaylist = false;
client.recentlyPlayed = [];
client.commands = new Collection();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Load and execute the test event immediately for testing
    const testEvent = require('./events/testevent');
    testEvent.execute(client);
});




// Initialize the recently played songs log
client.recentlyPlayed = [];

// Command collection
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    console.log(`Loading command file: ${file}`);
    const command = require(`./commands/${file}`);

    // Check if the export is a function or has an 'execute' method
    if (typeof command === 'function' || command.execute) {
        // Determine the command name
        const commandName = command.name || (command.data && command.data.name);

        // Log details about the command structure
        console.log(`Loaded command structure:`, command);
        console.log(`Command name determined as: ${commandName}`);

        if (commandName) {
            console.log(`Registering command: ${commandName}`);
            client.commands.set(commandName, command);
        } else {
            console.error(`Command file ${file} is missing a name property.`);
        }
    } else {
        console.error(`Command file ${file} does not export a valid structure.`);
    }
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
    const guildId = process.env.GUILD_ID || message.guild.id; // Use guild ID from .env file or fallback to message.guild.id
        let serverQueue = client.queue.get(guildId);
    if (!serverQueue) {
        serverQueue = {
            songs: [],
            history: [],
            connection: null,
            player: null,
            playing: true,
            client: client // Storing client reference in serverQueue
        };
            client.queue.set(guildId, serverQueue);
    }

    if (message.author.bot) return;
    if (!allowedChannels.includes(message.channel.name)) return;

    // Split the message into lines for individual command processing
    const lines = message.content.split('\n');

    for (const line of lines) {
        if (line.startsWith('!')) {
            const args = line.slice(1).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (!client.commands.has(commandName)) continue;
            const command = client.commands.get(commandName);

            try {
                await command.execute(message, args, client);
            } catch (error) {
                console.error(error);
                await message.reply('There was an error trying to execute that command!');
            }
        }
    }

    if (message.mentions.has(client.user.id)) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastResponseTime;

        if (timeElapsed > cooldown) {
            lastResponseTime = currentTime;

            const userMessage = { role: "user", content: `${message.author.username}: ${message.content}` };
            const fetchedResponse = await fetchOpenAIResponse([userMessage], message.channelId);
            console.log("Fetched response: ", fetchedResponse);

            const { commands, restOfResponse } = processResponse(fetchedResponse);

            if (restOfResponse) {
                try {
                    const voiceChannelId = message.member.voice.channel ? message.member.voice.channel.id : null;
                    if (!voiceChannelId) {
                        await message.reply("You need to be in a voice channel for me to speak.");
                        return;
                    }

                    await playTTSMessage(client, guildId, restOfResponse, voiceChannelId, serverQueue);

              
                } catch (error) {
                    console.error('Error with TTS:', error);
                    await message.reply('Sorry, I had trouble speaking the response.');
                }
            }

            for (const { command, commandArgs } of commands) {
                const commandToExecute = client.commands.get(command.toLowerCase());
                if (commandToExecute) {
                    try {
                        const formattedArgs = formatArgumentsForCommand(command, commandArgs);
                        await commandToExecute.execute(message, formattedArgs, client);
                    } catch (error) {
                        console.error(error);
                        await message.reply(`There was an error trying to execute the ${command} command!`);
                    }
                }
            }
        } else {
            await message.reply(`Busy messing with equipment. Give me a sec and let me know what I can do to help! <3`);
        }
    }
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

async function elevenLabsTTS(text) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream`; // Replace with your voice ID
    const requestOptions = {
        method: 'POST',
        headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model_id: "eleven_multilingual_v2", // Replace with your model id
            text: text,
            voice_settings: {
                similarity_boost: 1,
                stability: 1,
                style: 1,
                use_speaker_boost: true
            }
        })
    };

    const response = await fetch(url, requestOptions);
    const buffer = await response.arrayBuffer();
    return buffer;
}

async function playTTSMessage(client, guildId, message, voiceChannelId) {
    console.log("Preparing to play TTS message");

    // Check and join the voice channel if not connected
    let serverQueue = client.queue.get(guildId);
    if (!serverQueue || !serverQueue.connection) {
        if (!voiceChannelId) {
            console.error("No voice channel ID provided");
            return;
        }

        const voiceChannel = client.channels.cache.get(voiceChannelId);
        if (!voiceChannel) {
            console.error("Voice channel not found");
            return;
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // Update or initialize serverQueue
        serverQueue = serverQueue || {
            songs: [],
            history: [],
            connection: connection,
            player: createAudioPlayer(), // Assuming you have a function to create or get an AudioPlayer
            playing: true,
            client: client
        };
        client.queue.set(guildId, serverQueue);
    }

    const buffer = await elevenLabsTTS(message);
    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(Buffer.from(buffer));
    readableStream.push(null);

    const resource = createAudioResource(readableStream, { inputType: StreamType.Arbitrary });
    
    if (!serverQueue.player) {
        console.error("Server queue does not have a valid player");
        return;
    }

    console.log("Playing TTS message");
    serverQueue.player.play(resource);
    return new Promise((resolve) => {
        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            console.log("TTS message playback finished");
            resolve();
        });
    });
}


module.exports = playTTSMessage;


// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);
