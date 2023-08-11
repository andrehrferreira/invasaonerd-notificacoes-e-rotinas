
import { $, rabbitmq } from "@dekproject/scope";
import fcm from 'fcm-notification'
var FCM = new fcm('src/config/invasaonerd-stg.json');


const RABBIT_MQ_QUEUE = process.env.RABBIT_MQ_QUEUE

export async function getInfosQueueNotification() {
    rabbitmq.createChannel((err, ch) => {
        if (err) {
            throw "Not possible create channel RabbitMQ"
        } else {
            ch.assertQueue(RABBIT_MQ_QUEUE, { durable: false });
            ch.prefetch(1);
            ch.consume(RABBIT_MQ_QUEUE, function (msg) {
                controllerNotification(msg.content.toString())
            }, { noAck: true });
        }
    });
}

async function controllerNotification(string) {
    try {
        const { notification, devices } = JSON.parse(string)
        var message = {
            "webpush": {
                notification
            }
        }
        FCM.sendToMultipleToken(message, devices, function (err, response) {
            if (err) {
                console.log('err--', err);
            } else {
                console.log('response-----', response);
            }
        })
    } catch (error) {
        console.log(error)
    }
}

