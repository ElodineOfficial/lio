const ytdl = require('ytdl-core'); // Add this line
const { createAudioResource } = require('@discordjs/voice');

module.exports = {
    name: 'back',
    description: 'Play the previous song in the queue',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue) {
            return message.channel.send('There is no song playing right now!');
        }

        if (!serverQueue.history || serverQueue.history.length === 0) {
            return message.channel.send('There is no previous song to play.');
        }

        // Get the last song from history
        const lastSong = serverQueue.history.pop();

        // Play the last song immediately
        playSong(message.guild, lastSong, client);
        message.channel.send(`Playing the previous song: ${lastSong.title}`);
    },
};

function playSong(guild, song, client) {
    const serverQueue = client.queue.get(guild.id);

    if (!song) {
        serverQueue.connection.destroy();
        client.queue.delete(guild.id);
        return;
    }

    // Make sure to use song.url here
    const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);
    serverQueue.player.play(resource);

    // Update the current song in the queue
    serverQueue.songs.unshift(song);
}
