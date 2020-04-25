const puppeteer = require('puppeteer');
const cheerio = require("cheerio");
const request = require('request');
const fs = require('fs');

var cur_username;
var cur_password;
var find_username;
var targetItemCount;

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function extractItems()
{
	const extractedItems = Array.from(
		document.querySelectorAll("img.FFVAD[src]")
		);

	const items = extractedItems.map(element => element.src);

	return items;
}

async function scrapeInfiniteScrollItems(page,extractItems,targetItemCount,scrollDelay=1000){

	let items = [];

	try {
		
		let previousHeight;
		let prevlength;
		while(items.length <= targetItemCount)
		{
			prevlength = items.length;
			items = await page.evaluate(extractItems);

			// console.log("Length: " + items.length );
			// console.log("Prev Length: " + prevlength );
			if(Number(prevlength+12) !== Number(items.length)){
				break;
			}
			previousHeight = await page.evaluate("document.body.scrollHeight");
			await page.evaluate("window.scrollTo(0,document.body.scrollHeight)");

			await page.waitForFunction(
				`document.body.scrollHeight > ${previousHeight}`  
				);
			scrollDelay = Math.floor(Math.random() * 1000) + 1000
			await page.waitFor(scrollDelay)
			
		}		
	} catch(e) {
		console.log(e);
	}

	return items;
}


function initial_checks(){
	cur_username = process.argv[2];
	cur_password = process.argv[3];
	find_username = process.argv[4];
	targetItemCount = process.argv[5];

	if(cur_username == null){
		console.log("Please provide your username");
		return false;
	}

	if(cur_password == null){
		console.log("Please provide your password");
		return false;
	}

	if(find_username == null){
		console.log("Please provide username of the account for which you want images ");
		return false;
	}

	if(targetItemCount == null){
		console.log("Please provide the number of images you want to download");
		return false;
	}

	targetItemCount = parseInt(targetItemCount, 10);

	return true;
}

async function main() {
    
    if(initial_checks() == false)
    	return;
	

	const browser = await puppeteer.launch({
    	headless: false,
    	defaultViewport: null, 
    	args: ['--start-maximized']
    });
    const page = await browser.newPage();
    await page.goto('https://www.instagram.com/accounts/login/', {waitUntil: 'networkidle2'});

    await page.waitFor('input[name=username]');

    //fill username
    await page.focus('input[name=username]')
	await page.keyboard.type(cur_username)

	//fill password
	await page.focus('input[name=password]')
	await page.keyboard.type(cur_password)

	//click login button
	await page.click('button[type=submit]')
	await page.waitFor(4000)


	await page.waitForSelector('button.HoLwm');
	await page.click('button.HoLwm ');

	await page.goto("https://www.instagram.com/" + find_username + "/")
	const html = await page.content();
	const $ = cheerio.load(html);

	const imgs = await scrapeInfiniteScrollItems(
		page,
		extractItems,
		targetItemCount
	);

	var iter = Math.min(Number(targetItemCount), Number(imgs.length));

	//Creating new Directory if ./photos does not exist
	var dir = './photos/';
	if (!fs.existsSync(dir)){
		console.log("Creating new directory!");
	    fs.mkdirSync(dir);
	}

	for(var i=0;i<iter;i++){
		var url = imgs[i];
		var file_name = "./photos/" + find_username + (i+1);
		download(url,file_name,function(){});
		console.log(file_name);
	}
};

main();