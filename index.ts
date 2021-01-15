import { CONFIG } from './config';
import { Rainbow } from './rainbow';
import { puppeteerService } from './puppeteer/puppeteer';

import * as Feed from 'rss-to-json';
import * as pug from 'pug';
import * as fs from 'fs';

const PUG_MAIN_FILE = './main.pug';


async function generateBadges() {
  const colors = new Rainbow();
  colors.setNumberRange(1, CONFIG.badges.list.length);
  colors.setSpectrum(...CONFIG.badges.spectrum);

  const formattedBadges = CONFIG.badges.list.map((badge, index) => ({
    name: badge.name,
    logo: badge.logo || badge.name.toLocaleLowerCase(),
    color: colors.colourAt(index),
  }));

  return Promise.resolve({ badges: formattedBadges });
}

async function getRefreshDate() {
  const refreshDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
    timeZone: 'Europe/Stockholm',
  });

  return Promise.resolve({ refreshDate });
}

async function getGithubData() {
  const data = CONFIG.github;
  const enabled =
    data.stats.mostUsedLanguages ||
    data.stats.overallStats ||
    data.highlightedRepos.length > 0;

  const github = {
    ...data,
    enabled,
  };

  return Promise.resolve({ github });
}

async function getSocialData() {
  const social = CONFIG.social.map(item => ({
    ...item,
    logo: item.logo || item.name,
  }));
  return Promise.resolve({ social });
}

async function getInstagramPosts() {
  const instagramImages = await puppeteerService.getLatestInstagramPostsFromAccount(
    CONFIG.instagram.username,
    CONFIG.instagram.numberOfImages || 3
  );

  return Promise.resolve({ instagram: instagramImages });
}

async function generateReadMe(input) {
  const compiledHtml = pug.compileFile(PUG_MAIN_FILE, { pretty: true })(input);
  fs.writeFileSync('README.md', compiledHtml);
}

async function perform() {
  let promises = [];

  // Badges
  if (CONFIG.badges && CONFIG.badges.enabled) {
    promises.push(generateBadges());
  }

  // Refresh date
  promises.push(getRefreshDate());

  // Github data
  promises.push(getGithubData());

  // Social data
  promises.push(getSocialData());

  const input = await Promise.all(promises).then(data =>
    data.reduce((acc, val) => ({ ...acc, ...val }))
  );

  if (puppeteerService.browser) {
    puppeteerService.close();
  }

  console.log(`✅ README.md has been succesfully built!`);

  generateReadMe(input);
}

perform();
