import { CronJob } from 'cron'
import { getInfosInstagram } from '../services/instagram'
import { getInfosYoutube } from '../services/youtube'
import { getInfosSchedules } from '../services/urls'
    ;import { getInfosQueueNotification } from '../services/subscribe';
 (async () => {

        const CRON_INSTAGRAM = process.env.CRON_INSTAGRAM || '*/1 * * * *'
        const CRON_UPDATE_SCHEDULES = process.env.CRON_UPDATE_SCHEDULES || '* */1 * * *'
        const CRON_YOUTUBE = process.env.CRON_YOUTUBE || '*/1 * * * *'

        
        new CronJob(CRON_INSTAGRAM, function () {
            console.log('CRON_INSTAGRAM');
            getInfosInstagram()
        }, true, true, 'America/Los_Angeles');

        new CronJob(CRON_UPDATE_SCHEDULES, function () {
            console.log('CRON_UPDATE_SCHEDULES');
            getInfosSchedules()
        }, null, true, 'America/Los_Angeles');
        

        new CronJob(CRON_YOUTUBE, function () {
            console.log('CRON_YOUTUBE');
            getInfosYoutube()
        }, null, true, 'America/Los_Angeles');

       getInfosQueueNotification()

    })();