var express = require('express');
const app = express();

//initiation of socket instance
let http = require('http').createServer(app);
let io = require('socket.io')(http);

const req = require('request');
const ejs = require('ejs'); //view 
const passport = require('passport');
const mongoose = require('mongoose');
const session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
require('dotenv').config({path: __dirname + '/.env'})
const { request } = require('http');

//const {ensureAuthenticated, forwardAuthenticated} = require('./ensureAuth');

//require('../spsf_service/config/auth');
var port = process.env.PORT || 3000;   

var spsfServiceUrl = process.env.SERVICE_URL;
const uri = process.env.MONGOOSE;

var store = new MongoDBStore({
    uri: uri,
    collection: 'spsfSessions'
  });

store.on('error', function(error) {
console.log(error);
});

app.use(express.static(__dirname +'/public'));
//use express boady parser to get view data
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

var loggedIn=false;
var loggedUsername ='';

//establish the socket connection
io.on('connection', (socket) => {
    console.log('A user has connected');

    //initiate the map
    socket.emit('initiate_map', 'Map has been initiated')

    //update parking data every 2 mintues
    setInterval(()=>{
      socket.emit('update_map', 'Map hasbeen updated with recent available parking data')
    }, 120000);

    //disconnect the socket
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });  
});


//passport google 
require('./config/googleauth');

try {
    // Connect to the MongoDB cluster
    mongoose.connect(
    uri,{ useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true},
        () => console.log(" Mongoose is connected...")
    ); } catch (e) {
    console.log("could not connect...");
  }


//express session
app.use(session({
    secret: "key to cookie",
    store:store,
    resave: true,
    saveUninitialized: true,    
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//verifying user exist
function isLoggedIn(req, res, next) {
   //req.isAuthenticated() ? next() : res.redirect('/login'); 
    req.user ? next() : res.redirect('/login');
}

 //spsf index page to sign in (landing or the signin page)
app.get('/', isLoggedIn, (request,response) => {
    if(loggedIn){
        response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});

    }else{
        response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
    }    
})

// sign in page after user attempt to sign - process form data
app.post('/', function(request,response){
 
    reqObject = spsfServiceUrl+"/authenticate?username="+request.body.Username+"&password="+request.body.Password;

    req(reqObject,(err,result,body)=> {
        if(err){
            return console.log(err);
        }
        if(JSON.parse(result.body).authorisation==='true'){
            console.log('logged in!');
            loggedIn=true;
            loggedUsername = request.body.Username;
            response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});
        }else{
            let message=JSON.parse(result.body).message;
            response.render('index', {title: 'SPSF - Home',username:loggedUsername,password:'',message:message,loggedIn:loggedIn, signIn:false});
        }              
    });
})


// get registration form when user try to register
app.get('/displayRegister', function(request,response){
    if(loggedIn){
        response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});

    }else{
        response.render('displayRegister', {title: 'SPSF - Registration', username:loggedUsername,email:'',password:'',confirmpassword:'',message:'', loggedIn:loggedIn, signIn:true});
    }
});

// process register form post data to register and send data to service for registration process
app.post('/displayRegister',function(request,response){

    reqObject = spsfServiceUrl+"/register?username="+request.body.Username+"&password="+request.body.Password+"&email="+request.body.Email+"&confirmpassword="+request.body.ConfirmPassword;
    req(reqObject,(err,result,body)=> {
        if(err){
            return console.log(err);
        }

        if(JSON.parse(result.body).registration ==='true'){
            response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
        }else{
            let message= JSON.parse(result.body).message;
            response.render('displayRegister', {title: 'SPSF - Registration', username:loggedUsername,email:'',password:'',confirmpassword:'',message:message,loggedIn:loggedIn, signIn:true});
        }              
    });
})

// get forget password page to recover password
app.get('/displaySendPassword',function(request,response){
    if(loggedIn){
        response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});

    }else{
        response.render('displaySendPassword', {title: 'SPSF - Forgot Password', username:loggedUsername,email:'',message:'',loggedIn:loggedIn, signIn:true});
    }
})

// process password recovery from posted data and ask service to send the recovery email
app.post('/displaySendPassword',function(request,response){
    reqObject = spsfServiceUrl+"/sendpassword?email="+request.body.Email;
    req(reqObject,(err,result,body)=> {
        if(err){
            return console.log(err);
        }
        if(JSON.parse(result.body).registration ==='true'){
            response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
        }else{
            let message= JSON.parse(result.body).message;
            response.render('displaySendPassword', {title: 'SPSF - Forgot Password', username:loggedUsername,email:'',message:message,loggedIn:loggedIn, signIn:true});
        }          
    });
})

// process password recovery from posted data and ask service to send the recovery email
app.post('/displayResetPassword',function(request,response){

var fullUrl = request.originalUrl;

    reqObject = spsfServiceUrl+"/reset-password/?password="+request.body.Password+"&confirmpassword="+request.body.ConfirmPassword+"&message="+fullUrl;

    req(reqObject,(err,result,body)=> {
        if(err){
            return console.log(err);
        }
        if(JSON.parse(result.body).shift ==='true'){
            response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
        }else{
            let message= JSON.parse(result.body).message;
            response.render('displayResetPassword', {title: 'SPSF - Forgot Password', username:loggedUsername,password:'',confirmpassword:'',message:'',loggedIn:loggedIn, signIn:true});
        }              
    });
})

//get login page to sigin in to the app
//login page 
app.get('/login',function(request,response){
    response.render('index', {title: 'SPSF - Home', username:'',password:'',message:'',loggedIn:loggedIn, signIn:false});
    console.log('Auth failed!');
});

//get change password page to change user password
//post data to change password 
app.post('/changepassword', function(request, response){
    reqObject = spsfServiceUrl+"/changepassword?currentemail="+request.body.CurrentEmail+"&oldpassword="+request.body.OldPassword+"&newpassword="+request.body.NewPassword+"&confirmpassword="+request.body.ConfirmPassword;
    req(reqObject,(err,result,body)=> {
        if(err){
            return console.log(err);
        }
        if(JSON.parse(result.body).changed ==='true'){
            response.render('index', {title: 'SPSF - Home', username:'',password:'',message:'',loggedIn:false, signIn:false});
        }
        // if(JSON.parse(result.body).mismatch ==='true'){
        //     response.send("alert('incorrect password or email, try again)");
        // }
        else{
            let message= JSON.parse(result.body).message;
            response.render('displayChangePassword', {title: 'SPSF - Change Password', username:loggedUsername,currentemail:'',oldpassword:'',newpassword:'',confirmpassword:'',message:message,loggedIn:loggedIn, signIn:false});
            console.log('failed');
        }              
    }); 
})

//process user dashboard funtionality and route the user to the dessired page
app.get('/displayDashboard', function(request,response){
    if(loggedIn){
        response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});
    }
})


//process user dashboard funtionality and route the user to the dessired page
app.post('/displayDashboard', function(request,response){
    if(loggedIn){
        if(request.body.FindParking==='find'){
            response.render('displayParkingMap', {title: 'SPSF - Parking Availability', username:loggedUsername,loggedIn:loggedIn, signIn:false});
        }else if(request.body.ChangePassword==='change'){
            response.render('displayChangePassword', {title: 'SPSF - Change Password', username:loggedUsername,currentemail:'',oldpassword:'',newpassword:'',confirmpassword:'',message:'',loggedIn:loggedIn, signIn:false});
        }else if(request.body.ParkingHistory==='history'){
            reqObject=spsfServiceUrl+"/getUserHistoryData?username="+loggedUsername;
            req(reqObject,(err,result,body)=>{
                if(err)
                {
                    return console.log(err);
                }
                response.render('displayParkingHistory',{title:"SPSF - Parking History",username:loggedUsername,password:'',message:'',historydata:result.body,loggedIn:loggedIn,signIn:false});
            })

            //response.render('displayParkingHistory', {title: 'SPSF - Parking History', username:loggedUsername,loggedIn:loggedIn, signIn:false});
        }       
    }else{
        response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
    }   
})

//refresh parking availability map and bac to dash board handling
app.post('/parkingMapRoutesButtonPanel',function(request,response){
    if(loggedIn){
         if (request.body.Dashboard==='dashboard'){
            response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});
            }      
    }else{
        response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
    }   
})

//once user selected the parking this will route the user to navigation page for navigation
app.post('/parkingMapRoutesMidPanel',function(request,response){

    if(loggedIn){
        if (request.body.Navigate==='navigate'){
                response.render('displayNavigation', {title: 'SPSF - Display Navigation', username:loggedUsername,loggedIn:loggedIn, timer:'', signIn:false, mobileno:'', bay:request.body.bay,slat:request.body.sel_lat,slon:request.body.sel_lon});
            }       
    }else{
        response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
    }   
})


//get all available parking data from the service
app.get('/getAllAvailableParkingData', function (request,response){

    reqObject = spsfServiceUrl+"/requestAllParkingData";
    req(reqObject,(err,result,body)=> {
        if(err){
            return console.log(err);
        } 
        response.send(result.body);
    })          
})

// get display parking history data
app.get('/displayParkingHistory',function(request,response){
    if(loggedIn)
    {
        reqObject=spsfServiceUrl+"/getUserHistoryData?username="+request.body.Username;
        req(reqObject,(err,result,body)=>{
            if(err)
            {
                return console.log(err);
            }
        
        })
    }
    else
    {
        response.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:false});
    }
});

//display dashboard 
app.post('/Login', function(request,response){
    if(request.body.Back ==='back'){
        response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});
    }
});

//handling notification feature of the navigation page
app.post('/notify',function(request,response){

    if(loggedIn){
        if (request.body.Notify==='notify'){
            reqObject = spsfServiceUrl+"/notify?mobile="+request.body.Mobile+"&time="+request.body.Time+"&bay="+request.body.Bay+"&lat="+request.body.Slat+"&lon="+request.body.Slon+"&username="+request.body.Username+"&save="+request.body.SaveHistory;
            req(reqObject,(err,result,body)=> {
                if(err){
                    return console.log(err);
                }   
                response.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});                                                
            })
        } 
    }
})

//call google authentication 
app.get('/google', 
    passport.authenticate('google', { scope: ['email', 'profile'] }));

//verify google callback & forward result 
app.get('/google/callback', 
    passport.authenticate('google',{
        successRedirect: '/success',
        failureRedirect: '/failure'
}));

//if result failed from google
app.get('/failure', (req, res) => {
    loggedIn=false;
    res.render('index', {title: 'SPSF - Home', username:loggedUsername,password:'',message:'',loggedIn:loggedIn, signIn:true});
});

//if result success from google 
app.get('/success', (req, res) => {
    loggedIn=true;
    loggedUsername = req.user.displayName;
    res.render('displayDashboard', {title: 'SPSF - Dashboard',username:loggedUsername,loggedIn:loggedIn, signIn:false});
})

// user sign off from the system
app.get('/logout',function(request,response){
    request.logout(); //destroy session
    request.session.destroy();
    loggedIn=response.loggedIn;
    loggedUsername = '';
    response.render('index', {title: 'SPSF - Home', username:'',password:'',message:'',loggedIn:loggedIn, signIn:false});
    console.log('signed off!');
});

http.listen(port,()=>{
    console.log('Server is listening on :'+port);
});
