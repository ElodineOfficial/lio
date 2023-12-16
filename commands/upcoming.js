// upcoming.js
module.exports = {
    name: 'upcoming',
    description: 'Display the upcoming songs in the queue',
    async execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue || serverQueue.songs.length <= 1) {
            return message.channel.send('There are no upcoming songs.');
        }

        let responseMessage = '🎶 **Upcoming Songs:**\n';
        // Start from 1 to skip the currently playing song
        for (let i = 1; i < serverQueue.songs.length; i++) {
            responseMessage += `${i}. ${serverQueue.songs[i].title}\n`;
        }

        return message.channel.send(responseMessage);
    },
};
