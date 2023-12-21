const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const { createAudioPlayer, AudioPlayerStatus, StreamType, createAudioResource, joinVoiceChannel, Client } = require('@discordjs/voice');
const cacheDir = './cache'; // Ensure this matches the cache directory in play.js
const fs = require('fs'); // Import the File System module


module.exports = {
    name: 'testevent',
    description: 'Executes the !play command with a specific YouTube URL every 10 minutes past the hour.',
    execute(client) {
        console.log(`[${new Date().toString()}] Test event setup started.`);

        setInterval(async () => {
            const currentTime = new Date();
            if (currentTime.getMinutes() === 37) {
                console.log(`[${new Date().toString()}] It's 10 minutes past the hour. Executing !play command.`);

                const guildId = process.env.GUILD_ID; // Guild ID from .env
                const youtubeUrl = 'https://youtube.com/shorts/TBXXpY7IuAE?feature=share'; // The YouTube video URL
                const guild = client.guilds.cache.get(guildId);

                if (!guild) {
                    console.error(`[${new Date().toString()}] Guild not found.`);
                    return;
                }

                let serverQueue = client.queue.get(guildId);
                if (!serverQueue) {
                    console.log(`[${new Date().toString()}] Initializing new server queue.`);
                    serverQueue = {
                        songs: [],
                        connection: null,
                        player: createAudioPlayer(),
                        guild: guild,
                    };
                    client.queue.set(guildId, serverQueue);
                }

                let videoInfo;
                try {
                    videoInfo = await ytdl.getInfo(youtubeUrl);
                } catch (error) {
                    console.error(`[${new Date().toString()}] Error fetching video info: ${error}`);
                    return;
                }

                const song = {
                    url: youtubeUrl,
                    title: videoInfo.videoDetails.title,
                };

                console.log(`[${new Date().toString()}] Adding song to queue: ${song.title}`);
                serverQueue.songs.push(song);

                if (!serverQueue.connection) {
                    console.log(`[${new Date().toString()}] Establishing voice connection.`);
                    serverQueue.connection = joinVoiceChannel({
                        channelId: guild.channels.cache.find(ch => ch.type === 'GUILD_VOICE').id,
                        guildId: guild.id,
                        adapterCreator: guild.voiceAdapterCreator,
                    });
                    serverQueue.connection.subscribe(serverQueue.player);
                }

                if (serverQueue.songs.length === 1) {
                    console.log(`[${new Date().toString()}] Playing the only song in the queue.`);
                    playSong(guild, serverQueue.songs[0], client);
                } else {
                    console.log(`[${new Date().toString()}] Song added to queue, waiting for current song to finish.`);
                }
            }
        }, 60 * 1000); // Check every minute
        console.log(`[${new Date().toString()}] Test event setup completed.`);
    }
};

async function playSong(guild, song, client) {
    const guildId = process.env.GUILD_ID || guild.id;
    let serverQueue = client.queue.get(guildId);

    if (!serverQueue || !serverQueue.player) {
        console.error('Server queue or player is not initialized.');
        return;
    }

    if (!serverQueue.connection) {
        console.error('No voice connection available.');
        return;
    }

    if (!song) {
        console.log("Queue is empty, playing TTS message");
        await playTTSMessage(client, guild.id, "Fetching new playlist, please wait...");
        await handleEmptyQueue(client, guild);
        return;
    }

    const sanitizedTitle = song.title.replace(/[^a-zA-Z0-9 ]/g, '');
    const songPath = `${cacheDir}/${sanitizedTitle}.mp3`;

    if (fs.existsSync(songPath)) {
        console.log(`Playing from cache: ${song.title}`);
        playDownloadedSong(songPath, serverQueue, guild, client);
    } else {
        console.log(`Downloading song: ${song.title}`);
        const stream = ytdl(song.url, { filter: 'audioonly' });
        stream.pipe(fs.createWriteStream(songPath))
            .on('finish', () => {
                console.log(`Downloaded: ${song.title}`);
                playDownloadedSong(songPath, serverQueue, guild, client);
            })
            .on('error', error => {
                console.error(`Error downloading ${song.title}:`, error);
            });
    }
}

function playDownloadedSong(songPath, serverQueue, guild, client) {
    if (!serverQueue || !serverQueue.player) {
        console.error("Server queue or player is not initialized.");
        return;
    }

    if (serverQueue.songs.length === 0) {
        console.error("No songs in the queue to play.");
        return;
    }

    const resource = createAudioResource(fs.createReadStream(songPath), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
    });
    resource.volume.setVolume(2.0);

    if (serverQueue.player.state.status === AudioPlayerStatus.Idle) {
        serverQueue.player.play(resource);
    }

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();

        if (serverQueue.songs.length > 0) {
            playSong(guild, serverQueue.songs[0], client);
        } else {
            console.log("Queue is empty, no more songs to play.");
        }
    });

    serverQueue.player.on('error', error => {
        console.error('Error in serverQueue.player:', error);
    });
}
