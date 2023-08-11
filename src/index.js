//Application controller

import '@babel/polyfill/noConflict';

import dotenv from "dotenv";

import { $, plugins, controllers, rabbitmq } from "@dekproject/scope";


(async () => {
    dotenv.config(); //Load .env

    $.set("dev", !(process.env.NODE_ENV === 'production'));

    await plugins("node_modules/@dekproject");


    $.wait(["mongoose", "mongodb", "rabbitmq"]).then(async () => {
        await controllers($.dev ? "src/schedules" : "build/schedules")
       
    }).catch((error) => {
        console.log(error);
    });
})();
