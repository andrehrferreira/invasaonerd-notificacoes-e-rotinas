import { mongodb } from "@dekproject/scope"

export async function getInfosSchedules() {
    const pagesYoutube = await getAllPagesWithYoutube()
    await Promise.all(pagesYoutube.map(async (page) => {
        await manageYoutube(page)
    }))

    const pagesInstagram = await getAllPagesWithInstagram()

    await Promise.all(pagesInstagram.map(async (page) => {
        await manageInstagram(page)
    }))
}

async function manageYoutube(data) {
    const channelId = data.youtube.id
    delete data.youtube
    data.pageId = data._id
    delete data._id
    data.updated = new Date()
    await mongodb.collection('schedules-youtube').updateOne({
        channelId
    }, {
            $set: data
        }, {
            upsert: true
        })

    await mongodb.collection('schedules-youtube').updateOne({
        channelId,
        lastUpdate: {
            $exists: false
        }
    }, {
            $set: {
                lastUpdate: new Date(),
                created: new Date()
            }
        })
}

async function manageInstagram(data) {
    const instagramUrl = data.instagram.url
    data.pageId = data._id
    data.updated = new Date()
    delete data.instagram
    delete data._id

    await mongodb.collection('schedules-instagram').updateOne({
        instagramUrl
    }, {
            $set: data
        }, {
            upsert: true
        })

    await mongodb.collection('schedules-instagram').updateOne({
        instagramUrl,
        lastUpdate: {
            $exists: false
        }
    }, {
            $set: {
                lastUpdate: new Date(),
                created: new Date()
            }
        })
}


async function getAllPagesWithYoutube() {
    const pages = await mongodb.collection('pages').find({
        $and: [{
            removed: { $ne: true }
        }, {
            'youtube.id': { $exists: true }
        }, {
            'youtube.url': { $exists: true }
        }]
    })
        .project({ youtube: true, url: true, title: true, id: true })
        .toArray()

    return pages.filter(({ youtube }) => {
        return youtube.statistics.videoCount > 0 && youtube.url && youtube.url.includes('youtube')
    })
}

async function getAllPagesWithInstagram() {
    const pages = await mongodb.collection('pages').find({
        $and: [{
            removed: { $ne: true }
        }, {
            "instagram.url": { $exists: true }
        }, {
            "instagram.url": { $ne: null }
        }]
    })
        .project({ instagram: true, url: true, title: true, id: true })
        .toArray()

    return pages.filter(({ instagram: { url } }) => {
        return !(url.includes('/p/') ||
            url.includes('/explore/') ||
            url.includes('/tags/')) && url.includes('instagram')
    })
}