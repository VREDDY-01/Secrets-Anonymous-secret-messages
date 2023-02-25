require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//Calling Express.
const app = express();

//Using and setting required fields.
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//Starting and connecting to database Server.
mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

//Schema Design for database
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret:Array,
  photo:String,
  name:String
});

//Plugins
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Creation Of user model
const User = new mongoose.model("users", userSchema);

//Creating a local strategy for user.
passport.use(User.createStrategy());

//serializing and deserializing the user
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.name,
      picture: user.photo,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//Creating a strategy for authentication for using google.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.G_CLIENT_ID,
      clientSecret: process.env.G_CLIENT_SECRET,
      callbackURL: process.env.G_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ 
        googleId: profile.id, 
        photo: profile.photos[0].value,
        name:profile.displayName 
      }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//GET REQUESTS--------------------------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.user);
    User.find({"secret": {$ne: null}}, (err, foundUsers)=>{
      if(err){
        console.log(err);
      }else{
        if(foundUsers){
          res.render("secrets", {MySecrets: foundUsers, profileImage: req.user.picture, profileName: req.user.username});
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/submit",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
})


//POST Requests----------------------------------------------------------------------------------------
app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, results) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit",(req,res)=>{
  const secret = req.body.secret;

  User.findById(req.user.id, (err,foundUser)=>{
    if(err){
      console.log(err);
      res.redirect("/secrets");
    }else{
      if(foundUser){
        foundUser.secret.push(secret);
        foundUser.save(()=>{
          res.redirect("/secrets");
        });
      }
    }
  })
})


//Starting the server
app.listen(3000, () => {
  console.log("Server has started at port 3000");
});
