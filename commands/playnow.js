const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const fs = require('fs');
const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, StreamType, createAudioResource } = require('@discordjs/voice');
const { playSong } = require('./play'); // Import playSong function

const cacheDir = './cache'; // Cache directory

module.exports = {
    name: 'playnow',
    description: 'Immediately plays a specified song from YouTube',
    execute: async (message, args, client) => {
        if (!args.length) {
            return message.channel.send('You need to provide a song name or YouTube URL!');
        }

        if (!message.member || !message.member.voice.channel) {
            return message.channel.send('You need to be in a voice channel to play music!');
        }
        const voiceChannel = message.member.voice.channel;
        const guildId = process.env.GUILD_ID || message.guild.id;
        let serverQueue = client.queue.get(guildId);

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

        // Download song
        const sanitizedTitle = songTitle.replace(/[^a-zA-Z0-9 ]/g, '');
        const songPath = `${cacheDir}/${sanitizedTitle}.mp3`;

        if (!fs.existsSync(songPath)) {
            console.log(`Downloading song: ${songTitle}`);
            const stream = ytdl(songUrl, { filter: 'audioonly' });
            stream.pipe(fs.createWriteStream(songPath))
                .on('finish', async () => {
                    console.log(`Downloaded: ${songTitle}`);
                    playDownloadedSong(songPath, message, serverQueue, client);
                })
                .on('error', error => {
                    console.error(`Error downloading ${songTitle}:`, error);
                });
        } else {
            console.log(`Playing from cache: ${songTitle}`);
            playDownloadedSong(songPath, message, serverQueue, client);
        }
    },
};

function playDownloadedSong(songPath, message, serverQueue, client) {
    // Stop current music
    if (serverQueue && serverQueue.player) {
        serverQueue.player.stop();
        serverQueue.songs = [];
    }

    // Logic to play the downloaded song
    const resource = createAudioResource(fs.createReadStream(songPath), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
    });
    resource.volume.setVolume(1.0); // Adjust volume as needed

    if (!serverQueue.connection) {
        serverQueue.connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });
        serverQueue.player = createAudioPlayer();
        serverQueue.connection.subscribe(serverQueue.player);
    }

    serverQueue.player.play(resource);
}
