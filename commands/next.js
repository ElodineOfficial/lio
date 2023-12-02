// next.js
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

        // Skip the current song
        serverQueue.player.stop();
        message.channel.send('Skipped to the next song!');
    },
};
