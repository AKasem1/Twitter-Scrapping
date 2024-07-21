const puppeteer = require('puppeteer');

// scrapping a single Twitter account for the given stock symbol
async function scrapeTwitterAccount(username, stockSymbol) {
  // launching a new browser and opening a new page using puppeteer library
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // navigating to the given twitter account
  await page.goto(`${username}`), { waitUntil: 'networkidle2' };
  
  // scrolling to the bottom of the page to load more tweets
  let previousHeight;
  while (true) {
    try {
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
      // waiting for 2 seconds to load more tweets
      await new Promise(resolve => setTimeout(resolve, 2000)); 
    } catch (e) {
      break;
    }
  }

  // waiting for some tweets to load
  await page.waitForSelector('div[data-testid="tweetText"]');

  // scraping the text only from the tweets
  const tweets = await page.$$eval('div[data-testid="tweetText"] span', spans => {
    return spans.map(span => span.textContent.trim());
  });

  await browser.close();
  
  // counting the number of this account tweets that contains the stock symbol
  const symbolMentionCount = tweets.reduce((count, tweet) => {
    return count + (tweet.includes(stockSymbol) ? 1 : 0);
  }, 0);

  return symbolMentionCount;
}

// scarpping all Twitter accounts and output the results
async function scrapeTwitterAccounts(accounts, stockSymbol, interval) {
  // adding a dollar sign to the stock symbol before searching for it in tweets
  stockSymbol = "$" + stockSymbol;
  while (true) {
    let totalMentionCount = 0;

    for (const account of accounts) {
      const mentionCount = await scrapeTwitterAccount(account, stockSymbol);
      totalMentionCount += mentionCount;
    }

    // output the total number of mentions for the stock symbol in the last interval minutes
    console.log(`'${stockSymbol}' was mentioned '${totalMentionCount}' times in the last '${interval}' minutes.`);
    
    // waiting for the given interval before running the next scrape
    await new Promise(resolve => setTimeout(resolve, interval * 60 * 1000));
    
  }
}

// here parsing command-line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('You must enter at least 3 arguments: Twitter accounts, stock symbol, and interval');
  process.exit(1);
}
const twitterAccounts = args[0].split(','); // List of Twitter accounts
const stockSymbol = args[1]; // Stock symbol to look for
const interval = parseInt(args[2], 10); // Time interval in minutes

scrapeTwitterAccounts(twitterAccounts, stockSymbol, interval);
