//Cluster controller

import '@babel/polyfill/noConflict';

import cluster from "cluster";
import dotenv from "dotenv";

(async () => {
    if (cluster.isMaster) {
        dotenv.config();

        const cpusCount = (process.env.NODE_ENV === 'production') ? require('os').cpus().length : 1;
        const maxClusters = process.env.CLUSTER_MAX || cpusCount;

        for(let i = 0; i < maxClusters; i++)
            cluster.fork();

        cluster.on('exit', ( deadWorker, code, signal ) => {
            setTimeout(() => { cluster.fork(); }, 3000);
        });
    }
    else {
        require("./index.js");
    }
})()
