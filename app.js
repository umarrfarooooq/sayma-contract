require('dotenv').config()
const fs = require("fs")
const express = require("express");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require('puppeteer');
const { log, error } = require("console");
const app = express();

const bodyParser = require('body-parser');
const mongoose = require("mongoose");
app.use(express.static("public"));


app.use(bodyParser.urlencoded({extended:true}));


let mongoUri = process.env.MONGO_URL;

mongoose.connect(mongoUri,  { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{
    console.log("MongoDB Atlas");
}).catch((err)=>{
    console.log(error);
});


mongoose.connection.on('connected', () => {
    console.log('Mongoose is connected to MongoDB Atlas');
  });
  
  mongoose.connection.on('error', (err) => {
    console.log('Mongoose connection error:', err);
  });


// mongodb://127.0.0.1:27017/usersDa
mongoose.set('strictQuery', true);

app.set("views" , path.join(__dirname , "views"))
app.set('view engine', 'ejs');

const usersData = new mongoose.Schema({
    name:String,
    date:Date,
    alRaqaam:Number,
    alHafza:String,
    raqamMadavnia:String,
    walad:String,
    hataf:String,
    aamla:String,
    jins:String,
    mastaqdam:Number,
    khaldil:String,
    yadfa:Number
})

const User = mongoose.model("userData", usersData);


app.get("/", (req, res)=>{
    res.render("form")
})




app.post("/form", async (req, res) => {
    try {
        const maidDetail = new User({
            name: req.body.naam,
            date: req.body.date,
            alRaqaam: req.body.raqam,
            alHafza: req.body.hafza,
            raqamMadavnia: req.body.madvia,
            walad: req.body.walid,
            hataf: req.body.hatif,
            aamla: req.body.aamil,
            jins: req.body.jins,
            mastaqdam: req.body.mastaqdam,
            khaldil: req.body.khaldal,
            yadfa: req.body.yadfa
        })
        const savedUser = await maidDetail.save();
        // /download-pdf/<%= user._id %>
        return res.redirect(`/download-pdf/${savedUser._id}`)
        // return res.redirect(`/success/${savedUser._id}`)
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error');
    }
});


app.get("/success/:pdfId", async (req, res)=>{
    const pdfParamsId = req.params.pdfId;

    User.findById(pdfParamsId)
    .then(user =>{
        if (user) {
            res.render("submit-success", { user: user });
        } else {
            res.status(404).send('No user found with that ID');
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).send('Server error');
    });     
})

app.get("/pdf/:pdfId", (req, res) => {
    const pdfId = req.params.pdfId;

    User.findById(pdfId)
        .then(user => {
            if (user) {
                res.render("html-to-pdf-download-btn", {user:user})
            } else {
                res.status(404).send('No user found with that ID');
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Server error: ' + err.message);
        });
});


app.get('/download-pdf/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('No user found with that ID');
        }

        const browser = await puppeteer.launch({headless:"new", args:['--no-sandbox']});
        const page = await browser.newPage();
        // await page.goto(`http://localhost:8081/pdf/${userId}`,{
        //     waitUntil:"networkidle2"
        // })
        await page.goto(`${process.env.BASE_URL}pdf/${userId}`,{
            waitUntil:"networkidle2"
        })

        const templatePath = path.join(__dirname, 'views', 'html-to-pdf.ejs');
        const html = ejs.render(fs.readFileSync(templatePath, 'utf8'), { user: user });

        await page.setContent(html);
        await page.emulateMediaType('screen');
        await page.evaluateHandle('document.fonts.ready');

        const pdfOptions = {
            printBackground: true,
            format: 'A4'
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=user_${userId}.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error: ' + err.message);
    }
});

// location / {
//     proxy_pass http://62.72.24.32:8081;
//     proxy_http_version 1.1;
//     proxy_set_header Upgrade $http_upgrade;
//     proxy_set_header Connection 'upgrade';
//     proxy_set_header Host $host;
//     proxy_cache_bypass $http_upgrade;
//     }



app.use((req, res)=>{
    res.render("404")
})

app.listen(8089, ()=>{
    console.log("run on port 8089");
})