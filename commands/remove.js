// remove.js
module.exports = {
    name: 'remove',
    description: 'Remove a specific song from the queue',
    execute(message, args, client) {
        if (!args.length) {
            return message.channel.send('You need to provide a YouTube URL to remove!');
        }

        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue || serverQueue.songs.length === 0) {
            return message.channel.send('There is no song in the queue to remove.');
        }

        // URL to remove
        const urlToRemove = args[0];
        
        // Find the index of the song
        const songIndex = serverQueue.songs.findIndex(song => song === urlToRemove);

        if (songIndex === -1) {
            return message.channel.send('The song was not found in the queue.');
        }

        // Remove the song from the queue
        serverQueue.songs.splice(songIndex, 1);
        message.channel.send(`Removed the song from the queue: ${urlToRemove}`);
    },
};
