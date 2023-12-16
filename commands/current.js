//current.js

module.exports = {
    name: 'current',
    description: 'Display the currently playing song',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue || serverQueue.songs.length === 0) {
            message.channel.send('There is no song currently playing.');
            return;
        }

        const currentSong = serverQueue.songs[0];
        message.channel.send(`🎶 Currently playing: ${currentSong.title}\nLink: ${currentSong.url}`);
    },
};
