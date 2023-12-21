const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { ChannelType } = require('discord.js');
const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const fs = require('fs'); // Use standard fs for synchronous operations
const fsPromises = require('fs').promises; // Use fs.promises for asynchronous operations
const { Readable } = require('stream');
const { generatePlaylistPrompt } = require('./playlistGenerator');
let fetch;
require('dotenv').config();

(async () => {
    fetch = (await import('node-fetch')).default;
})();

// Ensure the cache directory exists
const cacheDir = './cache';
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
}



console.log('Exporting from play.js:', module.exports);

module.exports = {
    name: 'play',
    description: 'Play or add a song from YouTube by entering a song name, band name, or both',
    execute: async (message, args, client) => {
        if (!args.length) return message.channel.send('You need to provide a song name or YouTube URL!');

        if (!args.length) return message.channel.send('You need to provide a song name or YouTube URL!');

        if (!args.length) return message.channel.send('You need to provide a song name or YouTube URL!');

        if (!message.member || !message.member.voice.channel) {
            return message.channel.send('You need to be in a voice channel to play music!');
        }
        const voiceChannel = message.member.voice.channel;

        const guildId = process.env.GUILD_ID || message.guild.id; // Fallback to message.guild.id if .env is missing

        let serverQueue = client.queue.get(guildId);
       
        // Initialize the serverQueue if it does not exist
        if (!serverQueue) {
            serverQueue = {
                songs: [],
                history: [],
                connection: null,
                player: null,
                playing: true,
                voiceChannel: voiceChannel,
                client: client // Storing client reference in serverQueue
            };
            client.queue.set(guildId, serverQueue);
        }

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
        serverQueue.songs.push({ url: songUrl, title: songTitle });

        if (!serverQueue.connection) {
            try {
                serverQueue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                });
                serverQueue.player = createAudioPlayer();
                serverQueue.player.setMaxListeners(20);
                serverQueue.connection.subscribe(serverQueue.player);
            } catch (error) {
                console.error(error);
                message.channel.send('There was an error connecting to the voice channel.');
                serverQueue.songs = [];
                client.queue.delete(message.guild.id);
                return;
            }
        }

        // Call playSong if this is the first song in the queue
        if (serverQueue.songs.length === 1) {
            playSong(message.guild, serverQueue.songs[0], client);
        } else {
            message.channel.send(`Added to queue: ${songTitle}`);
        }
    },
    playSong,
    playDownloadedSong,
    handleEmptyQueue
};

async function playSong(guild, song, client) {
    console.log(`Attempting to play song: ${song?.title}`);
    const guildId = process.env.GUILD_ID || guild.id;
    let serverQueue = client.queue.get(guildId);

    // Initialize the player if it does not exist
    if (!serverQueue.player) {
        serverQueue.player = createAudioPlayer();
        if (serverQueue.connection) {
            serverQueue.connection.subscribe(serverQueue.player);
        } else {
            console.error('No voice connection available for the player.');
            return;
        }
    }

    if (!song) {
        console.log("Queue is empty");
        await handleEmptyQueue(client, guild);
        return;
    }

    const sanitizedTitle = song.title.replace(/[^a-zA-Z0-9 ]/g, "");
    const songPath = `${cacheDir}/${sanitizedTitle}.mp3`;

    if (!fs.existsSync(songPath)) {
    console.log(`Downloading song: ${song.title}`);
    const stream = ytdl(song.url, { 
        quality: 'highestaudio', 
        filter: 'audioonly',
        highWaterMark: 1 << 25 // Increase buffer size for smoother downloads
    });
        stream.pipe(fs.createWriteStream(songPath))
            .on('finish', () => {
                console.log(`Downloaded: ${song.title}`);
                playDownloadedSong(songPath, serverQueue, guild, client, song); // Pass the current song object here
            })
            .on('error', error => {
                console.error(`Error downloading ${song.title}:`, error);
            });
    } else {
        console.log(`Playing from cache: ${song.title}`);
        playDownloadedSong(songPath, serverQueue, guild, client, song); // Pass the current song object here
    }
}

 function playDownloadedSong(songPath, serverQueue, guild, client, currentSong) {
    // Ensure serverQueue and its player are properly initialized
    if (!serverQueue || !serverQueue.player) {
        console.error("Server queue or player is not initialized.");
        return;
    }

    // Creating the audio resource for the current song
    const resource = createAudioResource(fs.createReadStream(songPath), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
    });
    resource.volume.setVolume(2.0);
    serverQueue.player.play(resource);

    console.log(`Now playing from cache: ${currentSong.title}`);

    serverQueue.player.once(AudioPlayerStatus.Idle, async () => {
        console.log(`Finished playing: ${currentSong.title}`);

        // Update the last played song before fetching the next song
        client.lastPlayedSong = currentSong;

        // Remove the played song from the queue
        serverQueue.songs.shift();

        const nextSong = serverQueue.songs[0]; // Get the next song from the queue

        // Delete the song file after playing
        if (fs.existsSync(songPath)) {
            fs.unlink(songPath, (err) => {
                if (err) console.error(`Error deleting file ${songPath}:`, err);
                else console.log(`Deleted from cache: ${songPath}`);
            });
        }

        // Play the next song if available
        if (nextSong) {
            playSong(guild, nextSong, client);
        } else {
            console.log("Reached end of queue, fetching new playlist...");
            await handleEmptyQueue(serverQueue.client, guild);
        }
    });

    serverQueue.player.on('error', error => {
        console.error('Error in serverQueue.player:', error);
        // Handle error, perhaps by skipping to the next song or resetting the player
    });
}



async function fetchNewPlaylist(prompt, client) {
    console.log("Fetching new playlist with prompt:", prompt);
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
        console.log("Fetched new playlist successfully. Response:", responseText);

        const commandRegex = /!play\s+([\s\S]+?)(?=$|!play\s+)/g;
        let match;
        let commands = [];

        while ((match = commandRegex.exec(responseText)) !== null) {
            commands.push(match[1].trim());
            console.log(`Found song command: ${match[1].trim()}`);
        }

        return { commands, responseText };
    } catch (error) {
        console.error('Error fetching new playlist:', error);
        return { commands: [], responseText: "" };
    }
}

async function handleEmptyQueue(client, guild) {
    const guildId = process.env.GUILD_ID || guild.id;
    
    try {
        const dynamicPrompt = await generatePlaylistPrompt();
        console.log('Dynamic prompt generated:', dynamicPrompt);
        const promptText = await fsPromises.readFile('newplaylist.txt', 'utf8');
        console.log('Static prompt text:', promptText);
        const combinedPrompt = dynamicPrompt + "\n" + promptText;
        const prompt = [{ role: "system", content: combinedPrompt }];        
        const { commands, responseText } = await fetchNewPlaylist(prompt, client);

        console.log("Handling empty queue...");
        const serverQueue = client.queue.get(guild.id);

        if (!serverQueue) {
            console.error('No server queue found for guild');
            return;
        }

        if (commands.length === 0) {
            console.log('No commands found in the fetched playlist:', responseText);
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
    } catch (error) {
        console.error('Error in handleEmptyQueue:', error);
    }
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
