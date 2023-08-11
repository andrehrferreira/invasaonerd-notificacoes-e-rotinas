import { mongodb } from "@dekproject/scope"
import { google } from 'googleapis'
import { notificationUsers, saveFeed } from "./feed";
import { ObjectId } from 'mongodb'
const {
    search
} = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
})

export async function getInfosYoutube() {

    let pages = await getAllPagesWithYoutube()

    await Promise.all(pages.filter(({
        lastUpdate
    }) => {
        return (Math.abs(new Date() - lastUpdate) / 36e5) > process.env.TIME_YOUTUBE || 30
    }).map(async (page) => {
        await manageYoutubeByUrl(page)
    }))
}

async function getAllPagesWithYoutube() {
    return await mongodb.collection('schedules-youtube').find({
        invalid: {
            $exists: false
        }
    })
        .sort({
            lastUpdate: 1
        })
        .limit(parseInt(process.env.LIMIT_YOUTUBE || 2))
        .toArray()
}

async function manageYoutubeByUrl({ title, url, channelId, _id: scheduleId, pageId, id: idpage }) {
    try {
        
        let youtubeMongo = await getYoutubeByChannelId(channelId)

        let alreadyVideo = false
        const videos = youtubeMongo && youtubeMongo.videos ? youtubeMongo.videos : []

        const video = await getYoutubeLastVideo(channelId)


        if (videos.length > 0) {
            alreadyVideo = videos.some(({ id }) => video.id === id)
        }

        if (alreadyVideo == false) {
            const feed = {
                timestamp: new Date(video.publishedAt).getTime(),
                date: new Date(video.publishedAt),
                type: 'youtube-video',
                idpage,
                pageId,
                payload: video,
                title,
                url,
                feedId: video.id
            }
            await saveFeed(feed)


            if (!youtubeMongo) {
                youtubeMongo = {
                    channelId: video.channelId,
                    channelTitle: video.channelTitle,
                    videos: []
                }
            }

            youtubeMongo.videos.push(video)
            delete youtubeMongo._id
            upsertYoutube(video.channelId, youtubeMongo)

            const notification = {
                type: 'youtube-video',
                idpage,
                pageId,
                url,
                title
            }
            await notificationUsers(notification)
        }
        await mongodb.collection('schedules-youtube').updateOne({
            _id: ObjectId(scheduleId)
        }, {
                $set: {
                    lastUpdate: new Date()
                }
            })
    } catch(error) {
        await mongodb.collection('schedules-youtube').updateOne({
            _id: ObjectId(scheduleId)
        }, {
                $set: {
                    invalid: true
                }
            })
    }
}

async function upsertYoutube(channelId, data) {
    const { upsertedId } = await mongodb.collection('youtube').updateOne({
        channelId
    }, {
            $set: data
        }, {
            upsert: true
        })
    return upsertedId ? upsertedId._id.toHexString() : ''
}


function getYoutubeByChannelId(channelId) {
    return mongodb.collection('youtube').findOne({
        channelId
    })
}

function getYoutubeLastVideo(channelId) {
    return new Promise((resolve, reject) => {
        search.list({
            part: 'id,snippet',
            type: 'video',
            channelId: channelId,
            maxResults: 1,
            order: 'date'
        }, (err, response) => {
            if (err) return reject(err)

            const { items } = response.data
            if (items) {
                const video = items[0]
                if (video) {
                    const lastVideo = {
                        id: video.id.videoId,
                        link: "https://www.youtube.com/watch?v=" + video.id.videoId,
                        kind: video.id.kind,
                        publishedAt: video.snippet.publishedAt,
                        channelId: video.snippet.channelId,
                        channelTitle: video.snippet.channelTitle,
                        title: video.snippet.title,
                        description: video.snippet.description,
                        thumbnails: video.snippet.thumbnails
                    }
                    if (lastVideo.publishedAt) return resolve(lastVideo)
                }
            }
            reject({
                channelId,
                response
            })
        })
    })
}
