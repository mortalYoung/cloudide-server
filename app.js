var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
const moleculeRouter = require("./routes/mo");
const websocketRouter = require("./routes/websocket");

// var app = express();

const { app } = require("express-ws")(express());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("molecule"));
app.use(
  session({
    secret: "molecule",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(express.static(path.join(__dirname, "public")));

// app.ws("/websocket", function (ws, req) {
//   ws.on("message", function (msg) {
//     console.log(msg);
//   });
// });

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/mo", moleculeRouter);
app.use("/websocket", websocketRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// module.exports = app;

app.listen(3000);
