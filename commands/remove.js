// remove.js
module.exports = {
    name: 'remove',
    description: 'Remove a specific song from the queue by its position number',
    execute(message, args, client) {
        if (!args.length) {
            return message.channel.send('You need to provide the position number of the song to remove!');
        }

        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue || serverQueue.songs.length === 0) {
            return message.channel.send('There is no song in the queue to remove.');
        }

        // Parse the position number from the arguments
        const position = parseInt(args[0], 10);

        // Adjust position to align with the queue array, considering the currently playing song
        const queuePosition = position; // No need to subtract 1 as serverQueue.songs[0] is currently playing

        // Check if the position is a valid number and within the queue range
        if (isNaN(queuePosition) || queuePosition < 1 || queuePosition >= serverQueue.songs.length) {
            return message.channel.send('Invalid position number. Position 1 is the first song in the queue.');
        }

        // Remove the song from the queue
        const removedSong = serverQueue.songs.splice(queuePosition, 1)[0];
        message.channel.send(`Removed the song from the queue: ${removedSong.title}`);
    },
};
