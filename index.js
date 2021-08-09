const fs = require('fs')
fs.truncate('out/err.log', 0, function(){})
fs.truncate('out/out.log', 0, function(){})

const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
require('./date.js');

const parseDate = require('parse-human-date')

const client = new Client({
    intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
	partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.once('ready', async () => {
	console.log('Ready!');
    
	if (!client.application?.owner) await client.application?.fetch();

    const data = [{
        name: 'schedule',
        description: 'Sets up a schedule post',
        options: [{
            name: 'role',
            type: 'ROLE',
            description: 'The runners role',
            required: true,
        }],
    },{
        name: 'exclusions',
        description: 'Lists your current excluded days',
    },{
        name: 'time',
        description: 'Sets up a post with a specific time',
        options: [{
            name: 'role',
            type: 'ROLE',
            description: 'The runners role',
            required: true,
        },{
            name: 'time',
            type: 'STRING',
            description: 'The time in CEST, for example: tomorrow 8pm',
            required: true,
        }],
    },{
        name: 'timepost',
        description: 'Sets up a time post respecting the schedule',
        options: [{
            name: 'time',
            type: 'STRING',
            description: 'The times in CEST, for example: 7pm 7:30pm 8pm ...',
            required: true,
        }],
    },{
        name: 'exclude',
        description: 'Excludes a day from your personal schedule (call it again to include it again)',
        options: [{
            name: 'day',
            type: 'STRING',
            description: 'The day',
            required: true,
            choices: [
                {
                    name: 'Monday',
                    value: 'monday',
                },
                {
                    name: 'Tuesday',
                    value: 'tuesday',
                },
                {
                    name: 'Wednesday',
                    value: 'wednesday',
                },
                {
                    name: 'Thursday',
                    value: 'thursday',
                },
                {
                    name: 'Friday',
                    value: 'friday',
                },
                {
                    name: 'Saturday',
                    value: 'saturday',
                },
                {
                    name: 'Sunday',
                    value: 'sunday',
                },
            ],
        }],
    }];

    await client.guilds.fetch();
    for (var e of client.guilds.cache) {
	    await e[1].members.fetch();

        for (var c of e[1].commands.cache)
            await c[1].delete();

        await e[1].commands.set(data);
    }
});

const daytranslate = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const daysymbols = [
    "⚪",
    "🔵",
    "🟤",
    "🟢",
    "🟠",
    "🟣",
    "🔴",
];

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = interaction.commandName;

    if (command === 'timepost') {
        const schedules = require('./schedules.json');
        var wat = await interaction.channel.messages.fetch(schedules[interaction.channel.id]);

        if (wat && wat.author.id == client.user.id)
        {
            await interaction.deferReply();
            var match = wat.content.match(/<@&(\d+)>/g);
            if (match != null)
            {
                var role = match[0].slice(3, -1);
                var members = wat.guild.roles.cache.get(role).members;
                var memberCount = members.size;
                for (const member of members) {
                    if (member[0] == client.id)
                        memberCount--;
                }

                var cmdmatches = interaction.options.getString("time").match(/([a-zA-Z0-9:]+)/g);

                var userlists = daysymbols;

                var emotelist = [
                    "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"
                ];

                var bestContent = "";
                var bestReactionCount = 0;

                for (var i = 0; i < 7; i++) {
                    var react = userlists[(i + 3) % 7];
                    var thing = await wat.reactions.resolve(react);
                    if (thing) {
                        var reacts = await thing.users.fetch();
                        var userlist = "";
                        var count = 0;
                        for (const thing of members) {
                            if (reacts.get(thing[0]) == null) {
                                userlist += "<@" + thing[0] + ">" + ", ";
                                count++;
                            }
                        }

                        userlists[(i + 3) % 7] = userlist.slice(0, -2);
                        
                        if ((count == memberCount || count >= 6) && count > bestReactionCount)  {
                            var content = `${daytranslate[(i + 3) % 7]}: React on times when you **CAN** run.\nMembers: ${userlists[(i + 3) % 7]}.\n`;

                            bestContent = content;
                            bestReactionCount = count;
                        }
                    }
                };

                if (bestReactionCount > 0) {
                    var content = bestContent;
                    var monday = new Date();
                    monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7);
                    monday.setDate(monday.getDate() + i + 3);
                    
                    var kek = Math.floor(monday.getTime() / 1000);
                    var c = 1;
                    for (const match of cmdmatches) {
                        if (c <= 10)
                            content += `${c++}) <t:${kek + (Date.parse(match) - Date.today()) / 1000 - 2 * 60 * 60 - kek % (24 * 60 * 60)}>\n`;
                    }

                    var wut = await interaction.channel.send({ content: content });
                    for (var f = 1; f < c; f++)
                        await wut.react(emotelist[f]);
                }
            }
            interaction.deleteReply();
            return;
        }
    } else if (command === 'exclude') {
        await interaction.deferReply({ ephemeral : true });
        const day = interaction.options.getString('day');
        
        const exclusions = require('./exclusions.json');

        if (exclusions[interaction.user.id] == null)
            exclusions[interaction.user.id] = {};

        exclusions[interaction.user.id][day] = !exclusions[interaction.user.id][day];

        let data = JSON.stringify(exclusions);
        fs.writeFileSync('./exclusions.json', data);

        interaction.editReply({ content: `${exclusions[interaction.user.id][day] ? `Added ${day} to` : `Removed ${day} from`} your exclusions.` });
    } else if (command === 'exclusions') {
        await interaction.deferReply({ ephemeral : true });
        
        const exclusions = require('./exclusions.json');

        if (exclusions[interaction.user.id] == null)
        {
            interaction.editReply({ content: `You currently have no excluded days.` });
        } else {
            var days = "";
            for (var i = 0; i < 7; i++)
            if (exclusions[interaction.user.id][daytranslate[i].toLowerCase()])
                days += daytranslate[i] + ", ";
            
            interaction.editReply({ content: days.length == 0 ? `You currently have no excluded days.` : `Excluded days: ${days.slice(0, -2)}` });
        }
    } else if (command === 'time') {
        await interaction.deferReply({ ephemeral : false });
        
        var cmdmatches = interaction.options.getString("time").match(/([a-zA-Z0-9:]+)/g);

        var time = Date.today().getTime() / 1000;
        for (const match of cmdmatches) {
            time += (Date.parse(match) - Date.today()) / 1000;
        }

        var msg = await interaction.editReply({ content: `<@&${interaction.options.getRole("role").id}>\n<t:${Math.floor(time) - 2 * 60 * 60}>` });
        
        await msg.react("👍");
        await msg.react("👎");
    } else if (command === 'schedule') {
        await interaction.deferReply();

        const role = interaction.options.getRole('role').id;
        var members = interaction.guild.roles.cache.get(role).members;

        var userlist = "";
        members.forEach((member) => {
            if (member.user.id != client.user.id)
                userlist += "<@" + member.user.id + ">" + ", ";
        })
        userlist = userlist.slice(0, -2);

        var content = `Members with Role: <@&${role}>.\nReact on days where you **CANNOT** run.\n`;

        const exclusions = require('./exclusions.json');

        var possibleDays = [];

        for (var i = 0; i < 7; i++)
        {
            var temp = `${daysymbols[(i + 3) % 7]} ${daytranslate[(i + 3) % 7]}: `;
            var tcount = 0;
            members.forEach((member) => {
                if ((exclusions[member.user.id] == null || !exclusions[member.user.id][daytranslate[(i + 3) % 7].toLowerCase()])
                    && member.user.id != client.user.id)
                {
                    tcount++;
                    temp += "<@" + member.user.id + ">" + ", ";
                }
            });
            if (tcount > 0)
            {
                content += temp.slice(0, -2) + "\n";
                possibleDays.push(daysymbols[(i + 3) % 7]);
            }
        }

        var wat = await interaction.channel.send({ content: content });
        try {
            for (var i = 0; i < possibleDays.length; i++)
                await wat.react(possibleDays[i]);
        } catch (error) {
            console.error('One of the emojis failed to react:', error);
        }
        const schedules = require('./schedules.json');
        if (schedules[interaction.channel.id])
        {
            try {
                (await interaction.channel.messages.fetch(schedules[interaction.channel.id]))?.delete();
            } catch(err) {
                // ignore
            }
        }
        schedules[interaction.channel.id] = wat.id;

        let data = JSON.stringify(schedules);
        fs.writeFileSync('./schedules.json', data);

        interaction.deleteReply();
    }
});

async function handleReaction(reaction, user) {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			return;
		}
	}

    if (reaction.message.author.id !== client.user.id) return;

    const schedules = require('./schedules.json');
    if (schedules[reaction.message.channel.id] !== reaction.message.id) return;

    var wat = reaction.message;
    var match = wat.content.match(/<@&(\d+)>/g);
    if (match == null) return;

    var role = match[0].slice(3, -1);
    var members = wat.guild.roles.cache.get(role).members;

    var userlist = "";
    members.forEach((member) => {
        userlist += "<@" + member.user.id + ">" + ", ";
    })
    userlist = userlist.slice(0, -2);

    var content = `Members with Role: <@&${role}>.\nReact on days where you **CANNOT** run.\n`;

    const exclusions = require('./exclusions.json');

    for (var i = 0; i < 7; i++)
    {
        var thing = await wat.reactions.resolve(daysymbols[(i + 3) % 7]);
        if (thing) {
            var reacts = await thing.users.fetch();
            content += `${daysymbols[(i + 3) % 7]} ${daytranslate[(i + 3) % 7]}: `;
            var temp = "";
            members.forEach((member) => {
                if ((exclusions[member.user.id] == null || !exclusions[member.user.id][daytranslate[(i + 3) % 7].toLowerCase()])
                    && reacts.get(member.user.id) == null && member.user.id != client.user.id)
                {
                    temp += "<@" + member.user.id + ">" + ", ";
                }
            });
            content += temp.slice(0, -2) + "\n";
        }
    }

    wat.edit({ content: content });
}

client.on('messageReactionAdd', handleReaction);
client.on('messageReactionRemove', handleReaction);

client.login(token);
