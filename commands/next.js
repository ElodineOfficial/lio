// At the top of your next.js file
const { playSong } = require('./play');

module.exports = {
    name: 'next',
    description: 'Skip to the next song in the queue',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue) {
            return message.channel.send('There is no song playing right now!');
        }

        if (serverQueue.songs.length <= 1) {
            return message.channel.send('There are no more songs in the queue.');
        }

        // Skip the current song and get the next song
        serverQueue.songs.shift();

        // Play the next song if available
        if (serverQueue.songs.length > 0) {
            const nextSong = serverQueue.songs[0];
            if (nextSong) {
                playSong(message.guild, nextSong, client);
            }
            message.channel.send('Skipped to the next song!');
        } else {
            message.channel.send('There are no more songs in the queue.');
            // Additional logic for when the queue is empty (e.g., stop playback, leave channel)
        }
    },
};
