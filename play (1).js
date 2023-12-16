// play.js
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { ChannelType } = require('discord.js'); // Corrected import
const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const fs = require('fs').promises;
const { Readable } = require('stream');
const { generatePlaylistPrompt } = require('./playlistGenerator'); // Assuming it's in the same directory


let fetch;

(async () => {
    fetch = (await import('node-fetch')).default;
})();


module.exports = {
    name: 'play',
    description: 'Play or add a song from YouTube by entering a song name, band name, or both',
    async execute(message, args, client) {
        if (!args.length) return message.channel.send('You need to provide a song name or YouTube URL!');

        if (!message.member || !message.member.voice.channel) {
            return message.channel.send('You need to be in a voice channel to play music!');
        }
        const voiceChannel = message.member.voice.channel;

        if (!client.queue) client.queue = new Map();
        const serverQueue = client.queue.get(message.guild.id) || {
            songs: [],
            history: [],
            connection: null,
            player: null,
            playing: true
        };

         const searchQuery = args.join(' ');
        let songUrl, songTitle;

        if (!ytdl.validateURL(searchQuery)) {
            try {
                const searchResults = await YouTube.search(searchQuery, { limit: 1 });
                if (searchResults.length === 0) {
                    return message.channel.send('No results found for your query.');
                }
                songUrl = searchResults[0].url;
                songTitle = searchResults[0].title;
            } catch (error) {
                console.error(error);
                return message.channel.send('There was an error searching for your query.');
            }
        } else {
            songUrl = searchQuery;
            const videoInfo = await ytdl.getInfo(songUrl);
            songTitle = videoInfo.videoDetails.title;
        }

        console.log(`Adding to queue: ${songTitle}`);
        serverQueue.songs.push({ url: songUrl, title: songTitle }); // Pushing an object
        client.queue.set(message.guild.id, serverQueue);


        if (client.recentlyPlayed.unshift(songTitle) > 20) {
            client.recentlyPlayed.pop();
        }

        if (!serverQueue.connection) {
            try {
                serverQueue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });
                serverQueue.player = createAudioPlayer();
				
				
				serverQueue.player.setMaxListeners(20);

                serverQueue.connection.subscribe(serverQueue.player);
                
                playSong(message.guild, serverQueue.songs[0], client);
            } catch (error) {
                console.error(error);
                message.channel.send('There was an error connecting to the voice channel.');
                serverQueue.songs = [];
                client.queue.delete(message.guild.id);
            }
 } else {
            message.channel.send(`Added to queue: ${songTitle}`);
        }
    },
};


async function playSong(guild, song, client) {
    console.log(`Attempting to play song: ${song?.title}`);
    const serverQueue = client.queue.get(guild.id);

    if (!song) {
        // Queue is empty, play TTS message
        console.log("Queue is empty, playing TTS message");
        await playTTSMessage(client, guild.id, "Fetching new playlist, please wait...");

        // After TTS message, fetch new playlist and play
        await handleEmptyQueue(client, guild);
        return;
    }

    const streamOptions = { 
        filter: 'audioonly', 
        highWaterMark: 1 << 25

        // Omit 'quality' to allow automatic selection
    };

    const stream = ytdl(song.url, streamOptions);
    const resource = createAudioResource(stream, { 
        inputType: StreamType.Arbitrary,
        inlineVolume: true 
    });
    resource.volume.setVolume(2.0); 
    serverQueue.player.play(resource);

    serverQueue.player.once(AudioPlayerStatus.Idle, async () => {
        serverQueue.history.push(serverQueue.songs.shift());
        const nextSong = serverQueue.songs[0];

        if (nextSong) {
            playSong(guild, nextSong, client);
        } else {
            console.log("Reached end of queue, fetching new playlist...");
            await handleEmptyQueue(client, guild);
        }
    });

    serverQueue.player.on('error', error => {
        console.error('Error in serverQueue.player:', error);
        // Handle error, perhaps by skipping to the next song or resetting the player
    });
}


// Make sure to define elevenLabsTTS and handleEmptyQueue functions properly.

// Inside an appropriate part of your bot's code
const guildId = '1179095447466426498'; // Replace with actual guild ID

async function handleEmptyQueue(client, guild) {
    if (client.isFetchingOpenAIPlaylist) {
        console.log("OpenAI fetch already in progress. Waiting...");
        return;
    }

    client.isFetchingOpenAIPlaylist = true;

    client.isFetchingPlaylist = true;
    const guildId = guild.id;

    // First, get the prompt text
    const promptText = await generatePlaylistPrompt();
    console.log('Received prompt text:', promptText);

    // Now use promptText to create the prompt
    const prompt = [{ role: "system", content: promptText }];
    const { commands, responseText } = await fetchNewPlaylist(prompt, client);

    // Play TTS message with response text
    await playTTSMessage(client, guildId, responseText);

     console.log("Handling empty queue...");
    const serverQueue = client.queue.get(guild.id);

    if (!serverQueue) {
        console.error('No server queue found for guild');
        return;
    }

    for (const songName of commands) {
        console.log(`Attempting to add to queue: ${songName}`);
        const searchResults = await YouTube.search(songName, { limit: 1 });
        if (searchResults.length === 0) {
            console.error(`No results found for: ${songName}`);
            continue;
        }

        const song = {
            url: searchResults[0].url,
            title: searchResults[0].title
        };

        serverQueue.songs.push(song);
        console.log(`Added to queue from new playlist: ${song.title}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (serverQueue.player.state.status !== AudioPlayerStatus.Playing && serverQueue.songs.length > 0) {
        playSong(guild, serverQueue.songs[0], client);
    }
}


async function fetchNewPlaylist(prompt, client) {
    console.log("Fetching new playlist...");
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-1106-preview",
                messages: prompt,
                temperature: 0.9,
                max_tokens: 150
            })
        });
        const data = await response.json();
        const responseText = data.choices[0].message.content;
        console.log("Fetched new playlist successfully.");

        const commandRegex = /!play\s+([\s\S]+?)(?=$|!play\s+)/g;
        let match;
        let commands = [];

        while ((match = commandRegex.exec(responseText)) !== null) {
            commands.push(match[1].trim());
        }

        return { commands, responseText };
    } catch (error) {
        console.error('Error fetching new playlist:', error);
        return { commands: [], responseText: "" };
    }
}



// Add this at the end of your play.js file
module.exports.playSong = playSong;



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
            text: 'Youre listening to the Frequency Funhouse. Im your host Lio! Now lets get jamming with another playlist.',
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

async function playTTSMessage(client, guildId, message) {
    console.log("playTTSMessage: Playing TTS message for guild", guildId);

    // Remove all instances of '!play' commands from the message
    const cleanedMessage = message.replace(/!play\s+[^\n]+/g, '').trim();
    console.log("Cleaned message for TTS:", cleanedMessage);

    if (!cleanedMessage) {
        console.error("playTTSMessage: Cleaned message is empty. Skipping TTS.");
        return;
    }

    const buffer = await elevenLabsTTS(cleanedMessage);
    if (!buffer) {
        console.error("playTTSMessage: Failed to generate TTS. Buffer is null.");
        return;
    }

    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(Buffer.from(buffer));
    readableStream.push(null);

    const resource = createAudioResource(readableStream, { inputType: StreamType.Arbitrary });
    const serverQueue = client.queue.get(guildId);

    if (serverQueue && serverQueue.connection && serverQueue.player) {
        console.log("playTTSMessage: Playing resource in server queue");
        serverQueue.player.play(resource);
        return new Promise((resolve) => {
            serverQueue.player.once(AudioPlayerStatus.Idle, () => {
                console.log("playTTSMessage: TTS message playback completed");
                resolve();
            });
        });
    } else {
        console.error("playTTSMessage: Server queue or player not found");
    }
}
