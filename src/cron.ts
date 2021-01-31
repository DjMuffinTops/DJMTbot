import cron from 'node-cron';
import {Client} from "discord.js";
import {vcRemindersJob} from "./jobs/vcReminders";
import {pleasantEvening} from "./jobs/pleasantEvening";

export default async function startCronJobs(client: Client) {
    console.log('Starting cron jobs');

    // cron.schedule('0 0 0-23 * * *', async () => {
    //     await vcRemindersJob(client);
    // });
    //

    console.log('cron jobs all set');
}
