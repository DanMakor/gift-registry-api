const express = require('express');
const router = express.Router();
const { expressjwt } = require('express-jwt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const registryItemService = require('./registry-item.service');

const APP_KEY = process.env.APP_KEY || "Default";
const EMAIL_PASS = process.env.EMAIL_PASS ||  "SaGsWwmzyr6kjvBGkX";
const EMAIL_USER = process.env.EMAIL_USER || "erica82@ethereal.email";
const EMAIL_TO = process.env.EMAIL_TO || "erica82@ethereal.email";
const TOKEN_SECRET = process.env.TOKEN_SECRET || "Token";
const authHandler = expressjwt({
    secret: TOKEN_SECRET,
    algorithms: ['HS256'],
    userProperty: 'payload'
});

let mailConfig = {
    host: process.env.NODE_ENV === "production" ? "smtp.outlook.com" : "smtp.ethereal.email", // hostname
    secureConnection: false, // TLS requires secureConnection to be false
    port: 587, // port for secure SMTP
    tls: {
    ciphers:'SSLv3'
    },
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
};
const transporter = nodemailer.createTransport(mailConfig);

function getMailOptions(html) {
    return mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_TO,
        subject: 'RSVP',
        html
    };
}

function generateToken(_id, name) {
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
  
    return jwt.sign({
      _id,
      name,
      exp: parseInt(expiry.getTime() / 1000),
    }, TOKEN_SECRET); // DO NOT KEEP YOUR SECRET IN THE CODE!
};

router.route('/registerorlogin').post((req, res) => {
    if (req.body.password !== APP_KEY) {
        res.status(500).json("Incorrect passkey");
        return;
    }

    if (!req.body.name) {
        res.status(500).json("Name cannot be empty");
        return;
    }

    var lowerCaseName = req.body.name.toLowerCase();

    global.dbo.collection('users').findOne({ name: lowerCaseName }).then(user => {
        if (!user) {
            global.dbo.collection('users').insertOne({ name: lowerCaseName }).then(({ insertedId }) => {
                var token = generateToken(insertedId, lowerCaseName);
                res.status(200).json({ token });
            }).catch(err => {;
                res.status(500).send(err);
            });
        } else {
            var token = generateToken(user._id, user.name)
            res.status(200).json({ token });
        }
    }).catch(err => {
        res.status(500).send(err);
    });
})

router.route('/rsvps').get((req, res) => {
    global.dbo.collection('rsvps').find().toArray().then(document => {
        res.status(200).send(document);
    }).catch(err => {
        res.status(500).send(err);
    });
})

router.route('/rsvp').post((req, res) => {
    const mailText = `
        <h1>${req.body.names}</h1>
        <p>${req.body.canAttend}</p>
        <p>
            ${req.body.dietaryRequirements ? 'Dietary requirements are: ' : 'No dietary requirements'} 
            ${req.body.dietaryDetails}
        </p>
        <p>${req.body.comments}</p>
    `
    transporter.sendMail(getMailOptions(mailText));

    global.dbo.collection('rsvps').insertOne(req.body).then(document => {
        res.status(200).send(document)
    }).catch(err => {
        res.status(500).send(err);
    })
})

router.route('/registry-items').get((req, res) => {
    registryItemService.list(req, res);
})

router.route('/registry-items/register').post(authHandler, (req, res) => {
    registryItemService.register(req, res);
})

router.route('/registry-items/deregister').post(authHandler, (req, res) => {
    registryItemService.deregister(req, res);
})

module.exports=router;
