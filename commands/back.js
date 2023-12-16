const { createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

module.exports = {
    name: 'back',
    description: 'Play the previous song in the queue',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue) {
            message.channel.send('There is no song playing right now!');
            return;
        }

        if (!serverQueue.history || serverQueue.history.length === 0) {
            message.channel.send('There is no previous song to play.');
            return;
        }

        const lastSong = serverQueue.history.pop();
        playSong(message.guild, lastSong, client);
        message.channel.send(`Playing the previous song: ${lastSong.title}`);
    }
};

function playSong(guild, song, client) {
    const serverQueue = client.queue.get(guild.id);

    if (!song) {
        serverQueue.connection.destroy();
        client.queue.delete(guild.id);
        return;
    }

    const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);
    serverQueue.player.play(resource);

    // Unshift song back to the beginning of the queue
    serverQueue.songs.unshift(song);
}
