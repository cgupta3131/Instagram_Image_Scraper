var puppeteer = require('puppeteer');
var cheerio = require("cheerio");
var request = require('request');
var fs = require('fs');
var mkdirp = require('mkdirp');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');


var cur_username;
var cur_password;
var find_username;
var targetItemCount;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");


var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function extractItems(){
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

async function main(res) {

	
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

	//Creating new Directory if it does not exist
	var dir = '/home/cgupta3131/Downloads/photos/';
	if (!fs.existsSync(dir)){
		console.log("Creating new directory!");
	    fs.mkdirSync(dir);
	}

	for(var i=0;i<iter;i++){
		var url = imgs[i];
		var file_name = dir + find_username + "-" + (i+1);
		download(url,file_name,function(){});
		console.log(file_name);
	}

	console.log("DOWNLOAD COMPLETE");
	browser.close();

	res.redirect("/");
};


app.get("/",function(req,res){
    res.render("mainpage");
});

app.post("/",function(req,res){

	cur_username = req.body.username1;
	cur_password = req.body.password;
	find_username = req.body.username2;
	targetItemCount = parseInt(req.body.count_images, 10);

	if(isNaN(targetItemCount)){
		targetItemCount = 10;
	}

	/*cur_username = "nandini290000@gmail.com";
	cur_password = "----";
	find_username = "virat.kohli";*/

	main(res);
});

app.listen(3000,function(){
    console.log("Server started at port 3000");
});

