import { DJMTbot } from "./DJMTbot";
const express = require('express')
const app = express()
const PORT = 8080;

if (!process.env.TOKEN) {
    throw new Error("TOKEN ENV not set.")
}

if (!process.env.APPLICATION_ID) {
    throw new Error("APPLICATION_ID ENV not set.")
}

app.get('/', (req: any, res: any) => {
    const data = {
        uptime: process.uptime(),
        message: 'Ok',
        date: new Date()
    }
    res.status(200).send(data);
});

// Literally only doing this so digital ocean can pass health checks ugh
app.listen(PORT, console.log("Server has started at port " + PORT));

DJMTbot.getInstance().run().then(r => console.log('Bot has been run'));
