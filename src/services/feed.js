

import { ObjectId } from 'mongodb'
import { mongodb } from "@dekproject/scope"
import { flatArray } from '../utils'
import { pushNotifactionRabbitMQ } from './publisher'
export async function saveFeed({ title, url, pageId, timestamp, date, type, payload, feedId, idpage }) {
    try {
        
        let key = ''
        if (type == 'instagram') {
            key = 'instagramId'
        }
        else if (type == 'youtube-video') {
            key = 'youtubeId'
        } else {
            throw 'Type invalid'
        }
    
        const { upsertedId } = await mongodb.collection('feeds').updateOne({
            [key]: feedId
        }, {
                $set: {
                    feeder: { title, url },
                    idpage,
                    pageId: ObjectId(pageId),
                    photo: `${process.env.BASE_URL}/image/${url}/miniavatar.jpg`,
                    publishedAt: timestamp,
                    date,
                    type,
                    payload
                }
            }, {
                upsert: true
            })
        return upsertedId ? upsertedId._id.toHexString() : false
    } catch (error) {
        console.log(error)
    }
}

export async function notificationUsers({ type, feedId, url, title, pageId, idpage }) {
    const { tab, message, timestamp } = filterType(type)
    const notification = {
        new: true,
        clicked: false,
        pageId,
        idpage,
        href: `${process.env.PROXY_URL}/${feedId ? 'post/' + feedId : 'page/' + url + tab}`,
        image: `${process.env.BASE_URL}/image/${url}/miniavatar.jpg`,
        message: message(title),
        category: type,
        timestamp: timestamp({})
    }
    await mongodb.collection('users').updateMany({
        pages: {
            $in: [
                idpage
            ]
        }
    }, {
            $push: {
                notifications: {
                    $each: [notification],
                    $sort: { timestamp: -1 },
                    $slice: 50
                }
            }
        })

    const devices = await getDivicesUserByPageId(idpage)

    pushNotifactionRabbitMQ({
        message: notification.message,
        url: notification.href,
        title: process.env.TITLE_APP,
        devices,
        icon: notification.image
    })
}


async function getDivicesUserByPageId(idpage) {
    const users = await mongodb.collection('users').find({
        $and: [
            {
                pages: {
                    $in: [
                        idpage
                    ]
                }
            },
            {
                devices: {
                    $exists: true
                }
            }
        ]
    })
        .project({ devices: true })
        .toArray()

    return flatArray(users.map(({ devices }) => devices))
}

function filterType(type) {
    switch (type) {
        case 'youtube-video': return {
            tab: '?t=youtube',
            message: (title) => {
                return `A página ${title} tem um novo vídeo no Canal do Youtube`
            },
            timestamp: ({ publishedAt }) => {
                if (publishedAt) return new Date(publishedAt).getTime()
                return new Date().getTime()
            }
        }
        case 'instagram': return {
            tab: '?t=instagram',
            message: (title) => {
                return `A página ${title} tem uma nova atualização no Instagram`
            },
            timestamp: ({ taken_at_timestamp }) => {
                if (taken_at_timestamp) return new Date(taken_at_timestamp * 1000).getTime()
                return new Date().getTime()
            }
        }
        default: return {}
    }
}
