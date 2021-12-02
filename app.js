import createError from "http-errors";
import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import debugPrinter from "debug";
import expressWs from "express-ws";

import usersRouter from "./routes/users.js";
import moleculeRouter from "./routes/mo.js";
import websocketRouter from "./routes/websocket.js";

const debug = debugPrinter("molecule-server:server");
const { app } = expressWs(express());

// add logger
logger.token("params", function getId(req) {
  return JSON.stringify(req.body);
});
app.use(
  logger('[:date[clf]] ":method :url :params HTTP/:http-version" :status')
);

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
  res.locals.error = err;

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

app.listen(3000, () => {
  debug("Listening on 3000");
});
