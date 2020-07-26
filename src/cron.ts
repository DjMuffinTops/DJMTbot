import cron from 'node-cron';
import {Client} from "discord.js";
import {dotwJob} from "./jobs/dotwJob";
import {vcRemindersJob} from "./jobs/vcReminders";

async function start(client: Client) {
    console.log('Starting cron jobs');
    // at 10:59 and 11:59 during DST
    cron.schedule('* 59 10 * * *', async () => {
        await dotwJob(client);
    });

    cron.schedule('0 59 0-23 * * *', async () => {
        await vcRemindersJob(client);
    });
}

module.exports =  { start };
