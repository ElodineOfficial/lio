// play.js
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { ChannelType } = require('discord.js'); // Corrected import
const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const fs = require('fs').promises;

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
    const serverQueue = client.queue.get(guild.id);

    if (!song) {
        // Keep the connection alive, but stop playing
        serverQueue.player.stop();
        return;
    }

const streamOptions = { 
    filter: 'audioonly', 
    highWaterMark: 32 * 1024 // 32KB
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
        if (serverQueue.songs.length > 0) {
            serverQueue.history.push(serverQueue.songs.shift());
            playSong(guild, serverQueue.songs[0], client);
        } else {
            await handleEmptyQueue(client, guild);
        }
    });

    serverQueue.player.on('error', error => {
        console.error('Error in serverQueue.player:', error);
        serverQueue.songs.shift();
        if (serverQueue.songs.length > 0) {
            playSong(guild, serverQueue.songs[0], client);
        } else {
            // Keep the connection alive, but stop playing
            serverQueue.player.stop();
        }
    });
}


async function handleEmptyQueue(client, guild) {
    try {
        const promptText = await fs.readFile('newplaylist.txt', 'utf8');
        const prompt = [{ role: "system", content: promptText }];
        const commands = await fetchNewPlaylist(prompt, client);

        const serverQueue = client.queue.get(guild.id);

        if (!serverQueue) {
            console.error('No server queue found for guild');
            return;
        }

        for (const songName of commands) {
            // Fetch song details like URL and title
            const searchResults = await YouTube.search(songName, { limit: 1 });
            if (searchResults.length === 0) {
                console.error(`No results found for: ${songName}`);
                continue; // Skip to the next song if no results found
            }

            const song = {
                url: searchResults[0].url,
                title: searchResults[0].title
            };

            serverQueue.songs.push(song);
            console.log(`Added to queue from new playlist: ${song.title}`);

            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between each addition
        }

        // If not already playing, start playing the first song
        if (serverQueue.player.state.status !== AudioPlayerStatus.Playing && serverQueue.songs.length > 0) {
            playSong(guild, serverQueue.songs[0], client);
        }

    } catch (error) {
        console.error('Error handling empty queue:', error);
    }
}





// This function now returns an array of commands extracted from the response
async function fetchNewPlaylist(prompt, client) {
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
        
        // Extract commands from the response
        const commandRegex = /!play\s+([\s\S]+?)(?=$|!play\s+)/g;
        let match;
        let commands = [];

        while ((match = commandRegex.exec(responseText)) !== null) {
            commands.push(match[1].trim());
        }

        return commands;
    } catch (error) {
        console.error('Error fetching new playlist:', error);
        return [];
    }
}

// Add this at the end of your play.js file
module.exports.playSong = playSong;
