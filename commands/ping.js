const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with "Message received!"'),
    async execute(interaction) {
        console.log('Ping command invoked'); // Log when command is invoked

        try {
            // Acknowledge the interaction immediately and give the bot up to 15 minutes to send a follow-up message
            await interaction.deferReply();
            console.log('Interaction deferred');

            // Simulate a delay for testing (optional, can be removed)
            // await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay

            // Send the actual reply
            await interaction.editReply('Message received!');
            console.log('Reply sent');
        } catch (error) {
            console.error('Error in ping command:', error);
            await interaction.followUp({ content: 'An error occurred while executing the command.', ephemeral: true });
        }
    }
};
