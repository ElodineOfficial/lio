// shuffle.js
module.exports = {
    name: 'shuffle',
    description: 'Shuffle the current music queue',
    execute(message, args, client) {
        if (!client.queue || !client.queue.get(message.guild.id)) {
            return message.channel.send('There is no queue to shuffle!');
        }

        const serverQueue = client.queue.get(message.guild.id);

        if (serverQueue.songs.length <= 1) {
            return message.channel.send('There are not enough songs in the queue to shuffle.');
        }

        // Log the queue before shuffling
        console.log("Queue before shuffling:", serverQueue.songs);

        // Shuffle the queue excluding the currently playing song
        const currentSong = serverQueue.songs.shift();
        const shuffledSongs = shuffleArray([...serverQueue.songs]);
        serverQueue.songs = [currentSong, ...shuffledSongs];

        // Log the queue after shuffling
        console.log("Queue after shuffling:", serverQueue.songs);

        message.channel.send('Shuffled the music queue!');
    },
};

// Utility function to shuffle an array and return it
function shuffleArray(array) {
    let shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
}

