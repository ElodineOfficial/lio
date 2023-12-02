const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const { playSong } = require('./play'); // Import playSong from play.js


module.exports = {
    name: 'playnext',
    description: 'Add a song to the front of the queue',
    async execute(message, args, client) {
        if (!args.length) return message.channel.send('You need to provide a song name or YouTube URL!');
        if (!message.member.voice.channel) return message.channel.send('You need to be in a voice channel to play music!');

        const searchQuery = args.join(' ');
        let songUrl, songTitle;

        try {
            if (ytdl.validateURL(searchQuery)) {
                const videoInfo = await ytdl.getInfo(searchQuery);
                songTitle = videoInfo.videoDetails.title;
                songUrl = videoInfo.videoDetails.video_url;
            } else {
                const searchResults = await YouTube.search(searchQuery, { limit: 1 });
                if (searchResults.length === 0) throw new Error('No results found');
                songUrl = searchResults[0].url;
                songTitle = searchResults[0].title;
            }
        } catch (error) {
            console.error(error);
            return message.channel.send('Error processing your request.');
        }

        if (!client.queue.has(message.guild.id)) {
            return message.channel.send("There's no music playing right now.");
        }

        const serverQueue = client.queue.get(message.guild.id);
        serverQueue.songs.unshift({ title: songTitle, url: songUrl });
        message.channel.send(`Added to the front of the queue: ${songTitle}`);

        // Play the next song if nothing is currently playing
        if (serverQueue.player.state.status !== AudioPlayerStatus.Playing) {
            const play = require('./play.js');
            play.playSong(message.guild, serverQueue.songs[0], client);
        }
    },
};
