import cron from 'node-cron';
import {Client} from "discord.js";
import {dotwJob} from "./jobs/dotwJob";

async function start(client: Client) {
    console.log('Starting cron jobs');
    // at 10:59 and 11:59 during DST
    cron.schedule('* 59 10 * * *', async () => {
        await dotwJob(client);
    });
}

module.exports =  { start };
