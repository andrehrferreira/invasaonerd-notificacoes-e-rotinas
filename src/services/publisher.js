
import { $, rabbitmq } from "@dekproject/scope";

const RABBIT_MQ_QUEUE = process.env.RABBIT_MQ_QUEUE

export async function pushNotifactionRabbitMQ({ message, title, url, devices = [], icon }) {
    if (devices.length) {
        const struct = {
            notification: {
                title,
                body: message,
                click_action: url,
                icon
            },
            devices
        }

        const item = JSON.stringify(struct)

        rabbitmq.createChannel((err, ch) => {
            if (err) {
                throw "Not possible create channel RabbitMQ"
            } else {
                ch.assertQueue(RABBIT_MQ_QUEUE, { durable: false });
                ch.sendToQueue(RABBIT_MQ_QUEUE, new Buffer(item));
                setTimeout(() => {
                    ch.close()
                }, 1000)
            }
        });
    }
}

