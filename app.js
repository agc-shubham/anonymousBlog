//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const homeStartingContent =
  "Welcome to your blog. Express your uncensored thoughts while remaining anonymous, We respect your privacy and never store your emails and passwords. Your stored credentials are hashed and never stored in actual form in database. Only your posts are stored which are completely anonymous.";

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  process.env.DB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }
);

const postsSchema = new mongoose.Schema({
  title: String,
  content: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const Users = mongoose.model("Users", userSchema);

const Post = mongoose.model("Post", postsSchema);

passport.use(Users.createStrategy());

passport.serializeUser(Users.serializeUser());
passport.deserializeUser(Users.deserializeUser());

app.get("/", (req, res) => {
  Post.find({}, (err, foundPosts) => {
    if (!err) {
      res.render("home", {
        homecontent: homeStartingContent,
        blogContent: foundPosts,
      });
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});
app.get("/logout", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect("/"); //Inside a callback… bulletproof!
  });
});

app.get("/post/:reqTitle", (req, res) => {
  let reqTitle = _.lowerCase(req.params.reqTitle);

  Post.findOne({ title: reqTitle }, (err, foundPost) => {
    if (!err) {
      if (!foundPost) {
      }
      res.render("post", {
        title: foundPost.title,
        content: foundPost.content,
      });
    } else {
      console.log(err);
    }
  });
});

app.post("/compose", (req, res) => {
  let gotTitle = _.lowerCase(req.body.title);

  let gotContent = req.body.content;
  if (gotTitle.length && gotContent.length) {
    const post = new Post({
      title: gotTitle,
      content: gotContent,
    });

    post.save();
  }
  res.redirect("/");
});

app.post("/register", (req, res) => {
  Users.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/compose");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new Users({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {

        res.redirect("/compose");
      });
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on port 3000");
});
