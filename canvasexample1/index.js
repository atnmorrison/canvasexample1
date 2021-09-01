const express = require('express');
const https = require('https');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const sfsprStrategy = require('passport-sf-signed-post-request');
const mustacheExpress = require('mustache-express');
const redisStore = require('connect-redis')(session);
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 5000; 

let app = express(); 
app.use(cookieParser());
app.use(express.urlencoded({extended: false}));

if(process.env.REDISTOGO_URL) {

    app.use(session({
        secret: '1AB4BUCH!ED',
        store: new redisStore({
            url: process.env.REDISTOGO_URL
        }),
        cookie: {
            expires: 360000,
            proxy: true,
            secure: true,
            httpOnly: true,
            sameSite: "None"
        },
        resave: true,
        saveUninitialized: true
    }));

} else {
    //use basic session for running locally, doesn't actually work in canvas with http because the cookie has to be secure for sameSite: "none", secure cookie can only be used with https. 
    app.use(session({secret:'1AB4BUCH!ED', resave: true, saveUninitialized: true, cookie: { expires: 360000, secure: true,  proxy: true, sameSite: "None"}}));
}

passport.use('sf-signed-post-request', new sfsprStrategy(process.env.CANVAS_SECRET, function(sr, req){
    req.session.sr = sr; 
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname+'/views');


app.post('/', passport.authenticate('sf-signed-post-request'), function(req, res){
    res.render('home', {name: req.session.sr.context.user.firstName+" "+req.session.sr.context.user.lastName});
});

app.get('/', passport.authenticate('sf-signed-post-request'), function(req, res){
    res.render('home', {name: req.session.sr});
});


if(process.env.REDISTOGO_URL) {
    app.listen(PORT, () => console.log(`Listening on ${ PORT }`));
} else {
    let httpsOptions = {
        key: fs.readFileSync('./security/cert.key'),
        cert: fs.readFileSync('./security/cert.pem') 
    };
    https.createServer(httpsOptions, app).listen(PORT, () => console.log(`Listening on ${ PORT }`)); 
}




