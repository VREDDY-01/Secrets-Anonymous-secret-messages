require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.set("strictQuery",false);
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email:String,
    password:String
});

const User = new mongoose.model("users",userSchema);

app.get("/",(req,res)=>{
    res.render("home");
});

app.get("/register",(req,res)=>{
    res.render("register");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.post("/register",(req,res)=>{
    const newUser = new User({
        email:req.body.username,
        password:md5(req.body.password)
    });

    newUser.save((err)=>{
        if(!err){
            res.render("secrets");
        }else{
            console.log(err);
        }
    })
});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = md5(req.body.password);
  
    User.findOne({email: username}, function(err, foundUser){
      if (err) {
        res.render("nouser");
      } else {
        if (foundUser) {
          if (foundUser.password === password) {
            res.render("secrets");
          }
        }else{
            res.render("nouser");
        }
      }
    });
  });

app.listen(3000,()=>{
    console.log("Server has started at port 3000");
});