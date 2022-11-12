// Connect to https://www.audiovault.net with Axios

const JSON_FILE = 'audiovault_entries.json'

const main = async () => {
    const axios = require('axios');

    const options = {
        method: 'GET',
        url: 'https://www.audiovault.net/',
        headers: {
            'cache-control': 'no-cache',
        }
    };

    axios.request(options).then(function (response) {
        retrieveTableItemsWithCheerio(response.data);
    }).catch(function (error) {
        // Figure out error logging later, maybe add rss error dummy item or w/e.
        console.error(error);
    });
}

const retrieveTableItemsWithCheerio = async (audiovaultHTMLString) => {
    let movies = [];
    let shows = [];

    const cheerio = require('cheerio');

    const $ = cheerio.load(audiovaultHTMLString);

    $('table').eq(0).find('tr').slice(1).each(function (i, elem) {
        const id = $(this).children().eq(0).text().trim();
        const name = $(this).children().eq(1).text().trim();

        if (id && name) {
            shows.push({
                id: id,
                name: name,
            })
        }
    });

    $('table').eq(1).find('tr').slice(1).each(function (i, elem) {
        const id = $(this).children().eq(0).text().trim();
        const name = $(this).children().eq(1).text().trim();

        if (id && name) {
            movies.push({
                id: id,
                name: name,
                timestamp: Date.now(),
            })
        }
    });

    const newAudiovaultEntries = await removeEntriesPresentInJSON(movies, shows);

    movies = newAudiovaultEntries.movies;

    shows = newAudiovaultEntries.shows;

    console.log(`Successfully retrieved ${shows.length} shows, and ${movies.length} movie entries from Audiovault's HTML. Generating RSS`)

    generateRSS(movies, shows);
}

const removeEntriesPresentInJSON = async (movies, shows) => {
    const fs = require('fs');

    if (!await fs.existsSync(JSON_FILE)) {
        await fs.writeFileSync(JSON_FILE, JSON.stringify({
            movies: [],
            shows: [],
        }));
    }

    const json = JSON.parse(await fs.readFileSync(JSON_FILE));

    const newMovies = movies.filter(movie => {
        return !json.movies.find(oldMovie => {
            return movie.id === oldMovie.id;
        })
    })

    const newShows = shows.filter(show => {
        return !json.shows.find(oldShow => {
            return show.id === oldShow.id;
        })
    })

    fs.writeFileSync(JSON_FILE, JSON.stringify({
        movies: [...json.movies, ...newMovies],
        shows: [...json.shows, ...newShows],
    }));

    return {
        movies: newMovies,
        shows: newShows,
    }
}

const generateRSS = async (movies, shows) => {
    const dotenv = require('dotenv').config();

    const RSS_FILE_PATH = process.env.RSS_FILE_PATH || 'audiovault_feed.rss';

    const fs = require('fs');

    let rss = '';

    rss += '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0">\n';
    rss += '  <channel>\n';
    rss += '    <title>Audiovault</title>\n';
    rss += '    <link>https://www.audiovault.net</link>\n';
    rss += '    <description>Audiovault RSS Feed powered by Oriol Gomez.com</description>\n';
    rss += '    <language>en-us</language>\n';
    rss += '    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n';
    rss += '    <pubDate>' + new Date().toUTCString() + '</pubDate>\n';
    rss += '    <ttl>60</ttl>\n';

    movies.forEach(movie => {
        rss += '    <item>\n';
        rss += '      <title> movie: ' + movie.name + '</title>\n';
        rss += '      <link>https://www.audiovault.net/download/' + movie.id + '</link>\n';
        rss += '      <guid>https://www.audiovault.net/movie/' + movie.id + '</guid>\n';
        rss += '      <pubDate>' + new Date(movie.timestamp).toUTCString() + '</pubDate>\n';
        rss += '    </item>\n';
    });

    shows.forEach(show => {
        rss += '    <item>\n';
        rss += '      <title> show: ' + show.name + '</title>\n';
        rss += '      <link>https://www.audiovault.net/download/' + show.id + '</link>\n';
        rss += '      <guid>https://www.audiovault.net/show/' + show.id + '</guid>\n';
        rss += '      <pubDate>' + new Date().toUTCString() + '</pubDate>\n';
        rss += '    </item>\n';
    });

    rss += '  </channel>\n';
    rss += '</rss>\n';

    await fs.writeFileSync(RSS_FILE_PATH, rss);

    console.log(`Successfully generated RSS feed at ${RSS_FILE_PATH}`);
}

main();