import cron from 'node-cron';
import {Client} from "discord.js";
import {dotwJob} from "./jobs/dotwJob";
import {vcRemindersJob} from "./jobs/vcReminders";
import {pleasantEvening} from "./jobs/pleasantEvening";

export default async function startCronJobs(client: Client) {
    console.log('Starting cron jobs');
    // at 10:59 and 11:59 during DST
    cron.schedule('0 59 10 * * *', async () => {
        await dotwJob(client);
    });

    cron.schedule('0 0 0-23 * * *', async () => {
        await vcRemindersJob(client);
    });

    cron.schedule('0 30 17 * * *', async () => {
        await pleasantEvening(client);
    });
    console.log('cron jobs all set');
}
