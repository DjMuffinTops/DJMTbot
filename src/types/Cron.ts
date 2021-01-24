import cron, {ScheduledTask, ScheduleOptions} from "node-cron";

export class Cron {
    private static instance: Cron;
    private constructor() {}
    public static async getInstance(): Promise<Cron> {
        if (!Cron.instance) {
            Cron.instance = cron;
        }
        return Cron.instance;
    }

    schedule(cronExpression: string, func: () => void, options?: ScheduleOptions): ScheduledTask{
        return Cron.instance.schedule(cronExpression, func, options);
    }
    validate(cronExpression: string): boolean{
        return Cron.instance.validate(cronExpression);
    }
}
