import { mongodb } from "@dekproject/scope"
const request = require('request').defaults({ maxRedirects: 5 })
import { ObjectId } from 'mongodb'
import jsdom from 'jsdom'
import { saveFeed, notificationUsers } from './feed'

export async function getInfosInstagram() {
    let pages = await getAllPagesWithInstagram()

    await Promise.all(pages.filter(({
        lastUpdate
    }) => {
        return (Math.abs(new Date() - lastUpdate) / 36e5) > process.env.TIME_INSTAGRAM || 30
    }).map(async (page) => {
        await manageInstagramByUrl(page)
    }))

}

async function getAllPagesWithInstagram() {
    return await mongodb.collection('schedules-instagram').find({})
        .sort({
            lastUpdate: 1
        })
        .limit(parseInt(process.env.LIMIT_INSTAGRAM || 2))
        .toArray()
}

async function manageInstagramByUrl({ title, url, instagramUrl: link, _id: scheduleId, pageId, id: idpage }) {
    try {
        const instagram = await getInstagramInfosFn(link)
        let timeline = []

        const instagramMongo = await getInstagramById(instagram.id)

        if (instagramMongo && instagramMongo.timeline) {
            timeline = timeline.filter(t => {
                return !instagramMongo.timeline.some(it => t.id === it.id)
            })
        } else {
            timeline = instagram.timeline || []
        }

        if (timeline.length > 0) {
            timeline = await Promise.all(instagram.timeline.map(async (t) => {
                if (['GraphVideo', 'GraphSidecar'].includes(t.type)) {
                    const media = await getInstagramUserMidiaFn(t.shortcode)
                    t.media = formatMedia(media)
                }
                return t
            }))
        }

        if (instagram.timeline && instagramMongo && instagramMongo.timeline)
            instagram.timeline = instagramMongo.timeline.concat(timeline)

        instagram.url = link
        await upsertInstagram(instagram)

        await Promise.all(timeline.map(async t => {
            const feed = {
                timestamp: t.taken_at_timestamp,
                date: new Date(t.taken_at_timestamp),
                type: 'instagram',
                idpage,
                pageId,
                payload: t,
                title,
                url,
                feedId: t.id
            }
            await saveFeed(feed)
        }))

        if (timeline.length > 0) {
            const notification = {
                type: 'instagram',
                idpage,
                pageId,
                url,
                title
            }
            await notificationUsers(notification)
        }

        await mongodb.collection('schedules-instagram').updateOne({
            _id: ObjectId(scheduleId)
        }, {
                $set: {
                    lastUpdate: new Date()
                }
            })

    } catch (error) {
        console.log('link', link)
        console.log(error)
    }
}


function getInstagramById(instragramId) {
    return mongodb.collection('instagram').findOne({
        instragramId
    })
}

async function upsertInstagram(data) {
    const { upsertedId } = await mongodb.collection('instagram').updateOne({
        instragramId: data.id
    }, {
            $set: data
        }, {
            upsert: true
        })
    return upsertedId ? upsertedId._id.toHexString() : ''
}


export const getInstagramInfosFn = (link) => {
    return new Promise((resolve, reject) => {
        const { JSDOM } = jsdom
        try {
            if (!link || link.includes('/p/') ||
                link.includes('/explore/') ||
                link.includes('/tags/')) {
                return reject('Link invaĺido')
            }
            else {
                request.get({
                    url: link,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                        'From': 'webmaster@example.org'
                    }
                }, async (err, response, body) => {
                    if (!err) {
                        try {
                            const site = await new JSDOM(body, {
                                runScripts: 'dangerously'
                            })
                            if (site.window.__initialData && site.window.__initialData.data) {
                                const instagram = await site.window.__initialData.data.entry_data.ProfilePage[0].graphql.user
                                return resolve(formatInstagram(instagram))
                            } else if (body.includes('Restricted profile &bull; Instagram')) {
                                return resolve({ blocked: true })
                            }
                            resolve({ notexist: true })
                        } catch (err) {
                            console.log(link)
                            return reject(err)
                        }
                    } else {
                        return reject(err)
                    }
                })
            }
        } catch (error) {
            console.log(link)
        }

    })
}

const getInstagramUserMidiaFn = (shortcode) => {
    const link = `https://www.instagram.com/p/${shortcode}`
    return new Promise(resolve => {
        const { JSDOM } = jsdom
        request.get({
            url: link,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                'From': 'webmaster@example.org'
            }
        }, (err, response, body) => {
            try {
                return resolve(new JSDOM(body, {
                    runScripts: 'dangerously'
                }).window.__initialData.data.entry_data.PostPage[0].graphql.shortcode_media)
            } catch (err) {
                return resolve({})
            }
        })
    })
}

const formatMedia = (media) => {
    const data = {}
    data.type = media.__typename
    data.owner = media.owner
    data.display_url = media.display_url
    data.accessibility_caption = media.accessibility_caption


    if (media.edge_media_to_caption[0]) {
        const { node: { text } } = media.edge_media_to_caption[0].edges[0]
        data.caption = text
    }

    if (media.edge_media_to_parent_comment) {
        const { edges } = media.edge_media_to_parent_comment;
        if (edges) {
            data.comment = edges.map(({ node: { owner, text } }) => ({ owner, text }))
        }
    }
    switch (data.type) {
        case 'GraphVideo':
            data.video_url = media.video_url
            break;
        case 'GraphSidecar':
            const { edges } = media.edge_sidecar_to_children;
            if (edges) {
                data.sidecar = edges.map(({ node: { accessibility_caption, display_url } }) => ({ display_url, accessibility_caption }))
            }
            break;
        default:
            break;
    }


    media.data = data;
    return data;
}
const formatInstagram = (media) => {
    const data = {}
    data.id = media.id
    data.type = media.__typename
    data.profile_pic_url = media.profile_pic_url
    data.username = media.username
    data.full_name = media.full_name
    data.external_url = media.external_url
    data.biography = media.biography
    data.is_private = media.is_private

    if (media.edge_owner_to_timeline_media) {
        const { edges } = media.edge_owner_to_timeline_media;
        if (edges) {
            data.timeline = edges.map(({ node: { shortcode, id, thumbnail_resources, accessibility_caption, edge_liked_by, edge_media_to_comment, taken_at_timestamp, __typename: type } }) => ({ shortcode, edge_liked_by, thumbnail_resources, accessibility_caption, id, edge_media_to_comment, taken_at_timestamp: taken_at_timestamp * 1000, type }))
        }
        data.posts = media.edge_owner_to_timeline_media.count
    }

    if (media.edge_followed_by) {
        data.followed = media.edge_followed_by.count
    }

    if (media.edge_follow) {
        data.follow = media.edge_follow.count
    }

    switch (data.type) {
        case 'GraphVideo':
            data.video_url = media.video_url
            break;
        case 'GraphSidecar':
            const { edges } = media.edge_sidecar_to_children;
            if (edges) {
                data.sidecar = edges.map(({ node: { accessibility_caption, display_url } }) => ({ display_url, accessibility_caption }))
            }
            break;
        default:
            break;
    }


    media.data = data;
    return data;
}