const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const { createAudioResource } = require('@discordjs/voice');

module.exports = {
    name: 'playnow',
    description: 'Immediately play a requested song, stopping the current song',
    async execute(message, args, client) {
        if (!args.length) return message.channel.send('You need to provide a song name or YouTube URL!');

        if (!message.member.voice.channel) {
            return message.channel.send('You need to be in a voice channel to play music!');
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

        const guildId = message.guild.id;
        const serverQueue = client.queue.get(guildId);

        if (!serverQueue) {
            return message.channel.send("The bot is not currently playing music.");
        }

        // Stop the current song and clear the current playing song
        serverQueue.player.stop();
        serverQueue.songs.shift();

        // Create a new song resource and play it immediately
        const streamOptions = { filter: 'audioonly', highWaterMark: 1 << 25, quality: 'highestaudio' };
        const stream = ytdl(songUrl, streamOptions);
        const resource = createAudioResource(stream);
        serverQueue.player.play(resource);

        // Add the song to the beginning of the queue
        serverQueue.songs.unshift({ url: songUrl, title: songTitle });

        message.channel.send(`Now playing: ${songTitle}`);
    },
};
