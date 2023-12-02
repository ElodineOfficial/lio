// info.js
module.exports = {
    name: 'info',
    description: 'Display information about the currently playing song',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);
        if (!serverQueue || serverQueue.songs.length === 0) {
            return message.channel.send('There is no song currently playing.');
        }

        const currentSong = serverQueue.songs[0];
        message.channel.send(`🎶 Currently playing: ${currentSong.title}\nLink: ${currentSong.url}`);
    },
};
