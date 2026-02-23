import { DJMTbot } from "./DJMTbot";
import express, { Request, Response } from "express";
import { logger } from './Logger';
const app = express();
const PORT = 8080;

if (!process.env.TOKEN) {
  throw new Error("TOKEN ENV not set.");
}

if (!process.env.APPLICATION_ID) {
  throw new Error("APPLICATION_ID ENV not set.");
}

app.get("/", (req: Request, res: Response) => {
  const data = {
    uptime: process.uptime(),
    message: "Ok",
    date: new Date(),
  };
  res.status(200).send(data);
});

// Literally only doing this so digital ocean can pass health checks ugh
app.listen(PORT, () => logger.info(`Server has started at port ${PORT}`));

DJMTbot.getInstance()
  .run()
  .then(() => logger.info("Bot has been run"))
  .catch((err: unknown) => logger.error("Error running bot", { error: err }));
